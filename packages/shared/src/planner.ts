import { appPlanVersion } from './domain';
import type {
  DayPlan,
  MealRecipe,
  MealSlot,
  MealSlotType,
  MealTemplate,
  NutritionSummary,
  PlanSource,
  ReplanRequest,
  UserProfile,
  WeeklyPlan,
} from './domain';
import { getIngredient, calculateNutritionTargets, calculateTemplateNutrition, clamp, roundGrams, slotRatios, sumNutrition, zeroNutrition } from './nutrition';
import { buildShoppingList } from './shopping';
import { mealTemplates, slotTemplateMap } from './templates';
import { recipeViolations, validateWeeklyPlan } from './validation';

const weekdayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'long' });

export interface DayTemplateSelection {
  breakfast: string;
  lunch: string;
  dinner: string;
  snack?: string;
}

export interface WeeklyTemplateSelection {
  days: DayTemplateSelection[];
}

const createId = (prefix: string): string =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;

const startOfToday = (): Date => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
};

const getDayLabel = (startDate: Date, dayIndex: number): string => {
  const value = new Date(startDate);
  value.setDate(startDate.getDate() + dayIndex);
  return weekdayFormatter.format(value);
};

export const slotOrderFor = (mealsPerDay: 3 | 4): MealSlotType[] =>
  mealsPerDay === 3
    ? ['breakfast', 'lunch', 'dinner']
    : ['breakfast', 'lunch', 'snack', 'dinner'];

const normalizeToken = (value: string): string =>
  value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const preferredCuisineTokens = (profile: UserProfile, request?: ReplanRequest): string[] =>
  [...profile.dietaryConstraints.preferredCuisines, ...(request?.preferredCuisines ?? [])]
    .map(normalizeToken)
    .filter(Boolean);

const cookingPreferenceScore = (
  prepMinutes: number,
  cookingPreference: UserProfile['dietaryConstraints']['cookingTimePreference'],
): number => {
  if (cookingPreference === 'quick') {
    return prepMinutes <= 15 ? 2 : -2;
  }

  if (cookingPreference === 'balanced') {
    return prepMinutes <= 25 ? 1 : -1;
  }

  return 0;
};

const createRecipePreview = (template: MealTemplate): MealRecipe =>
  materializeTemplate(template, calculateTemplateNutrition(template).calories, `${template.id}-preview`);

export const getMealTemplateById = (templateId: string): MealTemplate | undefined =>
  mealTemplates.find((template) => template.id === templateId);

const findCandidates = (
  slotType: MealSlotType,
  profile: UserProfile,
  recentlyUsedTemplateIds: string[],
  request?: ReplanRequest,
): MealTemplate[] => {
  const cuisineTokens = preferredCuisineTokens(profile, request);
  const blockedFoods = request?.blockedFoods ?? [];

  return (slotTemplateMap[slotType] ?? [])
    .filter((template) => recipeViolations(createRecipePreview(template), profile.dietaryConstraints, blockedFoods).length === 0)
    .map((template) => {
      let score = 0;
      const normalizedCuisine = normalizeToken(template.cuisine);

      if (cuisineTokens.some((token) => normalizedCuisine.includes(token))) {
        score += 6;
      }

      if (template.tags.some((tag) => cuisineTokens.includes(normalizeToken(tag)))) {
        score += 2;
      }

      const reuseCount = recentlyUsedTemplateIds.filter((value) => value === template.id).length;
      score -= reuseCount * 2.5;
      score += cookingPreferenceScore(
        template.prepMinutes,
        profile.dietaryConstraints.cookingTimePreference,
      );

      return { template, score };
    })
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.template);
};

export const getMealTemplateCandidates = (
  slotType: MealSlotType,
  profile: UserProfile,
  request?: ReplanRequest,
): MealTemplate[] => findCandidates(slotType, profile, [], request);

