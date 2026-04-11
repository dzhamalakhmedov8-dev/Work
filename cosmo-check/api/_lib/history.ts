export const runtime = "nodejs";

declare const process: {
  env: Record<string, string | undefined>;
};

const HISTORY_TABLE = "cosmo_analysis_history";
const ANALYTICS_TABLE = "cosmo_analysis_analytics";
const ANALYTICS_VIEW = "cosmo_analysis_analytics_snapshot";
const RATE_LIMIT_TABLE = "cosmo_rate_limits";
const MAX_SUMMARY_TITLE_LENGTH = 120;
const MAX_SUMMARY_COPY_LENGTH = 420;
const MAX_PRODUCT_NAME_LENGTH = 120;
const MAX_ANALYSIS_PAYLOAD_BYTES = 90 * 1024;

type EnvConfig = {
  supabaseUrl: string;
  secretKey: string;
  serviceRoleKey: string;
  publishableKey: string;
  anonKey: string;
  configured: boolean;
  publicConfigured: boolean;
};

type HistoryInsert = {
  mode: "photo" | "manual" | "demo";
  overallVerdict: "good" | "caution" | "bad";
  summaryTitle: string;
  summaryCopy: string;
  product1Name: string;
  product2Name: string;
  analysisPayload: Record<string, unknown>;
};

type AnalyticsInsert = {
  sessionId: string;
  userId?: string | null;
  mode: "photo" | "manual" | "demo";
  overallVerdict: "good" | "caution" | "bad";
  sourceCount: number;
  conflictCount: number;
  cautionCount: number;
  synergyCount: number;
};

type AuthenticatedUser = {
  id: string;
  email: string;
  provider: string;
};

type AnalyticsSnapshot = {
  total_analyses: number;
  analyses_today: number;
  analyses_last_7_days: number;
  photo_analyses: number;
  manual_analyses: number;
  good_results: number;
  caution_results: number;
  bad_results: number;
  avg_source_count: number;
  last_analysis_at: string | null;
};

export type ServerRateLimitResult = {
  allowed: boolean;
  persisted: boolean;
  remaining: number;
  resetAt: string;
};

