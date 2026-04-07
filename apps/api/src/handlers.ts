import {
  generatePlanInputSchema,
  replanPlanInputSchema,
  validatePlanInputSchema,
} from '../../../packages/shared/src';

import { generatePlanWithStrategy, replanWithStrategy, validatePlanInput } from './plan-service';
import { getSupabaseStatus, persistPlannerSnapshot } from './supabase';

type RequestContext = {
  installationId?: string | null;
};

export const getHealthPayload = () => ({
  ok: true,
  service: '@nutrition-planner/api',
  now: new Date().toISOString(),
  supabase: getSupabaseStatus(),
});

export const handleGeneratePlanRequest = async (
  body: unknown,
  context: RequestContext = {},
) => {
  const input = generatePlanInputSchema.parse(body);
  const result = await generatePlanWithStrategy(input.profile);

  const responsePayload = {
    plan: result.plan,
    validation: result.plan.validation,
  };
  const persistence = await persistPlannerSnapshot({
    action: 'generate',
    installationId: context.installationId,
    profile: input.profile,
    plan: result.plan,
    validation: result.plan.validation,
    requestPayload: body,
    responsePayload,
    source: result.source,
  });

  return {
    ...responsePayload,
    meta: {
      source: result.source,
      fallbackUsed: result.fallbackUsed,
      persistence,
    },
  };
};

export const handleReplanPlanRequest = async (
  body: unknown,
  context: RequestContext = {},
) => {
  const input = replanPlanInputSchema.parse(body);
  const result = await replanWithStrategy(input);

  const responsePayload = {
    plan: result.plan,
    validation: result.plan.validation,
  };
  const persistence = await persistPlannerSnapshot({
    action: 'replan',
    installationId: context.installationId,
    profile: input.profile,
    plan: result.plan,
    validation: result.plan.validation,
    requestPayload: body,
    responsePayload,
    source: result.source,
  });

  return {
    ...responsePayload,
    meta: {
      source: result.source,
      persistence,
    },
  };
};

export const handleValidatePlanRequest = async (
  body: unknown,
  context: RequestContext = {},
) => {
  const input = validatePlanInputSchema.parse(body);
  const result = validatePlanInput(input);

  const persistence = await persistPlannerSnapshot({
    action: 'validate',
    installationId: context.installationId,
    profile: input.profile,
    plan: input.plan,
    validation: result.validation,
    requestPayload: body,
    responsePayload: result,
    source: input.plan.source,
  });

  return {
    ...result,
    meta: {
      persistence,
    },
  };
};
