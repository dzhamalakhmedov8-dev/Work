import { z } from 'zod';

export const appPlanVersion = 'v1';
export const exportBundleVersion = '1';

export const sexSchema = z.enum(['female', 'male']);
export type Sex = z.infer<typeof sexSchema>;

export const goalSchema = z.enum(['lose', 'maintain', 'gain']);
export type Goal = z.infer<typeof goalSchema>;

export const activityLevelSchema = z.enum([
  'sedentary',
  'light',
  'moderate',
  'very',
  'athlete',
]);
export type ActivityLevel = z.infer<typeof activityLevelSchema>;

export const mealSlotTypeSchema = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);
export type MealSlotType = z.infer<typeof mealSlotTypeSchema>;

export const cookingTimePreferenceSchema = z.enum(['quick', 'balanced', 'flexible']);
export type CookingTimePreference = z.infer<typeof cookingTimePreferenceSchema>;

export const replanScopeSchema = z.enum(['meal', 'day', 'week']);
export type ReplanScope = z.infer<typeof replanScopeSchema>;

export const replanReasonSchema = z.enum([
  'skip',
  'dislike',
  'ingredient_unavailable',
  'refresh',
]);
export type ReplanReason = z.infer<typeof replanReasonSchema>;

export const planSourceSchema = z.enum(['template', 'llm', 'llm-fallback']);
export type PlanSource = z.infer<typeof planSourceSchema>;

export const nutritionSummarySchema = z.object({
  calories: z.number().nonnegative(),
  proteinGrams: z.number().nonnegative(),
  fatGrams: z.number().nonnegative(),
  carbGrams: z.number().nonnegative(),
});
export type NutritionSummary = z.infer<typeof nutritionSummarySchema>;

export const dietaryConstraintsSchema = z.object({
  allergies: z.array(z.string().trim()).default([]),
  forbiddenFoods: z.array(z.string().trim()).default([]),
  dislikedFoods: z.array(z.string().trim()).default([]),
  preferredCuisines: z.array(z.string().trim()).default([]),
  cookingTimePreference: cookingTimePreferenceSchema.optional(),
});
export type DietaryConstraints = z.infer<typeof dietaryConstraintsSchema>;

export const userProfileSchema = z.object({
  id: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  name: z.string().trim().min(1).max(80).optional(),
  age: z.number().int().min(18).max(99),
  sex: sexSchema,
  heightCm: z.number().min(120).max(250),
  weightKg: z.number().min(35).max(300),
  restingHeartRate: z.number().int().min(30).max(220).optional(),
  targetWeightKg: z.number().min(35).max(300).optional(),
  goal: goalSchema,
  activityLevel: activityLevelSchema,
  mealsPerDay: z.union([z.literal(3), z.literal(4)]),
  dietaryConstraints: dietaryConstraintsSchema,
});
export type UserProfile = z.infer<typeof userProfileSchema>;

export const nutritionTargetsSchema = nutritionSummarySchema.extend({
  bmr: z.number().nonnegative(),
  tdee: z.number().nonnegative(),
  proteinFloorGrams: z.number().nonnegative(),
  fatFloorGrams: z.number().nonnegative(),
});
export type NutritionTargets = z.infer<typeof nutritionTargetsSchema>;

export const ingredientNutritionReferenceSchema = z.object({
  calories: z.number().nonnegative(),
  proteinGrams: z.number().nonnegative(),
  fatGrams: z.number().nonnegative(),
  carbGrams: z.number().nonnegative(),
});
export type IngredientNutritionReference = z.infer<typeof ingredientNutritionReferenceSchema>;

export const ingredientCatalogItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  tags: z.array(z.string()),
  nutritionPer100g: ingredientNutritionReferenceSchema,
});
export type IngredientCatalogItem = z.infer<typeof ingredientCatalogItemSchema>;

export const recipeIngredientSchema = z.object({
  ingredientId: z.string(),
  name: z.string(),
  category: z.string(),
  grams: z.number().positive(),
  unit: z.literal('g').default('g'),
  tags: z.array(z.string()).default([]),
  nutrition: nutritionSummarySchema,
});
export type RecipeIngredient = z.infer<typeof recipeIngredientSchema>;

