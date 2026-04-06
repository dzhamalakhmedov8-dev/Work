import {
  generatePlanInputSchema,
  replanPlanInputSchema,
  validatePlanInputSchema,
} from '../../../packages/shared/src';

import { generatePlanWithStrategy, replanWithStrategy, validatePlanInput } from './plan-service';

export const getHealthPayload = () => ({
  ok: true,
  service: '@nutrition-planner/api',
  now: new Date().toISOString(),
});

export const handleGeneratePlanRequest = async (body: unknown) => {
  const input = generatePlanInputSchema.parse(body);
  const result = await generatePlanWithStrategy(input.profile);

  return {
    plan: result.plan,
    validation: result.plan.validation,
    meta: {
      source: result.source,
      fallbackUsed: result.fallbackUsed,
    },
  };
};

export const handleReplanPlanRequest = async (body: unknown) => {
  const input = replanPlanInputSchema.parse(body);
  const result = await replanWithStrategy(input);

  return {
    plan: result.plan,
    validation: result.plan.validation,
    meta: {
      source: result.source,
    },
  };
};

export const handleValidatePlanRequest = (body: unknown) => {
  const input = validatePlanInputSchema.parse(body);
  return validatePlanInput(input);
};
