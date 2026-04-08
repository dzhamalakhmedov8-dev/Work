import {
  generatePlanInputSchema,
  replanPlanInputSchema,
  validatePlanInputSchema,
} from '../../../packages/shared/src';

import {
  generatePlanWithStrategy,
  getLlmStatus,
  replanWithStrategy,
  validatePlanInput,
} from './plan-service';
import * as plannerSupabase from './supabase';

type RequestContext = {
  installationId?: string | null;
  authorization?: string | null;
};

export const getHealthPayload = () => ({
  ok: true,
  service: '@nutrition-planner/api',
  now: new Date().toISOString(),
  supabase: plannerSupabase.getSupabaseStatus(),
  llm: getLlmStatus(),
});

export const handleGeneratePlanRequest = async (
  body: unknown,
  context: RequestContext = {},
) => {
  await plannerSupabase.verifyPlannerAccessToken(context.authorization);
  const input = generatePlanInputSchema.parse(body);
  const result = await generatePlanWithStrategy(input.profile);

  const responsePayload = {
    plan: result.plan,
    validation: result.plan.validation,
  };
  const persistence = await plannerSupabase.persistPlannerSnapshot({
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
      llm: result.llm,
      persistence,
    },
  };
};

export const handleReplanPlanRequest = async (
  body: unknown,
  context: RequestContext = {},
) => {
  await plannerSupabase.verifyPlannerAccessToken(context.authorization);
  const input = replanPlanInputSchema.parse(body);
  const result = await replanWithStrategy(input);

  const responsePayload = {
    plan: result.plan,
    validation: result.plan.validation,
  };
  const persistence = await plannerSupabase.persistPlannerSnapshot({
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
  await plannerSupabase.verifyPlannerAccessToken(context.authorization);
  const input = validatePlanInputSchema.parse(body);
  const result = validatePlanInput(input);

  const persistence = await plannerSupabase.persistPlannerSnapshot({
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
