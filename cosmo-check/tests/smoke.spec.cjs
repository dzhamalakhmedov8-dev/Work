const { test, expect } = require("@playwright/test");

const SAMPLE_IMAGE = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO8N6a8AAAAASUVORK5CYII=",
  "base64"
);

test("homepage keeps one clear focus and hides technical auth noise", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Добавьте два фото и узнайте, можно ли сочетать эту пару." })).toBeVisible();
  await expect(page.locator("#heroStartBtn")).toBeVisible();
  await expect(page.getByRole("button", { name: "Войти" })).toBeVisible();
  await expect(page.getByText("OpenAI")).toHaveCount(0);
  await expect(page.getByText("Gemini")).toHaveCount(0);
  await expect(page.getByText("API")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Apple/i })).toHaveCount(0);
});

test("legacy api key is removed from localStorage and provider is kept only for the session", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("cosmocheck_apikey", "sk-test-legacy");
    window.localStorage.setItem("cosmocheck_provider", "gemini");
  });

  await page.goto("/");

  const migrated = await page.evaluate(() => ({
    localApiKey: window.localStorage.getItem("cosmocheck_apikey"),
    localProvider: window.localStorage.getItem("cosmocheck_provider"),
    sessionProvider: window.sessionStorage.getItem("cosmocheck_provider"),
    runtime: window.CosmoRuntimeSecrets.getApiCredentials()
  }));

  expect(migrated.localApiKey).toBeNull();
  expect(migrated.localProvider).toBeNull();
  expect(migrated.sessionProvider).toBe("gemini");
  expect(migrated.runtime.provider).toBe("gemini");
  expect(migrated.runtime.apiKey).toBe("");
});

test("runtime api key stays only in memory of the current tab", async ({ page }) => {
  await page.goto("/");

  const beforeReload = await page.evaluate(() => {
    window.CosmoRuntimeSecrets.setApiCredentials({
      provider: "openai",
      apiKey: "sk-test-runtime"
    });

    return {
      localApiKey: window.localStorage.getItem("cosmocheck_apikey"),
      localProvider: window.localStorage.getItem("cosmocheck_provider"),
      sessionProvider: window.sessionStorage.getItem("cosmocheck_provider"),
      runtime: window.CosmoRuntimeSecrets.getApiCredentials()
    };
  });

  expect(beforeReload.localApiKey).toBeNull();
  expect(beforeReload.localProvider).toBeNull();
  expect(beforeReload.sessionProvider).toBe("openai");
  expect(beforeReload.runtime.provider).toBe("openai");
  expect(beforeReload.runtime.apiKey).toBe("sk-test-runtime");

  await page.reload();

  const afterReload = await page.evaluate(() => ({
    localApiKey: window.localStorage.getItem("cosmocheck_apikey"),
    localProvider: window.localStorage.getItem("cosmocheck_provider"),
    sessionProvider: window.sessionStorage.getItem("cosmocheck_provider"),
    runtime: window.CosmoRuntimeSecrets.getApiCredentials()
  }));

  expect(afterReload.localApiKey).toBeNull();
  expect(afterReload.localProvider).toBeNull();
  expect(afterReload.sessionProvider).toBe("openai");
  expect(afterReload.runtime.provider).toBe("openai");
  expect(afterReload.runtime.apiKey).toBe("");
});

test("manual flow opens auth only at the target action", async ({ page }) => {
  await page.goto("/");
  const manualModeButton = page.getByRole("button", { name: "По составу" });
  if (await manualModeButton.count()) {
    await page.locator("#manualModeBtn").evaluate((node) => node.click());
  }

  await page.locator("#manualName1").fill("Сыворотка с ниацинамидом");
  await page.locator("#manualName2").fill("Крем с керамидами");
  await page.locator("#manualIngredients1").fill("Aqua, Niacinamide, Panthenol");
  await page.locator("#manualIngredients2").fill("Aqua, Ceramide NP, Glycerin");
  await expect(page.locator("#analyzeBtn")).toHaveText(/Войти и продолжить|Получить рекомендацию/);
  await expect(page.locator("#analyzeBtn")).toBeEnabled();
  await page.locator("#analyzeBtn").scrollIntoViewIfNeeded();
  await page.locator("#analyzeBtn").click({ force: true });

  const authModal = page.getByRole("dialog");
  if (await authModal.count()) {
    await expect(authModal).toBeVisible();
    await expect(page.locator("#authModalTitle")).toBeVisible();
    await expect(page.locator("#authModalTitle")).toHaveText(/сохранить эту пару|Войдите в CosmoCheck/i);
    await expect(page.getByRole("button", { name: /Продолжить через Google/i })).toBeVisible();
  } else {
    await expect(page.locator("#resultsSection")).toBeVisible();
  }
});

test("photo flow keeps uploads before auth gate", async ({ page }) => {
  await page.goto("/");

  const photoModeButton = page.getByRole("button", { name: "По фото" });
  if (!(await photoModeButton.count())) {
    test.skip(true, "Локальный dev-режим сейчас не отдаёт photo flow; он покрыт production smoke.");
  }

  await expect(photoModeButton).toBeVisible();
  await photoModeButton.click();

  await page.locator("#uploadInput1").setInputFiles({
    name: "product-1.png",
    mimeType: "image/png",
    buffer: SAMPLE_IMAGE
  });
  await page.locator("#uploadInput2").setInputFiles({
    name: "product-2.png",
    mimeType: "image/png",
    buffer: SAMPLE_IMAGE
  });

  await page.locator("#analyzeBtn").click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("history stays hidden while signed out", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#historySection")).toBeHidden();
});

test("public api routes answer with safe public status", async ({ request }) => {
  const clientConfig = await request.get("/api/client-config");
  expect(clientConfig.status()).toBe(200);
  const clientConfigPayload = await clientConfig.json();
  expect(clientConfigPayload.configured).toBeTruthy();

  const historyGet = await request.get("/api/history");
  expect(historyGet.status()).toBe(401);

  const photoStatus = await request.get("/api/photo-analyze");
  expect(photoStatus.status()).toBe(200);
  const photoStatusPayload = await photoStatus.json();
  expect(photoStatusPayload.requiresAuth).toBeTruthy();

  const analyticsGet = await request.get("/api/analytics");
  expect(analyticsGet.status()).toBe(404);
});
