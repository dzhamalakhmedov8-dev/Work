import { getHealthPayload } from '../apps/api/src/handlers';
import { jsonResponse } from '../apps/api/src/http';

export const runtime = 'nodejs';

export async function GET() {
  return jsonResponse(getHealthPayload());
}
