import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { UserProfile } from '../../../packages/shared/src';

import { generatePlanWithStrategy } from './plan-service';

const profile: UserProfile = {
  id: 'llm-profile',
  createdAt: new Date('2026-04-07T10:00:00.000Z').toISOString(),
  updatedAt: new Date('2026-04-07T10:00:00.000Z').toISOString(),
  age: 31,
  sex: 'female',
  heightCm: 168,
  weightKg: 67,
  goal: 'maintain',
  activityLevel: 'light',
  mealsPerDay: 4,
  dietaryConstraints: {
    allergies: ['peanut'],
    forbiddenFoods: [],
    dislikedFoods: ['mushrooms'],
    preferredCuisines: ['Mediterranean'],
    cookingTimePreference: 'balanced',
  },
};

const llmSelectionPayload = {
  days: [
    {
      breakfast: 'breakfast-savory-eggs-toast',
      lunch: 'lunch-tuna-quinoa-salad',
      snack: 'snack-yogurt-berries',
      dinner: 'dinner-salmon-sweet-potato',
    },
    {
      breakfast: 'breakfast-cottage-bowl',
      lunch: 'lunch-chicken-chickpea-salad',
      snack: 'snack-cottage-apple',
      dinner: 'dinner-chicken-quinoa',
    },
    {
      breakfast: 'breakfast-yogurt-parfait',
      lunch: 'lunch-chicken-rice-bowl',
      snack: 'snack-hummus-crudites',
      dinner: 'dinner-chicken-chickpeas',
    },
    {
      breakfast: 'breakfast-avocado-egg-toast',
      lunch: 'lunch-tuna-quinoa-salad',
      snack: 'snack-banana-yogurt-oats',
      dinner: 'dinner-tuna-potato-salad',
    },
    {
      breakfast: 'breakfast-savory-eggs-toast',
      lunch: 'lunch-chicken-chickpea-salad',
      snack: 'snack-yogurt-berries',
      dinner: 'dinner-salmon-sweet-potato',
    },
    {
      breakfast: 'breakfast-cottage-bowl',
      lunch: 'lunch-black-bean-bowl',
      snack: 'snack-cottage-apple',
      dinner: 'dinner-tofu-pasta',
    },
    {
      breakfast: 'breakfast-yogurt-parfait',
      lunch: 'lunch-tofu-stir-fry',
      snack: 'snack-banana-yogurt-oats',
      dinner: 'dinner-chicken-quinoa',
    },
  ],
};

const originalEnv = { ...process.env };

describe('generatePlanWithStrategy', () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NUTRITION_ENABLE_LLM: "1\n",
      OPENAI_API_KEY: 'sk-or-test-key',
      OPENAI_MODEL: 'openrouter/auto',
      OPENAI_BASE_URL: 'https://openrouter.ai/api/v1',
    };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('uses the LLM-selected template plan when the response is valid', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          model: 'openai/gpt-4.1-mini',
          choices: [
            {
              message: {
                content: JSON.stringify(llmSelectionPayload),
              },
            },
          ],
        }),
      }),
    );

    const result = await generatePlanWithStrategy(profile);

    expect(result.source).toBe('llm');
    expect(result.fallbackUsed).toBe(false);
    expect(result.llm?.provider).toBe('openrouter');
    expect(result.plan.source).toBe('llm');
    expect(result.plan.days).toHaveLength(7);
    expect(result.plan.validation.isValid).toBe(true);
  });

  it('falls back to the deterministic planner when the LLM response is malformed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          model: 'openai/gpt-4.1-mini',
          choices: [
            {
              message: {
                content: '{"days":[{"breakfast":"missing"}]}',
              },
            },
          ],
        }),
      }),
    );

    const result = await generatePlanWithStrategy(profile);

    expect(result.source).toBe('llm-fallback');
    expect(result.fallbackUsed).toBe(true);
    expect(result.plan.source).toBe('llm-fallback');
    expect(result.plan.days).toHaveLength(7);
    expect(result.plan.validation.isValid).toBe(true);
  });
});