export const mealRecipeSchema = z.object({
  id: z.string(),
  templateId: z.string(),
  title: z.string(),
  slotType: mealSlotTypeSchema,
  cuisine: z.string(),
  prepMinutes: z.number().int().nonnegative(),
  tags: z.array(z.string()).default([]),
  ingredients: z.array(recipeIngredientSchema),
  steps: z.array(z.string()),
  nutrition: nutritionSummarySchema,
});
export type MealRecipe = z.infer<typeof mealRecipeSchema>;

export const mealSlotSchema = z.object({
  id: z.string(),
  slotType: mealSlotTypeSchema,
  targetCalories: z.number().positive(),
  recipe: mealRecipeSchema,
});
export type MealSlot = z.infer<typeof mealSlotSchema>;

export const dayPlanSchema = z.object({
  id: z.string(),
  dayIndex: z.number().int().min(0).max(6),
  label: z.string(),
  meals: z.array(mealSlotSchema).min(3).max(4),
  totals: nutritionSummarySchema,
});
export type DayPlan = z.infer<typeof dayPlanSchema>;

export const shoppingListItemSchema = z.object({
  ingredientId: z.string(),
  name: z.string(),
  category: z.string(),
  grams: z.number().positive(),
});
export type ShoppingListItem = z.infer<typeof shoppingListItemSchema>;

export const shoppingListSchema = z.object({
  generatedAt: z.string().datetime(),
  items: z.array(shoppingListItemSchema),
});
export type ShoppingList = z.infer<typeof shoppingListSchema>;

export const dayValidationSchema = z.object({
  dayIndex: z.number().int().min(0).max(6),
  label: z.string(),
  passed: z.boolean(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
});
export type DayValidation = z.infer<typeof dayValidationSchema>;

export const planValidationSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
  dayResults: z.array(dayValidationSchema),
});
export type PlanValidation = z.infer<typeof planValidationSchema>;

export const replanAuditEntrySchema = z.object({
  at: z.string().datetime(),
  scope: replanScopeSchema,
  reason: replanReasonSchema,
  dayIndex: z.number().int().min(0).max(6).optional(),
  mealSlotId: z.string().optional(),
});
export type ReplanAuditEntry = z.infer<typeof replanAuditEntrySchema>;

export const weeklyPlanSchema = z.object({
  id: z.string(),
  version: z.literal(appPlanVersion),
  profileId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  targets: nutritionTargetsSchema,
  days: z.array(dayPlanSchema).length(7),
  shoppingList: shoppingListSchema,
  validation: planValidationSchema,
  source: planSourceSchema,
  replanHistory: z.array(replanAuditEntrySchema).default([]),
});
export type WeeklyPlan = z.infer<typeof weeklyPlanSchema>;

export const replanRequestSchema = z.object({
  scope: replanScopeSchema,
  reason: replanReasonSchema.default('refresh'),
  dayIndex: z.number().int().min(0).max(6).optional(),
  mealSlotId: z.string().optional(),
  blockedFoods: z.array(z.string().trim()).default([]),
  preferredCuisines: z.array(z.string().trim()).default([]),
});
export type ReplanRequest = z.infer<typeof replanRequestSchema>;

export const exportBundleV1Schema = z.object({
  version: z.literal(exportBundleVersion),
  exportedAt: z.string().datetime(),
  profile: userProfileSchema.nullable(),
  currentPlan: weeklyPlanSchema.nullable(),
  planHistory: z.array(weeklyPlanSchema),
});
export type ExportBundleV1 = z.infer<typeof exportBundleV1Schema>;

export const generatePlanInputSchema = z.object({
  profile: userProfileSchema,
});
export type GeneratePlanInput = z.infer<typeof generatePlanInputSchema>;

export const validatePlanInputSchema = z.object({
  profile: userProfileSchema,
  plan: weeklyPlanSchema,
});
export type ValidatePlanInput = z.infer<typeof validatePlanInputSchema>;

export const replanPlanInputSchema = z.object({
  profile: userProfileSchema,
  currentPlan: weeklyPlanSchema,
  request: replanRequestSchema,
});
export type ReplanPlanInput = z.infer<typeof replanPlanInputSchema>;

export interface MealTemplateIngredient {
  ingredientId: string;
  grams: number;
}

export interface MealTemplate {
  id: string;
  title: string;
  slotType: MealSlotType;
  cuisine: string;
  prepMinutes: number;
  tags: string[];
  ingredients: MealTemplateIngredient[];
  steps: string[];
}
