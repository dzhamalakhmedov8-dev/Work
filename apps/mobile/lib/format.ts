import type { NutritionSummary } from '@nutrition-planner/shared';

export const formatNutritionLine = (nutrition: NutritionSummary): string =>
  `${Math.round(nutrition.calories)} kcal | P ${Math.round(
    nutrition.proteinGrams,
  )}g | F ${Math.round(nutrition.fatGrams)}g | C ${Math.round(nutrition.carbGrams)}g`;

export const formatList = (values: string[], emptyLabel = 'None'): string =>
  values.length > 0 ? values.join(', ') : emptyLabel;

export const formatWeight = (value?: number): string =>
  typeof value === 'number' ? `${value} kg` : 'Not set';
