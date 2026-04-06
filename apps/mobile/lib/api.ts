import Constants from 'expo-constants';
import {
  generatePlanInputSchema,
  replanPlanInputSchema,
  validatePlanInputSchema,
  weeklyPlanSchema,
  type PlanValidation,
  type ReplanPlanInput,
  type UserProfile,
  type ValidatePlanInput,
  type WeeklyPlan,
} from '@nutrition-planner/shared';

const fallbackApiUrl = 'http://127.0.0.1:4000';

export const getDefaultApiUrl = (): string =>
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? fallbackApiUrl;

const parseResponse = async <T>(response: Response): Promise<T> => {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? String(payload.error)
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
};

const postJson = async <T>(
  apiBaseUrl: string,
  path: string,
  body: unknown,
  installationId: string,
): Promise<T> => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Installation-Id': installationId,
    },
    body: JSON.stringify(body),
  });

  return parseResponse<T>(response);
};

export const generatePlan = async (
  apiBaseUrl: string,
  profile: UserProfile,
  installationId: string,
): Promise<WeeklyPlan> => {
  const input = generatePlanInputSchema.parse({ profile });
  const payload = await postJson<{
    plan: WeeklyPlan;
  }>(apiBaseUrl, '/v1/plan/generate', input, installationId);

  return weeklyPlanSchema.parse(payload.plan);
};

export const replanPlan = async (
  apiBaseUrl: string,
  input: ReplanPlanInput,
  installationId: string,
): Promise<WeeklyPlan> => {
  const parsedInput = replanPlanInputSchema.parse(input);
  const payload = await postJson<{
    plan: WeeklyPlan;
  }>(apiBaseUrl, '/v1/plan/replan', parsedInput, installationId);

  return weeklyPlanSchema.parse(payload.plan);
};

export const validatePlan = async (
  apiBaseUrl: string,
  input: ValidatePlanInput,
  installationId: string,
): Promise<PlanValidation> => {
  const parsedInput = validatePlanInputSchema.parse(input);
  const payload = await postJson<{
    validation: PlanValidation;
    isValid: boolean;
  }>(apiBaseUrl, '/v1/plan/validate', parsedInput, installationId);

  return payload.validation;
};
