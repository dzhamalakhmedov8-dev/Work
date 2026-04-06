import type { ShoppingList, ShoppingListItem, WeeklyPlan } from './domain';

export const buildShoppingList = (plan: WeeklyPlan): ShoppingList => {
  const items = new Map<string, ShoppingListItem>();

  for (const day of plan.days) {
    for (const meal of day.meals) {
      for (const ingredient of meal.recipe.ingredients) {
        const existing = items.get(ingredient.ingredientId);

        if (existing) {
          existing.grams = Number((existing.grams + ingredient.grams).toFixed(1));
        } else {
          items.set(ingredient.ingredientId, {
            ingredientId: ingredient.ingredientId,
            name: ingredient.name,
            category: ingredient.category,
            grams: Number(ingredient.grams.toFixed(1)),
          });
        }
      }
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    items: Array.from(items.values()).sort((left, right) => {
      if (left.category === right.category) {
        return left.name.localeCompare(right.name);
      }

      return left.category.localeCompare(right.category);
    }),
  };
};
