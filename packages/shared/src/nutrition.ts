import type {
  IngredientCatalogItem,
  MealTemplate,
  MealTemplateIngredient,
  NutritionSummary,
  NutritionTargets,
  UserProfile,
} from './domain';
import { ingredientCatalogMap } from './ingredients';

export const activityMultipliers = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
  athlete: 1.9,
} as const;

export const goalAdjustments = {
  lose: -0.15,
  maintain: 0,
  gain: 0.1,
} as const;

export const slotRatios = {
  3: {
    breakfast: 0.28,
    lunch: 0.34,
    dinner: 0.38,
  },
  4: {
    breakfast: 0.24,
    lunch: 0.29,
    snack: 0.13,
    dinner: 0.34,
  },
} as const;

export const zeroNutrition = (): NutritionSummary => ({
  calories: 0,
  proteinGrams: 0,
  fatGrams: 0,
  carbGrams: 0,
});

export const roundTo = (value: number, precision = 1): number =>
  Number(value.toFixed(precision));

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export const addNutrition = (
  left: NutritionSummary,
  right: NutritionSummary,
): NutritionSummary => ({
  calories: roundTo(left.calories + right.calories, 1),
  proteinGrams: roundTo(left.proteinGrams + right.proteinGrams, 1),
  fatGrams: roundTo(left.fatGrams + right.fatGrams, 1),
  carbGrams: roundTo(left.carbGrams + right.carbGrams, 1),
});

export const sumNutrition = (items: NutritionSummary[]): NutritionSummary =>
  items.reduce((accumulator, item) => addNutrition(accumulator, item), zeroNutrition());

export const gramsToNutrition = (
  ingredient: IngredientCatalogItem,
  grams: number,
): NutritionSummary => {
  const ratio = grams / 100;

  return {
    calories: roundTo(ingredient.nutritionPer100g.calories * ratio, 1),
    proteinGrams: roundTo(ingredient.nutritionPer100g.proteinGrams * ratio, 1),
    fatGrams: roundTo(ingredient.nutritionPer100g.fatGrams * ratio, 1),
    carbGrams: roundTo(ingredient.nutritionPer100g.carbGrams * ratio, 1),
  };
};

export const getIngredient = (ingredientId: string): IngredientCatalogItem => {
  const ingredient = ingredientCatalogMap.get(ingredientId);

  if (!ingredient) {
    throw new Error(`Unknown ingredient: ${ingredientId}`);
  }

  return ingredient;
};

export const calculateTemplateBaseNutrition = (
  ingredients: MealTemplateIngredient[],
): NutritionSummary =>
  sumNutrition(
    ingredients.map((item) => gramsToNutrition(getIngredient(item.ingredientId), item.grams)),
  );

export const calculateTemplateNutrition = (template: MealTemplate): NutritionSummary =>
  calculateTemplateBaseNutrition(template.ingredients);

export const calculateBmr = (profile: UserProfile): number => {
  const sexOffset = profile.sex === 'male' ? 5 : -161;
  return roundTo(
    10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age + sexOffset,
    0,
  );
};

export const calculateNutritionTargets = (profile: UserProfile): NutritionTargets => {
  const bmr = calculateBmr(profile);
  const tdee = roundTo(bmr * activityMultipliers[profile.activityLevel], 0);
  const adjustedCalories = roundTo(tdee * (1 + goalAdjustments[profile.goal]), 0);
  const proteinFloorGrams = roundTo(
    profile.weightKg * (profile.goal === 'gain' ? 1.8 : 1.6),
    0,
  );
  const fatFloorGrams = roundTo(profile.weightKg * 0.8, 0);
  const remainingCalories =
    adjustedCalories - proteinFloorGrams * 4 - fatFloorGrams * 9;
  const carbGrams = roundTo(Math.max(remainingCalories, 0) / 4, 0);

  return {
    bmr,
    tdee,
    calories: adjustedCalories,
    proteinGrams: proteinFloorGrams,
    fatGrams: fatFloorGrams,
    carbGrams,
    proteinFloorGrams,
    fatFloorGrams,
  };
};

export const roundGrams = (grams: number): number => {
  if (grams <= 20) {
    return Math.max(1, Math.round(grams));
  }

  return Math.max(5, Math.round(grams / 5) * 5);
};
