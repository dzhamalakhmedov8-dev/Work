import cors from 'cors';
import express from 'express';
import {
  getHealthPayload,
  handleGeneratePlanRequest,
  handleReplanPlanRequest,
  handleValidatePlanRequest,
} from './handlers';
import { formatError } from './http';

export const createApp = () => {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_request, response) => {
    response.json(getHealthPayload());
  });

  app.post('/v1/plan/generate', async (request, response) => {
    try {
      response.status(200).json(
        await handleGeneratePlanRequest(request.body, {
          installationId: request.header('x-installation-id'),
          authorization: request.header('authorization'),
        }),
      );
    } catch (error) {
      const formatted = formatError(error);
      response.status(formatted.status).json(formatted.body);
    }
  });

  app.post('/v1/plan/replan', async (request, response) => {
    try {
      response.status(200).json(
        await handleReplanPlanRequest(request.body, {
          installationId: request.header('x-installation-id'),
          authorization: request.header('authorization'),
        }),
      );
    } catch (error) {
      const formatted = formatError(error);
      response.status(formatted.status).json(formatted.body);
    }
  });

  app.post('/v1/plan/validate', async (request, response) => {
    try {
      response.status(200).json(
        await handleValidatePlanRequest(request.body, {
          installationId: request.header('x-installation-id'),
          authorization: request.header('authorization'),
        }),
      );
    } catch (error) {
      const formatted = formatError(error);
      response.status(formatted.status).json(formatted.body);
    }
  });

  return app;
};