const materializeTemplate = (
  template: MealTemplate,
  targetCalories: number,
  recipeId: string,
): MealRecipe => {
  const baseNutrition = calculateTemplateNutrition(template);
  const scale = clamp(targetCalories / Math.max(baseNutrition.calories, 1), 0.82, 1.75);
  const ingredients = template.ingredients.map((templateIngredient) => {
    const ingredient = getIngredient(templateIngredient.ingredientId);
    const grams = roundGrams(templateIngredient.grams * scale);
    const nutrition = {
      calories: Number(((ingredient.nutritionPer100g.calories * grams) / 100).toFixed(1)),
      proteinGrams: Number(((ingredient.nutritionPer100g.proteinGrams * grams) / 100).toFixed(1)),
      fatGrams: Number(((ingredient.nutritionPer100g.fatGrams * grams) / 100).toFixed(1)),
      carbGrams: Number(((ingredient.nutritionPer100g.carbGrams * grams) / 100).toFixed(1)),
    };

    return {
      ingredientId: ingredient.id,
      name: ingredient.name,
      category: ingredient.category,
      grams,
      unit: 'g' as const,
      tags: ingredient.tags,
      nutrition,
    };
  });

  return {
    id: recipeId,
    templateId: template.id,
    title: template.title,
    slotType: template.slotType,
    cuisine: template.cuisine,
    prepMinutes: template.prepMinutes,
    tags: template.tags,
    ingredients,
    steps: template.steps,
    nutrition: sumNutrition(ingredients.map((ingredient) => ingredient.nutrition)),
  };
};

const createMealSlot = (
  template: MealTemplate,
  slotType: MealSlotType,
  dayIndex: number,
  targetCalories: number,
): MealSlot => {
  const mealId = createId(`meal-${dayIndex}-${slotType}`);

  return {
    id: mealId,
    slotType,
    targetCalories: Number(targetCalories.toFixed(0)),
    recipe: materializeTemplate(template, targetCalories, mealId),
  };
};

const recomputeDayTotals = (meals: MealSlot[]): NutritionSummary =>
  sumNutrition(meals.map((meal) => meal.recipe.nutrition));

const enrichDayWithProteinIfNeeded = (profile: UserProfile, day: DayPlan): DayPlan => {
  const targets = calculateNutritionTargets(profile);
  const meals = day.meals.map((meal) => ({
    ...meal,
    recipe: {
      ...meal.recipe,
      ingredients: meal.recipe.ingredients.map((ingredient) => ({ ...ingredient })),
      nutrition: { ...meal.recipe.nutrition },
    },
  }));

  let totals = recomputeDayTotals(meals);

  if (totals.proteinGrams >= targets.proteinFloorGrams - 2) {
    return {
      ...day,
      meals,
      totals,
    };
  }

  const priorityOrder = [
    'chicken-breast',
    'tuna',
    'turkey-mince',
    'greek-yogurt',
    'cottage-cheese',
    'tofu',
    'salmon',
    'eggs',
  ];
  let gap = targets.proteinFloorGrams - totals.proteinGrams;

  for (const ingredientId of priorityOrder) {
    if (gap <= 0) {
      break;
    }

    const meal = meals.find((candidate) =>
      candidate.recipe.ingredients.some((ingredient) => ingredient.ingredientId === ingredientId),
    );

    if (!meal) {
      continue;
    }

    const ingredient = meal.recipe.ingredients.find(
      (candidate) => candidate.ingredientId === ingredientId,
    );

    if (!ingredient) {
      continue;
    }

    const reference = getIngredient(ingredientId);
    const addedGrams =
      ingredientId === 'greek-yogurt' || ingredientId === 'cottage-cheese' ? 80 : 50;
    ingredient.grams += addedGrams;
    ingredient.nutrition = {
      calories: Number(((reference.nutritionPer100g.calories * ingredient.grams) / 100).toFixed(1)),
      proteinGrams: Number(((reference.nutritionPer100g.proteinGrams * ingredient.grams) / 100).toFixed(1)),
      fatGrams: Number(((reference.nutritionPer100g.fatGrams * ingredient.grams) / 100).toFixed(1)),
      carbGrams: Number(((reference.nutritionPer100g.carbGrams * ingredient.grams) / 100).toFixed(1)),
    };
    meal.recipe.nutrition = sumNutrition(meal.recipe.ingredients.map((value) => value.nutrition));
    totals = recomputeDayTotals(meals);
    gap = targets.proteinFloorGrams - totals.proteinGrams;
  }

  return {
    ...day,
    meals,
    totals,
  };
};

