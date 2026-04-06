import { handleReplanPlanRequest } from '../../../apps/api/src/handlers';
import { formatError, jsonResponse } from '../../../apps/api/src/http';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    return jsonResponse(await handleReplanPlanRequest(body));
  } catch (error) {
    const formatted = formatError(error);
    return jsonResponse(formatted.body, formatted.status);
  }
}
