import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { generateWeeklyPlan, type UserProfile } from '@nutrition-planner/shared';

import { createApp } from './app';

const app = createApp();

const profile: UserProfile = {
  id: 'api-profile',
  createdAt: new Date('2026-04-06T09:00:00.000Z').toISOString(),
  updatedAt: new Date('2026-04-06T09:00:00.000Z').toISOString(),
  age: 29,
  sex: 'male',
  heightCm: 182,
  weightKg: 84,
  goal: 'maintain',
  activityLevel: 'moderate',
  mealsPerDay: 4,
  dietaryConstraints: {
    allergies: ['peanut'],
    forbiddenFoods: [],
    dislikedFoods: ['mushrooms'],
    preferredCuisines: ['Mediterranean'],
    cookingTimePreference: 'balanced',
  },
};

describe('nutrition planner api', () => {
  it('generates a valid weekly plan', async () => {
    const response = await request(app).post('/v1/plan/generate').send({ profile });

    expect(response.status).toBe(200);
    expect(response.body.plan.days).toHaveLength(7);
    expect(response.body.validation.isValid).toBe(true);
  });

  it('replans a single meal and preserves the seven-day structure', async () => {
    const plan = generateWeeklyPlan(profile);
    const targetMeal = plan.days[0].meals[0];
    const response = await request(app)
      .post('/v1/plan/replan')
      .send({
        profile,
        currentPlan: plan,
        request: {
          scope: 'meal',
          reason: 'refresh',
          dayIndex: 0,
          mealSlotId: targetMeal.id,
          blockedFoods: [],
          preferredCuisines: [],
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.plan.days).toHaveLength(7);
    expect(response.body.plan.days[0].meals[0].id).not.toBe(targetMeal.id);
  });

  it('validates and rejects an unsafe plan payload', async () => {
    const plan = generateWeeklyPlan(profile);
    plan.days[0].meals[0].recipe.ingredients.push({
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
    });

    const response = await request(app)
      .post('/v1/plan/validate')
      .send({ profile, plan });

    expect(response.status).toBe(200);
    expect(response.body.isValid).toBe(false);
    expect(
      response.body.validation.errors.some((error: string) =>
        error.toLowerCase().includes('peanut'),
      ),
    ).toBe(true);
  });
});
