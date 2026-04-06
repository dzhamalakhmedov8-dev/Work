import { describe, expect, it } from 'vitest';

import type { UserProfile, WeeklyPlan } from '../domain';
import { generateWeeklyPlan, replanWeeklyPlan } from '../planner';
import { buildShoppingList } from '../shopping';
import { validateWeeklyPlan } from '../validation';

const profile: UserProfile = {
  id: 'profile-safe',
  createdAt: new Date('2026-04-06T09:00:00.000Z').toISOString(),
  updatedAt: new Date('2026-04-06T09:00:00.000Z').toISOString(),
  age: 34,
  sex: 'female',
  heightCm: 168,
  weightKg: 67,
  goal: 'maintain',
  activityLevel: 'moderate',
  mealsPerDay: 4,
  dietaryConstraints: {
    allergies: ['peanut'],
    forbiddenFoods: ['salami'],
    dislikedFoods: ['mushrooms'],
    preferredCuisines: ['Mediterranean'],
    cookingTimePreference: 'balanced',
  },
};

describe('weekly planner', () => {
  it('builds a seven day plan that respects allergies and dislikes', () => {
    const plan = generateWeeklyPlan(profile);

    expect(plan.days).toHaveLength(7);
    expect(plan.validation.isValid).toBe(true);
    expect(JSON.stringify(plan).toLowerCase()).not.toContain('peanut');
    expect(JSON.stringify(plan).toLowerCase()).not.toContain('mushroom');
  });

  it('replans a single meal without corrupting the rest of the week', () => {
    const plan = generateWeeklyPlan(profile);
    const targetDay = plan.days[0];
    const targetMeal = targetDay.meals[targetDay.meals.length - 1];
    const otherMealId = plan.days[1].meals[0].id;
    const updated = replanWeeklyPlan(profile, plan, {
      scope: 'meal',
      reason: 'refresh',
      dayIndex: targetDay.dayIndex,
      mealSlotId: targetMeal.id,
      blockedFoods: ['salmon'],
      preferredCuisines: [],
    });

    expect(updated.days[0].meals[targetDay.meals.length - 1].id).not.toBe(targetMeal.id);
    expect(updated.days[1].meals[0].id).toBe(otherMealId);
    expect(updated.validation.isValid).toBe(true);
  });

  it('aggregates duplicate ingredients into a single shopping list row', () => {
    const plan = generateWeeklyPlan(profile);
    const shoppingList = buildShoppingList(plan);
    const chicken = shoppingList.items.find((item) => item.ingredientId === 'chicken-breast');

    expect(shoppingList.items.length).toBeGreaterThan(8);
    expect(chicken?.grams ?? 0).toBeGreaterThan(0);
  });

  it('rejects a plan that contains an allergen ingredient', () => {
    const plan = generateWeeklyPlan(profile);
    const unsafePlan: WeeklyPlan = {
      ...plan,
      days: plan.days.map((day, index) => {
        if (index !== 0) {
          return day;
        }

        return {
          ...day,
          meals: day.meals.map((meal, mealIndex) => {
            if (mealIndex !== 0) {
              return meal;
            }

            return {
              ...meal,
              recipe: {
                ...meal.recipe,
                ingredients: [
                  ...meal.recipe.ingredients,
                  {
                    ingredientId: 'peanut-butter',
                    name: 'Peanut butter',
                    category: 'spread',
                    grams: 20,
                    unit: 'g',
                    tags: ['peanut', 'allergen'],
                    nutrition: {
                      calories: 117.6,
                      proteinGrams: 5,
                      fatGrams: 10,
                      carbGrams: 4,
                    },
                  },
                ],
              },
            };
          }),
        };
      }),
    };

    const validation = validateWeeklyPlan(profile, unsafePlan);
    expect(validation.isValid).toBe(false);
    expect(validation.errors.some((error) => error.toLowerCase().includes('peanut'))).toBe(true);
  });
});
