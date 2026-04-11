import { getPublicAuthConfig, jsonResponse } from './_lib/history.js';

export const runtime = 'nodejs';

export async function GET() {
  const config = getPublicAuthConfig();

  return jsonResponse(
    {
      configured: config.configured,
      supabaseUrl: config.supabaseUrl,
      supabaseAnonKey: config.supabaseAnonKey,
    },
    200,
  );
}
