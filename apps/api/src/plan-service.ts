import {
  generateWeeklyPlan,
  replanWeeklyPlan,
  validateWeeklyPlan,
  type PlanSource,
  type ReplanPlanInput,
  type UserProfile,
  type ValidatePlanInput,
  type WeeklyPlan,
  weeklyPlanSchema,
} from '../../../packages/shared/src';

const llmEnabled = (): boolean =>
  process.env.NUTRITION_ENABLE_LLM === '1' &&
  Boolean(process.env.OPENAI_API_KEY) &&
  Boolean(process.env.OPENAI_MODEL);

const tryComposePlanWithLlm = async (_profile: UserProfile): Promise<WeeklyPlan | null> => {
  if (!llmEnabled()) {
    return null;
  }

  // v1 ships with a deterministic fallback as the source of truth.
  // This hook keeps the API surface ready for an optional remote planner later.
  return null;
};

export const generatePlanWithStrategy = async (
  profile: UserProfile,
): Promise<{ plan: WeeklyPlan; source: PlanSource; fallbackUsed: boolean }> => {
  const llmPlan = await tryComposePlanWithLlm(profile);

  if (llmPlan) {
    const parsed = weeklyPlanSchema.safeParse(llmPlan);
    if (parsed.success) {
      return { plan: parsed.data, source: 'llm', fallbackUsed: false };
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
