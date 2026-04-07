import {
  calculateNutritionTargets,
  calculateTemplateNutrition,
  generateWeeklyPlan,
  generateWeeklyPlanFromTemplateSelection,
  getMealTemplateCandidates,
  replanWeeklyPlan,
  slotOrderFor,
  validateWeeklyPlan,
  type DayTemplateSelection,
  type MealSlotType,
  type PlanSource,
  type ReplanPlanInput,
  type UserProfile,
  type ValidatePlanInput,
  type WeeklyPlan,
  weeklyPlanSchema,
} from '../../../packages/shared/src';
import { z } from 'zod';

type LlmProvider = 'openai' | 'openrouter';

type LlmRuntime = {
  enabled: boolean;
  provider: LlmProvider;
  baseUrl: string;
  model: string;
  apiKey?: string;
  appName?: string;
  referer?: string;
};

type LlmMeta = {
  provider: LlmProvider;
  requestedModel: string;
  responseModel?: string;
};

const weekSelectionSchema = z.object({
  days: z
    .array(
      z.object({
        breakfast: z.string().trim().min(1),
        lunch: z.string().trim().min(1),
        dinner: z.string().trim().min(1),
        snack: z.string().trim().min(1).optional(),
      }),
    )
    .length(7),
});

const getProvider = (apiKey?: string): LlmProvider =>
  apiKey?.startsWith('sk-or-') ? 'openrouter' : 'openai';

const getDefaultModel = (provider: LlmProvider): string =>
  provider === 'openrouter' ? 'openrouter/auto' : 'gpt-4.1-mini';

const getDefaultBaseUrl = (provider: LlmProvider): string =>
  provider === 'openrouter' ? 'https://openrouter.ai/api/v1' : 'https://api.openai.com/v1';

const getLlmRuntime = (): LlmRuntime => {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const provider = getProvider(apiKey);
  const model = process.env.OPENAI_MODEL?.trim() || getDefaultModel(provider);
  const baseUrl = process.env.OPENAI_BASE_URL?.trim() || getDefaultBaseUrl(provider);

  return {
    enabled: process.env.NUTRITION_ENABLE_LLM === '1' && Boolean(apiKey),
    provider,
    baseUrl,
    model,
    apiKey,
    appName: process.env.OPENAI_APP_NAME?.trim() || 'Nutrition Planner',
    referer:
      process.env.OPENAI_REFERER?.trim() || 'https://nutrition-planner-mobile.vercel.app',
  };
};

const llmEnabled = (): boolean => getLlmRuntime().enabled;

export const getLlmStatus = () => {
  const runtime = getLlmRuntime();

  return {
    enabled: runtime.enabled,
    provider: runtime.provider,
    model: runtime.model,
    baseUrl: runtime.baseUrl,
  };
};

const normalizeJsonPayload = (value: string): string => {
  const trimmed = value.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const unwrapped = fenceMatch?.[1]?.trim() ?? trimmed;
  const firstBrace = unwrapped.indexOf('{');
  const lastBrace = unwrapped.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    return unwrapped;
  }

  return unwrapped.slice(firstBrace, lastBrace + 1);
};

const extractMessageText = (content: unknown): string | null => {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    const text = content
      .map((part) =>
        typeof part === 'object' &&
        part !== null &&
        'text' in part &&
        typeof part.text === 'string'
          ? part.text
          : '',
      )
      .join('\n')
      .trim();

    return text || null;
  }

  return null;
};

const buildCatalogForPrompt = (profile: UserProfile, slotType: MealSlotType) =>
  getMealTemplateCandidates(slotType, profile).map((template) => {
    const nutrition = calculateTemplateNutrition(template);

    return {
      id: template.id,
      title: template.title,
      cuisine: template.cuisine,
      prepMinutes: template.prepMinutes,
      tags: template.tags,
      ingredients: template.ingredients.map((ingredient) => ingredient.ingredientId),
      nutrition,
    };
  });

