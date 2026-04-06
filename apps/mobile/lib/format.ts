import type { ActivityLevel, Goal, MealSlotType, NutritionSummary } from '@nutrition-planner/shared';

const activityLabels: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary',
  light: 'Light',
  moderate: 'Moderate',
  very: 'Very active',
  athlete: 'Athlete',
};

const goalLabels: Record<Goal, string> = {
  lose: 'Weight loss',
  maintain: 'Maintain',
  gain: 'Muscle gain',
};

const mealSlotLabels: Record<MealSlotType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

export const formatNutritionLine = (nutrition: NutritionSummary): string =>
  `${Math.round(nutrition.calories)} kcal | P ${Math.round(
    nutrition.proteinGrams,
  )}g | F ${Math.round(nutrition.fatGrams)}g | C ${Math.round(nutrition.carbGrams)}g`;

export const formatList = (values: string[], emptyLabel = 'None'): string =>
  values.length > 0 ? values.join(', ') : emptyLabel;

export const formatWeight = (value?: number): string =>
  typeof value === 'number' ? `${value} kg` : 'Not set';

export const formatGoal = (value: Goal): string => goalLabels[value];

export const formatActivityLevel = (value: ActivityLevel): string => activityLabels[value];

export const formatMealSlot = (value: MealSlotType): string => mealSlotLabels[value];

export const formatShortDateTime = (value: string): string =>
  new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
