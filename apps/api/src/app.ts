import cors from 'cors';
import express from 'express';
import {
  generatePlanInputSchema,
  replanPlanInputSchema,
  validatePlanInputSchema,
} from '@nutrition-planner/shared';
import { ZodError } from 'zod';

import { generatePlanWithStrategy, replanWithStrategy, validatePlanInput } from './plan-service';

const formatError = (error: unknown): { status: number; body: Record<string, unknown> } => {
  if (error instanceof ZodError) {
    return {
      status: 400,
      body: {
        error: 'Invalid request payload',
        issues: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    };
  }

  const message = error instanceof Error ? error.message : 'Unexpected error';
  return {
    status: 500,
    body: { error: message },
  };
};

export const createApp = () => {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_request, response) => {
    response.json({
      ok: true,
      service: '@nutrition-planner/api',
      now: new Date().toISOString(),
    });
  });

  app.post('/v1/plan/generate', async (request, response) => {
    try {
      const input = generatePlanInputSchema.parse(request.body);
      const result = await generatePlanWithStrategy(input.profile);

      response.status(200).json({
        plan: result.plan,
        validation: result.plan.validation,
        meta: {
          source: result.source,
          fallbackUsed: result.fallbackUsed,
        },
      });
    } catch (error) {
      const formatted = formatError(error);
      response.status(formatted.status).json(formatted.body);
    }
  });

  app.post('/v1/plan/replan', async (request, response) => {
    try {
      const input = replanPlanInputSchema.parse(request.body);
      const result = await replanWithStrategy(input);

      response.status(200).json({
        plan: result.plan,
        validation: result.plan.validation,
        meta: {
          source: result.source,
        },
      });
    } catch (error) {
      const formatted = formatError(error);
      response.status(formatted.status).json(formatted.body);
    }
  });

  app.post('/v1/plan/validate', (request, response) => {
    try {
      const input = validatePlanInputSchema.parse(request.body);
      response.status(200).json(validatePlanInput(input));
    } catch (error) {
      const formatted = formatError(error);
      response.status(formatted.status).json(formatted.body);
    }
  });

  return app;
};
