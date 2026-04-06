import { describe, expect, it } from 'vitest';

import type { UserProfile } from '../domain';
import { calculateNutritionTargets } from '../nutrition';

const baseProfile: UserProfile = {
  id: 'profile-1',
  createdAt: new Date('2026-04-06T09:00:00.000Z').toISOString(),
  updatedAt: new Date('2026-04-06T09:00:00.000Z').toISOString(),
  age: 30,
  sex: 'male',
  heightCm: 180,
  weightKg: 80,
  goal: 'maintain',
  activityLevel: 'moderate',
  mealsPerDay: 4,
  dietaryConstraints: {
    allergies: [],
    forbiddenFoods: [],
    dislikedFoods: [],
    preferredCuisines: [],
  },
};

describe('calculateNutritionTargets', () => {
  it('calculates BMR, TDEE, and macro floors for maintenance', () => {
    const result = calculateNutritionTargets(baseProfile);

    expect(result.bmr).toBe(1780);
    expect(result.tdee).toBe(2759);
    expect(result.calories).toBe(2759);
    expect(result.proteinFloorGrams).toBe(128);
    expect(result.fatFloorGrams).toBe(64);
    expect(result.carbGrams).toBe(418);
  });

  it('applies calorie adjustments for loss and gain', () => {
    expect(calculateNutritionTargets({ ...baseProfile, goal: 'lose' }).calories).toBe(2345);
    expect(calculateNutritionTargets({ ...baseProfile, goal: 'gain' }).calories).toBe(3035);
  });
});
