import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const envFile = path.join(cwd, ".env.local");

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .reduce((acc, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        return acc;
      }

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) {
        return acc;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");
      acc[key] = value;
      return acc;
    }, {});
}

const fileEnv = parseEnvFile(envFile);
const env = {
  ...fileEnv,
  ...process.env
};

let hasErrors = false;

function pass(message) {
  console.log(`PASS  ${message}`);
}

function fail(message) {
  hasErrors = true;
  console.error(`FAIL  ${message}`);
}

if (!String(env.SUPABASE_URL || "").trim()) {
  fail("Не найдена обязательная переменная SUPABASE_URL.");
} else {
  pass("SUPABASE_URL задана.");
}

if (!String(env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || "").trim()) {
  fail("Нужен либо SUPABASE_PUBLISHABLE_KEY, либо SUPABASE_ANON_KEY.");
} else if (String(env.SUPABASE_PUBLISHABLE_KEY || "").trim()) {
  pass("SUPABASE_PUBLISHABLE_KEY задана.");
} else {
  pass("SUPABASE_ANON_KEY задана.");
}

if (!String(env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || "").trim()) {
  fail("Нужен либо SUPABASE_SECRET_KEY, либо SUPABASE_SERVICE_ROLE_KEY.");
} else if (String(env.SUPABASE_SECRET_KEY || "").trim()) {
  pass("SUPABASE_SECRET_KEY задана.");
} else {
  pass("SUPABASE_SERVICE_ROLE_KEY задана.");
}

if (!String(env.OPENROUTER_API_KEY || "").trim()) {
  fail("Не найдена обязательная переменная OPENROUTER_API_KEY.");
} else {
  pass("OPENROUTER_API_KEY задана.");
}

try {
  const parsed = new URL(String(env.SUPABASE_URL || ""));
  if (!/^https:$/.test(parsed.protocol)) {
    fail("SUPABASE_URL должен использовать https.");
  } else {
    pass("SUPABASE_URL выглядит корректно.");
  }
} catch {
  fail("SUPABASE_URL не похож на корректный URL.");
}

if (String(env.OPENROUTER_MODEL || "").trim()) {
  pass("OPENROUTER_MODEL задана.");
}

const publicKey = env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY;

if (!hasErrors && env.SUPABASE_URL && publicKey) {
  try {
    const response = await fetch(`${String(env.SUPABASE_URL).replace(/\/+$/, "")}/auth/v1/settings`, {
      headers: {
        apikey: publicKey
      }
    });

    if (!response.ok) {
      fail(`Supabase auth settings ответил со статусом ${response.status}.`);
    } else {
      pass("Supabase auth settings доступны.");
    }
  } catch (error) {
    fail(`Не удалось проверить Supabase auth settings: ${error instanceof Error ? error.message : "неизвестная ошибка"}.`);
  }
}

if (hasErrors) {
  process.exitCode = 1;
} else {
  console.log("OK    Окружение выглядит готовым к локальному smoke-прогону.");
}
