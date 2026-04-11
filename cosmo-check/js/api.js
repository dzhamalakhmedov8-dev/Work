(function() {
  "use strict";

  let authToken = "";
  const MAX_INPUT_FILE_BYTES = 12 * 1024 * 1024;
  const MAX_OUTPUT_FILE_BYTES = 2 * 1024 * 1024;
  const MAX_IMAGE_DIMENSION = 1600;
  const PHOTO_ANALYZE_ENDPOINT = "/api/photo-analyze";
  const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";
  const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
  const OPENAI_MODEL = "gpt-4o-mini";
  const SUPPORTED_PRODUCT_TYPES = new Set(["serum", "cream", "toner", "cleanser", "mask", "spf", "other"]);
  const MIN_INGREDIENTS_FOR_CONFIDENT_READ = 5;
  const OCR_SYSTEM_PROMPT = [
    "Ты читаешь только то, что действительно видно на фото косметического средства.",
    "Твоя задача: вернуть исключительно JSON с максимально буквальным чтением состава.",
    "Никогда не додумывай ингредиенты по бренду, типу продукта, упаковке, цвету банки, типичной формуле или обрывкам слов.",
    "Если слово читается неуверенно, не включай его в ingredients.",
    "Если видна только часть состава, верни только уверенно читаемые ингредиенты.",
    "Если состав не читается, верни ingredients: [] и confidence <= 0.25.",
    "identified=true допустим только если на фото реально читается состав или достаточно контекста продукта.",
    "brand и product_name возвращай только если они действительно видны.",
    "active_ingredients включай только если они прямо присутствуют среди уверенно прочитанных ingredients.",
    "Никакого текста вне JSON."
  ].join("\n");
  const OCR_USER_PROMPT = [
    "Прочитай фото косметического средства и верни только JSON.",
    "Если фото нечитаемое или текст размыт, не угадывай и не восстанавливай недостающие ингредиенты.",
    "Верни JSON такого вида:",
    '{"product_name":"","brand":"","identified":false,"ingredients":[],"active_ingredients":[],"product_type":"other","confidence":0.0}'
  ].join("\n");

  function setAuthToken(token) {
    authToken = String(token || "").trim();
  }

  function buildHeaders(input) {
    const headers = new Headers(input || {});
    if (authToken) {
      headers.set("Authorization", `Bearer ${authToken}`);
    }
    return headers;
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || "");
        resolve(result.split(",")[1] || "");
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function loadImage(blob) {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(blob);
      const image = new Image();

      image.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Не удалось подготовить это фото."));
      };
      image.src = objectUrl;
    });
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Не удалось подготовить это фото."));
          return;
        }
        resolve(blob);
      }, type, quality);
    });
  }

  function normalizeFileName(name) {
    const stem = String(name || "photo")
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[^\w\-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    return `${stem || "photo"}.jpg`;
  }

  async function prepareImageFile(file) {
    if (!file || !String(file.type || "").startsWith("image/")) {
      throw new Error("Для этого шага нужен файл изображения.");
    }

    if (file.size > MAX_INPUT_FILE_BYTES) {
      throw new Error("Фото получилось слишком тяжёлым. Выберите изображение до 12 МБ.");
    }

    const sourceImage = await loadImage(file);
    const largestSide = Math.max(sourceImage.naturalWidth || sourceImage.width, sourceImage.naturalHeight || sourceImage.height);
    const scale = largestSide > MAX_IMAGE_DIMENSION ? MAX_IMAGE_DIMENSION / largestSide : 1;
    const targetWidth = Math.max(1, Math.round((sourceImage.naturalWidth || sourceImage.width) * scale));
    const targetHeight = Math.max(1, Math.round((sourceImage.naturalHeight || sourceImage.height) * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Не удалось подготовить это фото.");
    }

    context.drawImage(sourceImage, 0, 0, targetWidth, targetHeight);

    let quality = 0.88;
    let preparedBlob = await canvasToBlob(canvas, "image/jpeg", quality);
    while (preparedBlob.size > MAX_OUTPUT_FILE_BYTES && quality > 0.58) {
      quality -= 0.08;
      preparedBlob = await canvasToBlob(canvas, "image/jpeg", quality);
    }

    if (preparedBlob.size > MAX_OUTPUT_FILE_BYTES) {
      throw new Error("Фото всё ещё получилось слишком тяжёлым. Попробуйте более лёгкий кадр.");
    }

    const preparedFile = new File([preparedBlob], normalizeFileName(file.name), {
      type: preparedBlob.type || "image/jpeg"
    });

    return {
      file: preparedFile,
      previewUrl: URL.createObjectURL(preparedFile),
      base64: await fileToBase64(preparedFile),
      mimeType: preparedFile.type,
      originalSize: file.size,
      preparedSize: preparedFile.size
    };
  }

  function readRuntimeSecrets() {
    const providerPreference = window.CosmoRuntimeSecrets && typeof window.CosmoRuntimeSecrets.getProviderPreference === "function"
      ? window.CosmoRuntimeSecrets.getProviderPreference()
      : "";
    const credentials = window.CosmoRuntimeSecrets && typeof window.CosmoRuntimeSecrets.getApiCredentials === "function"
      ? window.CosmoRuntimeSecrets.getApiCredentials()
      : null;

    return {
      provider: String((credentials && credentials.provider) || providerPreference || "").trim().toLowerCase(),
      apiKey: String(credentials && credentials.apiKey ? credentials.apiKey : "").trim()
    };
  }

  function clampConfidence(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return 0;
    }
    return Math.min(1, Math.max(0, numeric));
  }

  function sanitizeText(value, maxLength = 160) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maxLength);
  }

  function sanitizeIngredientList(input) {
    const values = Array.isArray(input)
      ? input
      : typeof input === "string"
        ? input.split(/[\n,;]+/)
        : [];

    const seen = new Set();
    return values
      .map((item) => sanitizeText(item, 120))
      .filter((item) => {
        if (!item) {
          return false;
        }
        const key = item.toLowerCase();
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      })
      .slice(0, 120);
  }

  function normalizeProductType(value) {
    const normalized = sanitizeText(value, 40).toLowerCase();
    return SUPPORTED_PRODUCT_TYPES.has(normalized) ? normalized : "other";
  }

  function normalizeAnalysisPayload(input) {
    const payload = input && typeof input === "object" ? input : {};
    const ingredients = sanitizeIngredientList(payload.ingredients);
    const activeIngredients = sanitizeIngredientList(payload.active_ingredients).filter((item) =>
      ingredients.some((ingredient) => ingredient.toLowerCase() === item.toLowerCase())
    );
    const productName = sanitizeText(payload.product_name, 160);
    const brand = sanitizeText(payload.brand, 120);
    const identified = Boolean(payload.identified) && (ingredients.length > 0 || Boolean(productName || brand));
    let confidence = clampConfidence(payload.confidence);

    if (!identified || ingredients.length === 0) {
      confidence = Math.min(confidence, 0.25);
    } else if (ingredients.length < MIN_INGREDIENTS_FOR_CONFIDENT_READ) {
      confidence = Math.min(confidence, 0.74);
    }

    return {
      product_name: productName,
      brand,
      identified,
      ingredients,
      active_ingredients: activeIngredients,
      product_type: normalizeProductType(payload.product_type),
      confidence
    };
  }

  function getProviderLabel(provider) {
    if (provider === "openai") {
      return "OpenAI";
    }
    if (provider === "gemini") {
      return "Gemini";
    }
    if (provider === "openrouter") {
      return "OpenRouter";
    }
    return "модель";
  }

  function detectProvider(apiKey, preferredProvider) {
    const explicit = sanitizeText(preferredProvider, 40).toLowerCase();
    const key = String(apiKey || "").trim();

    if (explicit === "openai" || explicit === "gemini" || explicit === "openrouter") {
      return {
        provider: explicit,
        source: "preference",
        formatLikely: key.length > 0
      };
    }

    if (!key) {
      return {
        provider: "unknown",
        source: "empty",
        formatLikely: false
      };
    }

    if (/^sk-or-v1-/i.test(key)) {
      return {
        provider: "openrouter",
        source: "prefix",
        formatLikely: true
      };
    }

    if (/^AIza[0-9A-Za-z\-_]{20,}$/i.test(key)) {
      return {
        provider: "gemini",
        source: "prefix",
        formatLikely: true
      };
    }

    if (/^sk-(proj-|live-|test-|[A-Za-z0-9])/.test(key)) {
      return {
        provider: "openai",
        source: "prefix",
        formatLikely: true
      };
    }

    return {
      provider: "unknown",
      source: "unknown",
      formatLikely: false
    };
  }

  function validateApiKey(apiKey, preferredProvider) {
    const trimmed = String(apiKey || "").trim();
    const detected = detectProvider(trimmed, preferredProvider);
    const hasValue = Boolean(trimmed);
    const canAttemptRequest = hasValue && detected.provider !== "unknown";

    return {
      ok: canAttemptRequest,
      provider: detected.provider,
      hasValue,
      formatLikelyValid: detected.formatLikely,
      validationLevel: "format-only",
      message: !hasValue
        ? "Ключ не указан."
        : canAttemptRequest
          ? `Похоже на ключ ${getProviderLabel(detected.provider)}, но это только проверка формата, не реальной валидности.`
          : "По одному формату нельзя понять, к какому провайдеру относится этот ключ."
    };
  }

  async function readResponsePayload(response) {
    const text = await response.text().catch(() => "");
    if (!text) {
      return {
        text: "",
        json: null
      };
    }

    try {
      return {
        text,
        json: JSON.parse(text)
      };
    } catch (error) {
      return {
        text,
        json: null
      };
    }
  }

  function extractMessageFromPayload(payload, fallback) {
    if (payload && typeof payload === "object") {
      if (typeof payload.error === "string" && payload.error.trim()) {
        return payload.error.trim();
      }
      if (payload.error && typeof payload.error.message === "string" && payload.error.message.trim()) {
        return payload.error.message.trim();
      }
      if (typeof payload.message === "string" && payload.message.trim()) {
        return payload.message.trim();
      }
    }
    return fallback;
  }

  function stripCodeFences(text) {
    return String(text || "")
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();
  }

  function extractFirstJsonObject(raw) {
    const text = stripCodeFences(raw);
    const start = text.indexOf("{");
    if (start === -1) {
      return "";
    }

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = start; index < text.length; index += 1) {
      const char = text[index];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === "\"") {
          inString = false;
        }
        continue;
      }

      if (char === "\"") {
        inString = true;
        continue;
      }

      if (char === "{") {
        depth += 1;
      } else if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          return text.slice(start, index + 1);
        }
      }
    }

    return "";
  }

  function parseModelJson(raw) {
    const candidate = extractFirstJsonObject(raw);
    if (!candidate) {
      throw new Error("Не удалось разобрать ответ модели. Попробуйте более чёткое фото.");
    }

    try {
      return JSON.parse(candidate);
    } catch (error) {
      throw new Error("Ответ модели пришёл в неожиданном формате. Попробуйте другое фото.");
    }
  }

  function extractOpenAIText(payload) {
    const content = payload && payload.choices && payload.choices[0] && payload.choices[0].message
      ? payload.choices[0].message.content
      : "";

    if (typeof content === "string") {
      return content;
    }

    if (Array.isArray(content)) {
      return content
        .map((item) => {
          if (typeof item === "string") {
            return item;
          }
          if (item && typeof item.text === "string") {
            return item.text;
          }
          return "";
        })
        .join("\n")
        .trim();
    }

    return "";
  }

  function extractGeminiText(payload) {
    const parts = payload && payload.candidates && payload.candidates[0] && payload.candidates[0].content
      ? payload.candidates[0].content.parts
      : null;

    if (!Array.isArray(parts)) {
      return "";
    }

    return parts
      .map((part) => (part && typeof part.text === "string" ? part.text : ""))
      .join("\n")
      .trim();
  }

  function buildDirectModeError(provider, responsePayload, fallbackMessage) {
    if (provider === "openai" && responsePayload && responsePayload.error && responsePayload.error.code === "invalid_api_key") {
      return "Не удалось продолжить: ключ OpenAI не подошёл.";
    }
    if (provider === "gemini" && responsePayload && responsePayload.error && Number(responsePayload.error.code) === 400) {
      return "Не удалось продолжить: проверьте ключ Gemini и попробуйте ещё раз.";
    }
    return extractMessageFromPayload(responsePayload, fallbackMessage);
  }

  function shouldFallbackToDirectFromProxy(response, payload) {
    if (!response) {
      return true;
    }

    if ([404, 405, 500, 502, 503, 504].includes(response.status)) {
      return true;
    }

    if (payload && payload.available === false && response.status !== 401) {
      return true;
    }

    return false;
  }

  async function fetchPhotoAvailability() {
    const response = await fetch(PHOTO_ANALYZE_ENDPOINT, {
      method: "GET",
      credentials: "include",
      headers: buildHeaders({
        Accept: "application/json"
      })
    });

    const { json } = await readResponsePayload(response);
    const payload = json || { available: false };
    if (!response.ok) {
      throw new Error(extractMessageFromPayload(payload, "Не удалось проверить доступность фото-разбора."));
    }

    return payload;
  }

  async function requestPhotoAnalysisViaProxy(imageBase64, mimeType, options) {
    const response = await fetch(PHOTO_ANALYZE_ENDPOINT, {
      method: "POST",
      signal: options.signal,
      credentials: "include",
      headers: buildHeaders({
        "Content-Type": "application/json",
        Accept: "application/json"
      }),
      body: JSON.stringify({
        imageBase64,
        mimeType
      })
    });

    const parsed = await readResponsePayload(response);
    const payload = parsed.json || {};

    if (!response.ok) {
      const error = new Error(extractMessageFromPayload(payload, "Не удалось прочитать состав по фото."));
      error.name = "ProxyPhotoAnalysisError";
      error.response = response;
      error.payload = payload;
      throw error;
    }

    if (!payload || typeof payload.analysis !== "object") {
      throw new Error("Не удалось разобрать результат чтения состава.");
    }

    return normalizeAnalysisPayload(payload.analysis);
  }

  async function requestPhotoAnalysisViaOpenAI(imageBase64, mimeType, apiKey, options) {
    const response = await fetch(OPENAI_ENDPOINT, {
      method: "POST",
      signal: options.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: OCR_SYSTEM_PROMPT
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: OCR_USER_PROMPT
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

    const parsed = await readResponsePayload(response);
    if (!response.ok) {
      throw new Error(buildDirectModeError("openai", parsed.json, "Не удалось прочитать фото через OpenAI."));
    }

    const rawText = parsed.json ? extractOpenAIText(parsed.json) : parsed.text;
    if (!rawText) {
      throw new Error("OpenAI вернул пустой ответ. Попробуйте другое фото.");
    }

    return normalizeAnalysisPayload(parseModelJson(rawText));
  }

  async function requestPhotoAnalysisViaGemini(imageBase64, mimeType, apiKey, options) {
    const response = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      signal: options.signal,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json"
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${OCR_SYSTEM_PROMPT}\n\n${OCR_USER_PROMPT}`
              },
              {
                inlineData: {
                  mimeType,
                  data: imageBase64
                }
              }
            ]
          }
        ]
      })
    });

    const parsed = await readResponsePayload(response);
    if (!response.ok) {
      throw new Error(buildDirectModeError("gemini", parsed.json, "Не удалось прочитать фото через Gemini."));
    }

    const rawText = parsed.json ? extractGeminiText(parsed.json) : parsed.text;
    if (!rawText) {
      throw new Error("Gemini вернул пустой ответ. Попробуйте другое фото.");
    }

    return normalizeAnalysisPayload(parseModelJson(rawText));
  }

  async function requestPhotoAnalysisDirect(imageBase64, mimeType, options) {
    const secrets = readRuntimeSecrets();
    const validation = validateApiKey(secrets.apiKey, secrets.provider);

    if (!validation.ok) {
      throw new Error("Для прямого фото-разбора нужен ключ подходящего провайдера в текущей вкладке.");
    }

    if (validation.provider === "openai") {
      return requestPhotoAnalysisViaOpenAI(imageBase64, mimeType, secrets.apiKey, options);
    }

    if (validation.provider === "gemini") {
      return requestPhotoAnalysisViaGemini(imageBase64, mimeType, secrets.apiKey, options);
    }

    throw new Error(`Прямой фото-разбор для ${getProviderLabel(validation.provider)} здесь пока не поддержан.`);
  }

  async function extractIngredientsFromPhoto(imageBase64, mimeType, options = {}) {
    const normalizedMimeType = String(mimeType || "image/jpeg").trim() || "image/jpeg";
    const requestOptions = options && typeof options === "object" ? options : {};
    const preferDirect = requestOptions.mode === "direct" || requestOptions.preferDirect === true;

    if (preferDirect) {
      return requestPhotoAnalysisDirect(imageBase64, normalizedMimeType, requestOptions);
    }

    try {
      return await requestPhotoAnalysisViaProxy(imageBase64, normalizedMimeType, requestOptions);
    } catch (error) {
      const hasRuntimeKey = validateApiKey(readRuntimeSecrets().apiKey, readRuntimeSecrets().provider).ok;
      const response = error && error.response ? error.response : null;
      const payload = error && error.payload ? error.payload : null;

      if (!hasRuntimeKey || !shouldFallbackToDirectFromProxy(response, payload)) {
        throw error instanceof Error ? error : new Error("Не удалось прочитать состав по фото.");
      }

      return requestPhotoAnalysisDirect(imageBase64, normalizedMimeType, requestOptions);
    }
  }

  async function fetchAnalysisHistory() {
    const response = await fetch("/api/history", {
      method: "GET",
      credentials: "include",
      headers: buildHeaders({
        Accept: "application/json"
      })
    });

    const { json } = await readResponsePayload(response);
    const payload = json || { configured: false, items: [] };
    if (!response.ok) {
      throw new Error(extractMessageFromPayload(payload, "Не удалось загрузить историю рекомендаций."));
    }

    return payload;
  }

  async function saveAnalysisHistory(entry) {
    const response = await fetch("/api/history", {
      method: "POST",
      credentials: "include",
      headers: buildHeaders({
        "Content-Type": "application/json",
        Accept: "application/json"
      }),
      body: JSON.stringify(entry)
    });

    const { json } = await readResponsePayload(response);
    const payload = json || { configured: false };
    if (!response.ok) {
      if (payload && payload.configured === false) {
        return payload;
      }
      throw new Error(extractMessageFromPayload(payload, "Не удалось сохранить рекомендацию в истории."));
    }

    return payload;
  }

  async function clearAnalysisHistory() {
    const response = await fetch("/api/history", {
      method: "DELETE",
      credentials: "include",
      headers: buildHeaders({
        Accept: "application/json"
      })
    });

    const { json } = await readResponsePayload(response);
    const payload = json || { configured: false, cleared: false };
    if (!response.ok) {
      throw new Error(extractMessageFromPayload(payload, "Не удалось очистить историю рекомендаций."));
    }

    return payload;
  }

  async function fetchPublicConfig() {
    const response = await fetch("/api/client-config", {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json"
      }
    });

    const { json } = await readResponsePayload(response);
    const payload = json || { configured: false };
    if (!response.ok) {
      throw new Error(extractMessageFromPayload(payload, "Не удалось загрузить настройки приложения."));
    }

    return payload;
  }

  window.CosmoAPI = {
    setAuthToken,
    fileToBase64,
    prepareImageFile,
    fetchPublicConfig,
    fetchPhotoAvailability,
    extractIngredientsFromPhoto,
    fetchAnalysisHistory,
    saveAnalysisHistory,
    clearAnalysisHistory,
    detectProvider,
    validateApiKey
  };
})();
