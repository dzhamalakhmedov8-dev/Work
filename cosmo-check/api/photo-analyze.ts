import { consumeServerRateLimit, resolveAuthenticatedUser } from "./_lib/history.js";

export const runtime = "nodejs";

declare const process: {
  env: Record<string, string | undefined>;
};

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-4o-mini";
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_CONTENT_LENGTH_BYTES = 3.5 * 1024 * 1024;
const MAX_IMAGE_BYTES = 2.25 * 1024 * 1024;
const RATE_LIMIT_WINDOW_SECONDS = 10 * 60;
const RATE_LIMIT_MAX_REQUESTS = 8;

type AnalyzeRequest = {
  imageBase64: string;
  mimeType?: string;
};

type FallbackRateLimitEntry = {
  count: number;
  resetAt: number;
};

const SYSTEM_PROMPT = `Ты помогаешь аккуратно читать состав косметического средства по фотографии.

Твоя задача:
1. Если на фото читаются название продукта и бренд, верни их.
2. Извлеки список ингредиентов настолько дословно, насколько это возможно.
3. Сохрани ингредиенты в формате INCI.
4. Верни только JSON без пояснений.

Правила:
- Не выдумывай ингредиенты, если текст читается не полностью.
- Если бренд или название не видны, верни пустую строку.
- Если состав не читается, верни пустой массив ingredients.
- Не добавляй текст вне JSON.

Строго верни JSON такого вида:
{
  "product_name": "Название продукта",
  "brand": "Бренд",
  "identified": true,
  "ingredients": ["Aqua", "Niacinamide"],
  "active_ingredients": ["Niacinamide"],
  "product_type": "serum|cream|toner|cleanser|mask|spf|other",
  "confidence": 0.85
}`;

function getFallbackRateLimitStore() {
  const scope = globalThis as typeof globalThis & {
    __cosmoPhotoRateLimit?: Map<string, FallbackRateLimitEntry>;
  };

  if (!scope.__cosmoPhotoRateLimit) {
    scope.__cosmoPhotoRateLimit = new Map();
  }

  return scope.__cosmoPhotoRateLimit;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function getConfig() {
  const apiKey = (process.env.OPENROUTER_API_KEY || "").trim();
  const model = (process.env.OPENROUTER_MODEL || DEFAULT_MODEL).trim();
  const appName = (process.env.OPENROUTER_APP_NAME || "CosmoCheck").trim();
  const referer = (process.env.OPENROUTER_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || "").trim();

  return {
    apiKey,
    model,
    appName,
    referer: referer && !referer.startsWith("http") ? `https://${referer}` : referer,
    configured: Boolean(apiKey)
  };
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  ).trim();
}

function enforceContentLength(request: Request) {
  const rawLength = request.headers.get("content-length");
  if (!rawLength) {
    return;
  }

  const contentLength = Number(rawLength);
  if (Number.isFinite(contentLength) && contentLength > MAX_CONTENT_LENGTH_BYTES) {
    throw new Error("Фото получилось слишком тяжёлым. Выберите более лёгкое изображение до 3 МБ.");
  }
}

function estimateBase64Bytes(value: string) {
  const normalized = value.replace(/\s+/g, "");
  const padding = normalized.endsWith("==") ? 2 : normalized.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((normalized.length * 3) / 4) - padding);
}

function enforceFallbackRateLimit(rateLimitKey: string) {
  const store = getFallbackRateLimitStore();
  const now = Date.now();
  const current = store.get(rateLimitKey);

  if (!current || current.resetAt <= now) {
    store.set(rateLimitKey, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_SECONDS * 1000
    });
    return;
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    throw new Error("Сейчас фото-разборов слишком много. Попробуйте ещё раз чуть позже.");
  }

  current.count += 1;
  store.set(rateLimitKey, current);
}

