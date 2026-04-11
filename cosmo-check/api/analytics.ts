import { jsonResponse } from "./_lib/history.js";

export const runtime = "nodejs";

export async function GET() {
  return jsonResponse(
    {
      error: "Маршрут не найден."
    },
    404
  );
}
