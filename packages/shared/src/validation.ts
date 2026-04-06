import type {
  DayPlan,
  DietaryConstraints,
  MealRecipe,
  PlanValidation,
  UserProfile,
  WeeklyPlan,
} from './domain';
import { calculateNutritionTargets, sumNutrition } from './nutrition';

export const DAILY_CALORIE_TOLERANCE_PCT = 0.12;
export const DAILY_PROTEIN_SLACK_GRAMS = 5;
export const DAILY_FAT_SLACK_GRAMS = 3;

const normalizeToken = (value: string): string =>
  value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const tokenizeConstraintList = (constraints: string[]): string[] =>
  constraints.map(normalizeToken).filter(Boolean);

const ingredientTokens = (ingredient: MealRecipe['ingredients'][number]): string[] => {
  const tokens = [
    ingredient.ingredientId,
    ingredient.name,
    ingredient.category,
    ...ingredient.tags,
  ];

  return tokens.map(normalizeToken).filter(Boolean);
};

export const recipeViolations = (
  recipe: MealRecipe,
  dietaryConstraints: DietaryConstraints,
  blockedFoods: string[] = [],
): string[] => {
  const allergies = tokenizeConstraintList(dietaryConstraints.allergies);
  const forbiddenFoods = tokenizeConstraintList(dietaryConstraints.forbiddenFoods);
  const dislikedFoods = tokenizeConstraintList(dietaryConstraints.dislikedFoods);
  const additionalBlocked = tokenizeConstraintList(blockedFoods);
  const restrictionGroups: Array<{ label: string; values: string[] }> = [
    { label: 'allergy', values: allergies },
    { label: 'forbidden food', values: forbiddenFoods },
    { label: 'disliked food', values: dislikedFoods },
    { label: 'blocked food', values: additionalBlocked },
  ];

  const errors = new Set<string>();

  for (const ingredient of recipe.ingredients) {
    const tokens = ingredientTokens(ingredient);

    for (const restrictionGroup of restrictionGroups) {
      for (const restriction of restrictionGroup.values) {
        if (!restriction) {
          continue;
        }

        const matched = tokens.some(
          (token) => token.includes(restriction) || restriction.includes(token),
        );

        if (matched) {
          errors.add(
            `${recipe.title} contains ${ingredient.name}, which conflicts with a ${restrictionGroup.label}: ${restriction}`,
          );
        }
      }
    }
  }

  return Array.from(errors);
};

const validateDay = (
  profile: UserProfile,
  day: DayPlan,
): { errors: string[]; warnings: string[] } => {
  const targets = calculateNutritionTargets(profile);
  const recalculatedTotals = sumNutrition(day.meals.map((meal) => meal.recipe.nutrition));
  const errors: string[] = [];
  const warnings: string[] = [];
  const calorieTolerance = Math.max(120, targets.calories * DAILY_CALORIE_TOLERANCE_PCT);
  const caloriesDelta = Math.abs(recalculatedTotals.calories - targets.calories);

  if (caloriesDelta > calorieTolerance) {
    errors.push(
      `${day.label} is ${Math.round(caloriesDelta)} kcal away from target ${targets.calories} kcal`,
    );
  }

  if (recalculatedTotals.proteinGrams < targets.proteinFloorGrams - DAILY_PROTEIN_SLACK_GRAMS) {
    errors.push(
      `${day.label} protein is below the daily floor (${Math.round(recalculatedTotals.proteinGrams)}g vs ${targets.proteinFloorGrams}g)`,
    );
  }

  if (recalculatedTotals.fatGrams < targets.fatFloorGrams - DAILY_FAT_SLACK_GRAMS) {
    errors.push(
      `${day.label} fat is below the daily floor (${Math.round(recalculatedTotals.fatGrams)}g vs ${targets.fatFloorGrams}g)`,
    );
  }

  for (const meal of day.meals) {
    errors.push(...recipeViolations(meal.recipe, profile.dietaryConstraints));
  }

  if (day.meals.length !== profile.mealsPerDay) {
    warnings.push(
      `${day.label} has ${day.meals.length} meals but the profile expects ${profile.mealsPerDay}`,
    );
  }

  return { errors, warnings };
};

export const validateWeeklyPlan = (profile: UserProfile, plan: WeeklyPlan): PlanValidation => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const dayResults = plan.days.map((day) => {
    const { errors: dayErrors, warnings: dayWarnings } = validateDay(profile, day);
    errors.push(...dayErrors);
    warnings.push(...dayWarnings);

    return {
      dayIndex: day.dayIndex,
      label: day.label,
      passed: dayErrors.length === 0,
      errors: dayErrors,
      warnings: dayWarnings,
    };
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    dayResults,
  };
};