async function enforceRateLimit(request: Request, user: { id: string }) {
  const rateLimitKey = `photo:${user.id}:${getClientIp(request)}`;
  const outcome = await consumeServerRateLimit(
    rateLimitKey,
    "photo-analysis",
    RATE_LIMIT_MAX_REQUESTS,
    RATE_LIMIT_WINDOW_SECONDS
  );

  if (!outcome.allowed) {
    throw new Error("Сейчас фото-разборов слишком много. Попробуйте ещё раз чуть позже.");
  }

  if (!outcome.persisted) {
    enforceFallbackRateLimit(rateLimitKey);
  }
}

function parseBody(body: unknown): AnalyzeRequest {
  const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const imageBase64 = String(input.imageBase64 || "").trim();
  const mimeType = String(input.mimeType || "image/jpeg").trim();

  if (!imageBase64) {
    throw new Error("Нужно добавить фото, чтобы прочитать состав.");
  }

  const normalizedMimeType = mimeType.startsWith("image/") ? mimeType : "image/jpeg";
  if (!ALLOWED_MIME_TYPES.has(normalizedMimeType)) {
    throw new Error("Для фото-разбора подходят только JPG, PNG или WebP.");
  }

  const imageBytes = estimateBase64Bytes(imageBase64);
  if (imageBytes > MAX_IMAGE_BYTES) {
    throw new Error("Фото получилось слишком тяжёлым. Уменьшите изображение и попробуйте снова.");
  }

  return {
    imageBase64,
    mimeType: normalizedMimeType
  };
}

function extractTextContent(payload: any) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((item) => (typeof item === "string" ? item : item?.text || ""))
      .join("\n");
  }
  return "";
}

function parseJsonPayload(raw: string) {
  const cleaned = String(raw || "")
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Не удалось аккуратно прочитать состав с этого фото. Попробуйте более чёткий кадр.");
  }
}

async function callOpenRouter(imageBase64: string, mimeType: string) {
  const config = getConfig();
  if (!config.configured) {
    throw new Error("Фото-разбор пока недоступен.");
  }

  const headers = new Headers({
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.apiKey}`,
    "X-Title": config.appName
  });

  if (config.referer) {
    headers.set("HTTP-Referer", config.referer);
  }

  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: config.model,
      temperature: 0.1,
      max_tokens: 1500,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Прочитай состав на фото косметического средства и верни только JSON."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
                detail: "high"
              }
            }
          ]
        }
      ]
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Сервис чтения состава сейчас недоступен.");
    }

    if (response.status === 429) {
      throw new Error("Сервис чтения состава временно перегружен. Попробуйте ещё раз чуть позже.");
    }

    throw new Error(payload?.error?.message || "Не удалось прочитать состав по фото.");
  }

  const rawContent = extractTextContent(payload);
  return parseJsonPayload(rawContent);
}

export async function GET(request: Request) {
  const config = getConfig();
  const user = await resolveAuthenticatedUser(request).catch(() => null);

  return json({
    available: Boolean(config.configured),
    authenticated: Boolean(user),
    requiresAuth: true
  });
}

export async function POST(request: Request) {
  const config = getConfig();
  if (!config.configured) {
    return json(
      {
        available: false,
        error: "Фото-разбор пока недоступен."
      },
      503
    );
  }

  const user = await resolveAuthenticatedUser(request).catch(() => null);
  if (!user) {
    return json(
      {
        available: false,
        error: "Фото-разбор доступен после входа в аккаунт."
      },
      401
    );
  }

  try {
    enforceContentLength(request);
    await enforceRateLimit(request, user);
    const body = await request.json().catch(() => null);
    const payload = parseBody(body);
    const analysis = await callOpenRouter(payload.imageBase64, payload.mimeType || "image/jpeg");

    return json({
      available: true,
      analysis
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось прочитать состав по фото.";
    const status = message.includes("тяжёл")
      ? 413
      : message.includes("слишком много")
        ? 429
        : 400;

    return json(
      {
        available: true,
        error: message
      },
      status
    );
  }
}