const generateDayPlan = (
  profile: UserProfile,
  dayIndex: number,
  recentlyUsedTemplateIds: string[],
  request?: ReplanRequest,
): DayPlan => {
  const targets = calculateNutritionTargets(profile);
  const slots = slotOrderFor(profile.mealsPerDay);
  const slotDistribution = profile.mealsPerDay === 3 ? slotRatios[3] : slotRatios[4];
  const meals: MealSlot[] = [];
  let usedCalories = 0;

  for (let slotIndex = 0; slotIndex < slots.length; slotIndex += 1) {
    const slotType = slots[slotIndex];
    const isLastSlot = slotIndex === slots.length - 1;
    const nominalTarget =
      targets.calories * slotDistribution[slotType as keyof typeof slotDistribution];
    const remainingCalories = Math.max(targets.calories - usedCalories, nominalTarget);
    const targetCalories = isLastSlot
      ? clamp(remainingCalories, nominalTarget * 0.8, nominalTarget * 1.25)
      : nominalTarget;
    const candidates = findCandidates(slotType, profile, recentlyUsedTemplateIds, request);
    const template =
      candidates.find((candidate) => !recentlyUsedTemplateIds.includes(candidate.id)) ??
      candidates[0] ??
      mealTemplates.find((candidate) => candidate.slotType === slotType);

    if (!template) {
      throw new Error(`Unable to build ${slotType} for day ${dayIndex}`);
    }

    meals.push(createMealSlot(template, slotType, dayIndex, targetCalories));
    usedCalories += meals[meals.length - 1].recipe.nutrition.calories;
    recentlyUsedTemplateIds.push(template.id);
  }

  return enrichDayWithProteinIfNeeded(profile, {
    id: createId(`day-${dayIndex}`),
    dayIndex,
    label: getDayLabel(startOfToday(), dayIndex),
    meals,
    totals: recomputeDayTotals(meals),
  });
};

export const generateWeeklyPlan = (
  profile: UserProfile,
  source: PlanSource = 'template',
): WeeklyPlan => {
  const targets = calculateNutritionTargets(profile);
  const recentlyUsedTemplateIds: string[] = [];
  const createdAt = new Date().toISOString();
  const days = Array.from({ length: 7 }, (_, dayIndex) =>
    generateDayPlan(profile, dayIndex, recentlyUsedTemplateIds),
  );
  const draftPlan: WeeklyPlan = {
    id: createId('week'),
    version: appPlanVersion,
    profileId: profile.id,
    createdAt,
    updatedAt: createdAt,
    targets,
    days,
    shoppingList: {
      generatedAt: createdAt,
      items: [],
    },
    validation: {
      isValid: false,
      errors: [],
      warnings: [],
      dayResults: [],
    },
    source,
    replanHistory: [],
  };

  draftPlan.validation = validateWeeklyPlan(profile, draftPlan);
  draftPlan.shoppingList = buildShoppingList(draftPlan);

  return draftPlan;
};

export const generateWeeklyPlanFromTemplateSelection = (
  profile: UserProfile,
  selection: WeeklyTemplateSelection,
  source: PlanSource = 'llm',
): WeeklyPlan => {
  if (selection.days.length !== 7) {
    throw new Error('Weekly template selection must contain exactly 7 days');
  }

  const targets = calculateNutritionTargets(profile);
  const slots = slotOrderFor(profile.mealsPerDay);
  const slotDistribution = profile.mealsPerDay === 3 ? slotRatios[3] : slotRatios[4];
  const createdAt = new Date().toISOString();
  const days = selection.days.map((daySelection, dayIndex) => {
    const meals: MealSlot[] = [];
    let usedCalories = 0;

    for (let slotIndex = 0; slotIndex < slots.length; slotIndex += 1) {
      const slotType = slots[slotIndex];
      const isLastSlot = slotIndex === slots.length - 1;
      const nominalTarget =
        targets.calories * slotDistribution[slotType as keyof typeof slotDistribution];
      const remainingCalories = Math.max(targets.calories - usedCalories, nominalTarget);
      const targetCalories = isLastSlot
        ? clamp(remainingCalories, nominalTarget * 0.8, nominalTarget * 1.25)
        : nominalTarget;
      const selectedTemplateId = daySelection[slotType];

      if (!selectedTemplateId) {
        throw new Error(`Missing ${slotType} template for day ${dayIndex}`);
      }

      const template = getMealTemplateById(selectedTemplateId);

      if (!template) {
        throw new Error(`Unknown template selected for ${slotType}: ${selectedTemplateId}`);
      }

      if (template.slotType !== slotType) {
        throw new Error(
          `Template ${selectedTemplateId} cannot be used for ${slotType} (expected ${template.slotType})`,
        );
      }

      const violations = recipeViolations(createRecipePreview(template), profile.dietaryConstraints);

      if (violations.length > 0) {
        throw new Error(violations[0]);
      }

      meals.push(createMealSlot(template, slotType, dayIndex, targetCalories));
      usedCalories += meals[meals.length - 1].recipe.nutrition.calories;
    }

    return enrichDayWithProteinIfNeeded(profile, {
      id: createId(`day-${dayIndex}`),
      dayIndex,
      label: getDayLabel(startOfToday(), dayIndex),
      meals,
      totals: recomputeDayTotals(meals),
    });
  });

  const draftPlan: WeeklyPlan = {
    id: createId('week'),
    version: appPlanVersion,
    profileId: profile.id,
    createdAt,
    updatedAt: createdAt,
    targets,
    days,
    shoppingList: {
      generatedAt: createdAt,
      items: [],
    },
    validation: {
      isValid: false,
      errors: [],
      warnings: [],
      dayResults: [],
    },
    source,
    replanHistory: [],
  };

  draftPlan.validation = validateWeeklyPlan(profile, draftPlan);
  draftPlan.shoppingList = buildShoppingList(draftPlan);

  return draftPlan;
};

