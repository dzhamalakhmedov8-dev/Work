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
      response.status(200).json(await handleGeneratePlanRequest(request.body));
    } catch (error) {
      const formatted = formatError(error);
      response.status(formatted.status).json(formatted.body);
    }
  });

  app.post('/v1/plan/replan', async (request, response) => {
    try {
      response.status(200).json(await handleReplanPlanRequest(request.body));
    } catch (error) {
      const formatted = formatError(error);
      response.status(formatted.status).json(formatted.body);
    }
  });

  app.post('/v1/plan/validate', (request, response) => {
    try {
      response.status(200).json(handleValidatePlanRequest(request.body));
    } catch (error) {
      const formatted = formatError(error);
      response.status(formatted.status).json(formatted.body);
    }
  });

  return app;
};