const buildMessages = (profile: UserProfile) => {
  const slots = slotOrderFor(profile.mealsPerDay);
  const targets = calculateNutritionTargets(profile);
  const catalog = {
    breakfast: buildCatalogForPrompt(profile, 'breakfast'),
    lunch: buildCatalogForPrompt(profile, 'lunch'),
    dinner: buildCatalogForPrompt(profile, 'dinner'),
    ...(profile.mealsPerDay === 4
      ? { snack: buildCatalogForPrompt(profile, 'snack') }
      : {}),
  };
  const payload = {
    slots,
    targets,
    profile: {
      age: profile.age,
      sex: profile.sex,
      heightCm: profile.heightCm,
      weightKg: profile.weightKg,
      goal: profile.goal,
      activityLevel: profile.activityLevel,
      mealsPerDay: profile.mealsPerDay,
      dietaryConstraints: profile.dietaryConstraints,
    },
    catalog,
  };

  return [
    {
      role: 'system',
      content:
        'You are selecting a 7-day meal plan from a fixed template catalog. Return JSON only. Use only template ids that appear in the catalog. Respect the required slots for every day. Prefer variety across the week, avoid consecutive repeats when alternatives exist, and prefer the user\'s cuisines and cooking-time preferences when possible. Do not add explanations or markdown fences.',
    },
    {
      role: 'user',
      content: [
        'Build a weekly selection with this exact JSON shape:',
        '{"days":[{"breakfast":"template-id","lunch":"template-id","dinner":"template-id","snack":"template-id"}]}',
        'If the profile has 3 meals per day, omit snack from each day object.',
        'Choose exactly 7 days.',
        JSON.stringify(payload),
      ].join('\n\n'),
    },
  ];
};

const tryComposePlanWithLlm = async (
  profile: UserProfile,
): Promise<{ plan: WeeklyPlan; meta: LlmMeta } | null> => {
  const runtime = getLlmRuntime();

  if (!runtime.enabled || !runtime.apiKey) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${runtime.apiKey}`,
    };

    if (runtime.provider === 'openrouter') {
      headers['HTTP-Referer'] = runtime.referer ?? 'https://nutrition-planner-mobile.vercel.app';
      headers['X-Title'] = runtime.appName ?? 'Nutrition Planner';
    }

    const response = await fetch(`${runtime.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: runtime.model,
        temperature: 0.2,
        max_tokens: 1_200,
        messages: buildMessages(profile),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      model?: string;
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    const content = extractMessageText(payload.choices?.[0]?.message?.content);

    if (!content) {
      return null;
    }

    const parsedJson = JSON.parse(normalizeJsonPayload(content));
    const parsedSelection = weekSelectionSchema.safeParse(parsedJson);

    if (!parsedSelection.success) {
      return null;
    }

    const selection = parsedSelection.data as { days: DayTemplateSelection[] };
    const plan = generateWeeklyPlanFromTemplateSelection(profile, selection, 'llm');

    if (!weeklyPlanSchema.safeParse(plan).success || !plan.validation.isValid) {
      return null;
    }

    return {
      plan,
      meta: {
        provider: runtime.provider,
        requestedModel: runtime.model,
        responseModel: payload.model,
      },
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

export const generatePlanWithStrategy = async (
  profile: UserProfile,
) : Promise<{
  plan: WeeklyPlan;
  source: PlanSource;
  fallbackUsed: boolean;
  llm?: LlmMeta;
}> => {
  const llmPlan = await tryComposePlanWithLlm(profile);

  if (llmPlan) {
    const parsed = weeklyPlanSchema.safeParse(llmPlan.plan);
    if (parsed.success) {
      return {
        plan: parsed.data,
        source: 'llm',
        fallbackUsed: false,
        llm: llmPlan.meta,
      };
    }
  }

  return {
    plan: generateWeeklyPlan(profile, llmEnabled() ? 'llm-fallback' : 'template'),
    source: llmEnabled() ? 'llm-fallback' : 'template',
    fallbackUsed: llmEnabled(),
  };
};

export const validatePlanInput = (input: ValidatePlanInput) => {
  const validation = validateWeeklyPlan(input.profile, input.plan);

  return {
    validation,
    isValid: validation.isValid,
  };
};

export const replanWithStrategy = async (
  input: ReplanPlanInput,
): Promise<{ plan: WeeklyPlan; source: PlanSource }> => ({
  plan: replanWeeklyPlan(
    input.profile,
    input.currentPlan,
    input.request,
    llmEnabled() ? 'llm-fallback' : 'template',
  ),
  source: llmEnabled() ? 'llm-fallback' : 'template',
});