function getEnvConfig(): EnvConfig {
  const supabaseUrl = (process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const secretKey = (process.env.SUPABASE_SECRET_KEY || "").trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const publishableKey = (process.env.SUPABASE_PUBLISHABLE_KEY || "").trim();
  const anonKey = (process.env.SUPABASE_ANON_KEY || "").trim();
  const serverKey = secretKey || serviceRoleKey;
  const publicKey = publishableKey || anonKey;

  return {
    supabaseUrl,
    secretKey,
    serviceRoleKey,
    publishableKey,
    anonKey,
    configured: Boolean(supabaseUrl && serverKey),
    publicConfigured: Boolean(supabaseUrl && publicKey)
  };
}

function isJwtLike(value: string) {
  return String(value || "").trim().startsWith("eyJ");
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

async function supabaseFetch(path: string, init: RequestInit, options?: { allowMissingTable?: boolean }) {
  const env = getEnvConfig();
  if (!env.configured) {
    throw new Error("Серверное хранилище ещё не настроено.");
  }

  const serverKey = env.secretKey || env.serviceRoleKey;
  const headers = new Headers(init.headers || {});
  headers.set("apikey", serverKey);
  if (isJwtLike(serverKey)) {
    headers.set("Authorization", `Bearer ${serverKey}`);
  }

  const response = await fetch(`${env.supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers
  });

  if (options && options.allowMissingTable && response.status === 404) {
    return response;
  }

  return response;
}

function readBearerToken(request: Request) {
  const header = request.headers.get("authorization") || "";
  if (!header.toLowerCase().startsWith("bearer ")) {
    return "";
  }
  return header.slice(7).trim();
}

export function getHistoryConfigStatus() {
  return getEnvConfig().configured;
}

export function getPublicAuthConfig() {
  const env = getEnvConfig();
  return {
    configured: env.publicConfigured,
    supabaseUrl: env.supabaseUrl,
    supabaseAnonKey: env.publishableKey || env.anonKey
  };
}

export async function resolveAuthenticatedUser(request: Request) {
  const env = getEnvConfig();
  const token = readBearerToken(request);

  if ((!env.publicConfigured && !env.configured) || !token) {
    return null;
  }

  const publicKey = env.publishableKey || env.anonKey || env.secretKey || env.serviceRoleKey;

  const response = await fetch(`${env.supabaseUrl}/auth/v1/user`, {
    method: "GET",
    headers: {
      apikey: publicKey,
      Authorization: `Bearer ${token}`,
      Accept: "application/json"
    }
  });

  if (response.status === 401 || response.status === 403) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Не удалось проверить текущий сеанс.");
  }

  const payload = await response.json().catch(() => ({}));
  if (!payload || typeof payload !== "object" || typeof payload.id !== "string") {
    return null;
  }

  const input = payload as Record<string, unknown>;
  const appMetaData = input.app_metadata && typeof input.app_metadata === "object"
    ? input.app_metadata as Record<string, unknown>
    : {};

  return {
    id: String(input.id),
    email: String(input.email || ""),
    provider: String(appMetaData.provider || "email")
  } satisfies AuthenticatedUser;
}

function encodedSize(value: string) {
  return new TextEncoder().encode(value).length;
}

function ensureTextLimit(label: string, value: string, maxLength: number) {
  if (!value) {
    throw new Error(`Нужно заполнить поле «${label}».`);
  }

  if (value.length > maxLength) {
    throw new Error(`Поле «${label}» получилось слишком длинным. Сократите его и попробуйте ещё раз.`);
  }
}

function toInt(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? Math.max(0, Math.trunc(num)) : 0;
}

function getResultPayload(analysisPayload: Record<string, unknown>) {
  const result = analysisPayload.result;
  return result && typeof result === "object" ? result as Record<string, unknown> : {};
}

function collectUniqueSources(result: Record<string, unknown>) {
  const buckets = ["conflicts", "cautions", "synergies"]
    .map((key) => result[key])
    .filter(Array.isArray) as Array<Array<Record<string, unknown>>>;

  const values = new Set<string>();
  buckets.forEach((bucket) => {
    bucket.forEach((item) => {
      const rule = item.rule && typeof item.rule === "object"
        ? item.rule as Record<string, unknown>
        : null;
      const source = rule ? rule.source : null;
      if (typeof source === "string" && source.trim()) {
        values.add(source.trim());
      }
    });
  });

  return values.size;
}

export async function fetchHistory(userId: string) {
  const params = new URLSearchParams({
    select: "id,mode,overall_verdict,summary_title,summary_copy,product_1_name,product_2_name,analysis_payload,created_at",
    user_id: `eq.${userId}`,
    order: "created_at.desc",
    limit: "12"
  });

  const response = await supabaseFetch(`${HISTORY_TABLE}?${params.toString()}`, {
    method: "GET",
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error("Не удалось загрузить историю рекомендаций.");
  }

  return response.json();
}

export async function deleteUserHistory(userId: string) {
  const response = await supabaseFetch(`${HISTORY_TABLE}?user_id=eq.${userId}`, {
    method: "DELETE",
    headers: {
      Prefer: "return=minimal"
    }
  });

  if (!response.ok) {
    throw new Error("Не удалось очистить историю рекомендаций.");
  }
}

export async function insertHistory(userId: string, payload: HistoryInsert) {
  const response = await supabaseFetch(HISTORY_TABLE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify([
      {
        session_id: userId,
        user_id: userId,
        mode: payload.mode,
        overall_verdict: payload.overallVerdict,
        summary_title: payload.summaryTitle,
        summary_copy: payload.summaryCopy,
        product_1_name: payload.product1Name,
        product_2_name: payload.product2Name,
        analysis_payload: payload.analysisPayload
      }
    ])
  });

  if (!response.ok) {
    throw new Error("Не удалось сохранить рекомендацию в истории.");
  }

  const rows = await response.json();
  return Array.isArray(rows) ? rows[0] || null : rows;
}

export function buildAnalyticsPayload(userId: string, payload: HistoryInsert): AnalyticsInsert {
  const result = getResultPayload(payload.analysisPayload);
  const conflicts = Array.isArray(result.conflicts) ? result.conflicts : [];
  const cautions = Array.isArray(result.cautions) ? result.cautions : [];
  const synergies = Array.isArray(result.synergies) ? result.synergies : [];

  return {
    sessionId: userId,
    userId,
    mode: payload.mode,
    overallVerdict: payload.overallVerdict,
    sourceCount: collectUniqueSources(result),
    conflictCount: toInt(conflicts.length),
    cautionCount: toInt(cautions.length),
    synergyCount: toInt(synergies.length)
  };
}

export async function insertAnalytics(payload: AnalyticsInsert) {
  const response = await supabaseFetch(ANALYTICS_TABLE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify([
      {
        session_id: payload.sessionId,
        user_id: payload.userId || null,
        mode: payload.mode,
        overall_verdict: payload.overallVerdict,
        source_count: payload.sourceCount,
        conflict_count: payload.conflictCount,
        caution_count: payload.cautionCount,
        synergy_count: payload.synergyCount
      }
    ])
  });

  if (!response.ok) {
    throw new Error("Не удалось сохранить внутреннюю статистику.");
  }
}

export async function fetchAnalyticsSummary() {
  const response = await supabaseFetch(`${ANALYTICS_VIEW}?select=*`, {
    method: "GET",
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error("Не удалось загрузить внутреннюю статистику.");
  }

  const rows = await response.json();
  const row = Array.isArray(rows) ? rows[0] || {} : rows || {};

  return {
    totalAnalyses: toInt((row as AnalyticsSnapshot).total_analyses),
    analysesToday: toInt((row as AnalyticsSnapshot).analyses_today),
    analysesLast7Days: toInt((row as AnalyticsSnapshot).analyses_last_7_days),
    photoAnalyses: toInt((row as AnalyticsSnapshot).photo_analyses),
    manualAnalyses: toInt((row as AnalyticsSnapshot).manual_analyses),
    goodResults: toInt((row as AnalyticsSnapshot).good_results),
    cautionResults: toInt((row as AnalyticsSnapshot).caution_results),
    badResults: toInt((row as AnalyticsSnapshot).bad_results),
    avgSourceCount: Number((row as AnalyticsSnapshot).avg_source_count || 0),
    lastAnalysisAt: typeof (row as AnalyticsSnapshot).last_analysis_at === "string"
      ? (row as AnalyticsSnapshot).last_analysis_at
      : null
  };
}

export function parseHistoryPayload(body: unknown): HistoryInsert {
  const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const mode = input.mode;
  const overallVerdict = input.overallVerdict;
  const summaryTitle = String(input.summaryTitle || "").trim();
  const summaryCopy = String(input.summaryCopy || "").trim();
  const product1Name = String(input.product1Name || "").trim();
  const product2Name = String(input.product2Name || "").trim();
  const analysisPayload = input.analysisPayload;

  if (mode !== "photo" && mode !== "manual" && mode !== "demo") {
    throw new Error("Не удалось распознать режим этого разбора.");
  }

  if (overallVerdict !== "good" && overallVerdict !== "caution" && overallVerdict !== "bad") {
    throw new Error("Не удалось сохранить итоговую оценку этой пары.");
  }

  ensureTextLimit("краткий вывод", summaryTitle, MAX_SUMMARY_TITLE_LENGTH);
  ensureTextLimit("объяснение", summaryCopy, MAX_SUMMARY_COPY_LENGTH);
  ensureTextLimit("название первого средства", product1Name, MAX_PRODUCT_NAME_LENGTH);
  ensureTextLimit("название второго средства", product2Name, MAX_PRODUCT_NAME_LENGTH);

  if (!analysisPayload || typeof analysisPayload !== "object") {
    throw new Error("Не хватает данных для сохранения разбора.");
  }

  const serializedPayload = JSON.stringify(analysisPayload);
  if (!serializedPayload) {
    throw new Error("Не хватает данных для сохранения разбора.");
  }

  if (encodedSize(serializedPayload) > MAX_ANALYSIS_PAYLOAD_BYTES) {
    throw new Error("Этот разбор получился слишком объёмным для сохранения. Попробуйте собрать его заново.");
  }

  return {
    mode,
    overallVerdict,
    summaryTitle,
    summaryCopy,
    product1Name,
    product2Name,
    analysisPayload: analysisPayload as Record<string, unknown>
  };
}

async function upsertRateLimitRecord(scopeKey: string, bucket: string, hits: number, expiresAt: string) {
  const response = await supabaseFetch(RATE_LIMIT_TABLE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal"
    },
    body: JSON.stringify([
      {
        scope_key: scopeKey,
        bucket,
        hits,
        expires_at: expiresAt,
        updated_at: new Date().toISOString()
      }
    ])
  }, {
    allowMissingTable: true
  });

  return response;
}

export async function consumeServerRateLimit(scopeKey: string, bucket: string, maxHits: number, windowSeconds: number): Promise<ServerRateLimitResult> {
  const normalizedKey = String(scopeKey || "").trim().slice(0, 180);
  const now = Date.now();
  const nextResetAt = new Date(now + windowSeconds * 1000).toISOString();

  if (!normalizedKey) {
    return {
      allowed: true,
      persisted: false,
      remaining: Math.max(0, maxHits - 1),
      resetAt: nextResetAt
    };
  }

  try {
    const response = await supabaseFetch(
      `${RATE_LIMIT_TABLE}?select=scope_key,hits,expires_at&scope_key=eq.${encodeURIComponent(normalizedKey)}&limit=1`,
      {
        method: "GET",
        headers: {
          Accept: "application/json"
        }
      },
      {
        allowMissingTable: true
      }
    );

    if (response.status === 404) {
      return {
        allowed: true,
        persisted: false,
        remaining: Math.max(0, maxHits - 1),
        resetAt: nextResetAt
      };
    }

    if (!response.ok) {
      throw new Error("Rate limit read failed");
    }

    const rows = await response.json().catch(() => []);
    const row = Array.isArray(rows) ? rows[0] || null : null;
    const expiresAt = row && typeof row.expires_at === "string" ? Date.parse(row.expires_at) : NaN;
    const hasExpiredWindow = !row || !Number.isFinite(expiresAt) || expiresAt <= now;

    if (hasExpiredWindow) {
      const upsert = await upsertRateLimitRecord(normalizedKey, bucket, 1, nextResetAt);
      if (upsert.status === 404) {
        return {
          allowed: true,
          persisted: false,
          remaining: Math.max(0, maxHits - 1),
          resetAt: nextResetAt
        };
      }

      if (!upsert.ok) {
        throw new Error("Rate limit upsert failed");
      }

      return {
        allowed: true,
        persisted: true,
        remaining: Math.max(0, maxHits - 1),
        resetAt: nextResetAt
      };
    }

    const currentHits = Math.max(0, Number(row.hits || 0));
    if (currentHits >= maxHits) {
      return {
        allowed: false,
        persisted: true,
        remaining: 0,
        resetAt: row.expires_at
      };
    }

    const nextHits = currentHits + 1;
    const patch = await supabaseFetch(`${RATE_LIMIT_TABLE}?scope_key=eq.${encodeURIComponent(normalizedKey)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify({
        hits: nextHits,
        updated_at: new Date().toISOString()
      })
    }, {
      allowMissingTable: true
    });

    if (patch.status === 404) {
      return {
        allowed: true,
        persisted: false,
        remaining: Math.max(0, maxHits - nextHits),
        resetAt: row.expires_at
      };
    }

    if (!patch.ok) {
      throw new Error("Rate limit patch failed");
    }

    return {
      allowed: true,
      persisted: true,
      remaining: Math.max(0, maxHits - nextHits),
      resetAt: row.expires_at
    };
  } catch {
    return {
      allowed: true,
      persisted: false,
      remaining: Math.max(0, maxHits - 1),
      resetAt: nextResetAt
    };
  }
}