const replaceDay = (days: DayPlan[], nextDay: DayPlan): DayPlan[] =>
  days.map((day) => (day.dayIndex === nextDay.dayIndex ? nextDay : day));

const clonePlan = (plan: WeeklyPlan): WeeklyPlan => ({
  ...plan,
  days: plan.days.map((day) => ({
    ...day,
    meals: day.meals.map((meal) => ({
      ...meal,
      recipe: {
        ...meal.recipe,
        ingredients: meal.recipe.ingredients.map((ingredient) => ({ ...ingredient })),
        nutrition: { ...meal.recipe.nutrition },
      },
    })),
    totals: { ...day.totals },
  })),
  shoppingList: {
    ...plan.shoppingList,
    items: plan.shoppingList.items.map((item) => ({ ...item })),
  },
  validation: {
    ...plan.validation,
    errors: [...plan.validation.errors],
    warnings: [...plan.validation.warnings],
    dayResults: plan.validation.dayResults.map((day) => ({
      ...day,
      errors: [...day.errors],
      warnings: [...day.warnings],
    })),
  },
  replanHistory: plan.replanHistory.map((entry) => ({ ...entry })),
});

export const replanWeeklyPlan = (
  profile: UserProfile,
  currentPlan: WeeklyPlan,
  request: ReplanRequest,
  source: PlanSource = 'template',
): WeeklyPlan => {
  if (request.scope === 'week') {
    const nextPlan = generateWeeklyPlan(profile, source);
    nextPlan.replanHistory = [
      ...currentPlan.replanHistory,
      {
        at: new Date().toISOString(),
        scope: request.scope,
        reason: request.reason,
      },
    ];
    return nextPlan;
  }

  const nextPlan = clonePlan(currentPlan);
  const recentlyUsedTemplateIds = currentPlan.days.flatMap((day) =>
    day.meals.map((meal) => meal.recipe.templateId),
  );

  if (request.scope === 'day') {
    if (request.dayIndex === undefined) {
      throw new Error('dayIndex is required when replanning a day');
    }

    const nextDay = generateDayPlan(profile, request.dayIndex, recentlyUsedTemplateIds, request);
    nextPlan.days = replaceDay(nextPlan.days, nextDay);
  }

  if (request.scope === 'meal') {
    if (request.dayIndex === undefined || !request.mealSlotId) {
      throw new Error('dayIndex and mealSlotId are required when replanning a meal');
    }

    nextPlan.days = nextPlan.days.map((day) => {
      if (day.dayIndex !== request.dayIndex) {
        return day;
      }

      const meals = day.meals.map((meal) => {
        if (meal.id !== request.mealSlotId) {
          return meal;
        }

        const replacementCandidates = findCandidates(
          meal.slotType,
          profile,
          recentlyUsedTemplateIds,
          request,
        ).filter((candidate) => candidate.id !== meal.recipe.templateId);
        const replacement = replacementCandidates[0];

        if (!replacement) {
          return meal;
        }

        return createMealSlot(
          replacement,
          meal.slotType,
          request.dayIndex ?? day.dayIndex,
          meal.targetCalories,
        );
      });

      return enrichDayWithProteinIfNeeded(profile, {
        ...day,
        meals,
        totals: recomputeDayTotals(meals),
      });
    });
  }

  nextPlan.updatedAt = new Date().toISOString();
  nextPlan.source = source;
  nextPlan.replanHistory = [
    ...nextPlan.replanHistory,
    {
      at: nextPlan.updatedAt,
      scope: request.scope,
      reason: request.reason,
      dayIndex: request.dayIndex,
      mealSlotId: request.mealSlotId,
    },
  ];
  nextPlan.validation = validateWeeklyPlan(profile, nextPlan);
  nextPlan.shoppingList = buildShoppingList(nextPlan);

  return nextPlan;
};

export const summarizeWeekNutrition = (plan: WeeklyPlan): NutritionSummary =>
  plan.days.reduce(
    (accumulator, day) => sumNutrition([accumulator, day.totals]),
    zeroNutrition(),
  );
