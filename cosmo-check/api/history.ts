import {
  buildAnalyticsPayload,
  deleteUserHistory,
  fetchHistory,
  getHistoryConfigStatus,
  insertAnalytics,
  insertHistory,
  jsonResponse,
  parseHistoryPayload,
  resolveAuthenticatedUser
} from "./_lib/history.js";

export const runtime = "nodejs";

async function requireUser(request: Request) {
  return resolveAuthenticatedUser(request).catch(() => null);
}

function unauthorizedHistoryResponse() {
  return jsonResponse(
    {
      configured: getHistoryConfigStatus(),
      items: [],
      error: "Войдите в аккаунт, чтобы открыть сохранённые рекомендации."
    },
    401
  );
}

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (!user) {
    return unauthorizedHistoryResponse();
  }

  if (!getHistoryConfigStatus()) {
    return jsonResponse(
      {
        configured: false,
        items: [],
        error: "История рекомендаций пока недоступна."
      },
      503
    );
  }

  try {
    const items = await fetchHistory(user.id);
    return jsonResponse(
      {
        configured: true,
        items
      },
      200
    );
  } catch {
    return jsonResponse(
      {
        configured: true,
        items: [],
        error: "Не удалось загрузить историю рекомендаций."
      },
      500
    );
  }
}

export async function DELETE(request: Request) {
  const user = await requireUser(request);
  if (!user) {
    return unauthorizedHistoryResponse();
  }

  if (!getHistoryConfigStatus()) {
    return jsonResponse(
      {
        configured: false,
        error: "История рекомендаций пока недоступна."
      },
      503
    );
  }

  try {
    await deleteUserHistory(user.id);
    return jsonResponse(
      {
        configured: true,
        cleared: true
      },
      200
    );
  } catch {
    return jsonResponse(
      {
        configured: true,
        cleared: false,
        error: "Не удалось очистить историю рекомендаций."
      },
      500
    );
  }
}

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (!user) {
    return unauthorizedHistoryResponse();
  }

  if (!getHistoryConfigStatus()) {
    return jsonResponse(
      {
        configured: false,
        error: "История рекомендаций пока недоступна."
      },
      503
    );
  }

  try {
    const body = await request.json().catch(() => null);
    const payload = parseHistoryPayload(body);
    const item = await insertHistory(user.id, payload);
    let analyticsSaved = true;

    try {
      await insertAnalytics(buildAnalyticsPayload(user.id, payload));
    } catch {
      analyticsSaved = false;
    }

    return jsonResponse(
      {
        configured: true,
        item,
        analyticsSaved
      },
      201
    );
  } catch (error) {
    return jsonResponse(
      {
        configured: true,
        error: error instanceof Error ? error.message : "Не удалось сохранить рекомендацию."
      },
      400
    );
  }
}
