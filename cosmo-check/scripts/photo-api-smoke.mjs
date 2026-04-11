import fs from "node:fs/promises";
import path from "node:path";

const appUrl = (process.env.COSMO_CHECK_APP_URL || "https://cosmo-check.vercel.app").replace(/\/+$/, "");
const envLocalPath = path.resolve(process.cwd(), ".env.local");

function ok(message) {
  console.log(`PASS  ${message}`);
}

function fail(message) {
  throw new Error(message);
}

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function loadEnvLocal() {
  try {
    const raw = await fs.readFile(envLocalPath, "utf8");
    return raw.split(/\r?\n/).reduce((acc, line) => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        acc[match[1]] = match[2];
      }
      return acc;
    }, {});
  } catch {
    return {};
  }
}

function includesValue(list, expected) {
  const needle = String(expected || "").trim().toLowerCase();
  return Array.isArray(list) && list.some((item) => String(item || "").trim().toLowerCase() === needle);
}

function includesText(value, expected) {
  return String(value || "").trim().toLowerCase().includes(String(expected || "").trim().toLowerCase());
}

async function createTempUser(config) {
  const email = `ocr-smoke-${crypto.randomUUID().slice(0, 10)}@example.com`;
  const password = "CosmoCheck!42";
  const headers = {
    apikey: config.supabaseAnonKey,
    Authorization: `Bearer ${config.supabaseAnonKey}`,
    "Content-Type": "application/json"
  };

  const signUp = await fetchJson(`${config.supabaseUrl}/auth/v1/signup`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email,
      password,
      data: { full_name: "OCR Smoke" }
    })
  });

  if (!signUp.response.ok) {
    fail(`Не удалось создать временного пользователя для photo smoke: ${signUp.payload?.msg || signUp.payload?.error_description || signUp.response.status}`);
  }

  let accessToken = signUp.payload?.access_token || "";
  let userId = signUp.payload?.user?.id || "";

  if (!accessToken) {
    const signIn = await fetchJson(`${config.supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email, password })
    });

    if (!signIn.response.ok || !signIn.payload?.access_token) {
      fail("Не удалось получить access token для photo smoke.");
    }

    accessToken = signIn.payload.access_token;
    userId = signIn.payload?.user?.id || userId;
  }

  return { email, userId, accessToken };
}

async function deleteTempUser(config, userId) {
  if (!userId || !config.supabaseServiceRoleKey) {
    return;
  }

  await fetch(`${config.supabaseUrl}/auth/v1/admin/users/${userId}`, {
    method: "DELETE",
    headers: {
      apikey: config.supabaseServiceRoleKey,
      Authorization: `Bearer ${config.supabaseServiceRoleKey}`
    }
  }).catch(() => null);
}

async function readFixtureBase64(fileName) {
  const fixturePath = path.resolve(process.cwd(), "test-fixtures", fileName);
  const buffer = await fs.readFile(fixturePath);
  return buffer.toString("base64");
}

async function callPhotoAnalyze(token, imageBase64, mimeType) {
  return fetchJson(`${appUrl}/api/photo-analyze`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({ imageBase64, mimeType })
  });
}

const clientConfig = await fetchJson(`${appUrl}/api/client-config`);
if (!clientConfig.response.ok || !clientConfig.payload?.configured) {
  fail("client-config не подтвердил рабочую auth-конфигурацию для photo smoke.");
}

const localEnv = await loadEnvLocal();
const config = {
  supabaseUrl: clientConfig.payload.supabaseUrl,
  supabaseAnonKey: clientConfig.payload.supabaseAnonKey,
  supabaseServiceRoleKey:
    process.env.SUPABASE_SECRET_KEY ||
    localEnv.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    localEnv.SUPABASE_SERVICE_ROLE_KEY ||
    ""
};

const tempUser = await createTempUser(config);
ok("Временный пользователь для photo smoke создан.");

try {
  const cleanImageBase64 = await readFixtureBase64("photo-ocr-clean.png");
  const cleanResult = await callPhotoAnalyze(tempUser.accessToken, cleanImageBase64, "image/png");
  if (!cleanResult.response.ok) {
    fail(`Чистая OCR-фикстура вернула ${cleanResult.response.status} вместо 200.`);
  }

  const cleanAnalysis = cleanResult.payload?.analysis || {};
  if (!includesText(cleanAnalysis.product_name, "soft barrier serum")) {
    fail("На чистой OCR-фикстуре не удалось корректно определить название продукта.");
  }
  if (!includesText(cleanAnalysis.brand, "calm skin")) {
    fail("На чистой OCR-фикстуре не удалось корректно определить бренд.");
  }
  if (!includesValue(cleanAnalysis.ingredients, "Niacinamide") || !includesValue(cleanAnalysis.ingredients, "Ceramide NP")) {
    fail("На чистой OCR-фикстуре не удалось извлечь ключевые ингредиенты.");
  }
  if (String(cleanAnalysis.product_type || "").toLowerCase() !== "serum") {
    fail("На чистой OCR-фикстуре product_type не определился как serum.");
  }
  ok("Чистая OCR-фикстура читается корректно.");

  const realisticImageBase64 = await readFixtureBase64("photo-ocr-realistic.jpg");
  const realisticResult = await callPhotoAnalyze(tempUser.accessToken, realisticImageBase64, "image/jpeg");
  if (!realisticResult.response.ok) {
    fail(`Более жизненная OCR-фикстура вернула ${realisticResult.response.status} вместо 200.`);
  }

  const realisticAnalysis = realisticResult.payload?.analysis || {};
  if (!includesText(realisticAnalysis.product_name, "soft barrier serum")) {
    fail("На более жизненной OCR-фикстуре не удалось прочитать название продукта.");
  }
  if (!includesValue(realisticAnalysis.ingredients, "niacinamide") || !includesValue(realisticAnalysis.ingredients, "citric acid")) {
    fail("На более жизненной OCR-фикстуре OCR потерял важные ингредиенты.");
  }
  if (!Array.isArray(realisticAnalysis.ingredients) || realisticAnalysis.ingredients.length < 8) {
    fail("На более жизненной OCR-фикстуре вернулось слишком мало ингредиентов.");
  }
  ok("Более жизненная OCR-фикстура читается приемлемо.");

  console.log(`OK    Photo API smoke завершён для ${appUrl}.`);
} finally {
  await deleteTempUser(config, tempUser.userId);
}
