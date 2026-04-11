const appUrl = (process.env.COSMO_CHECK_APP_URL || "https://cosmo-check.vercel.app").replace(/\/+$/, "");

function ok(message) {
  console.log(`PASS  ${message}`);
}

function fail(message) {
  throw new Error(message);
}

async function fetchJson(path, init) {
  const response = await fetch(`${appUrl}${path}`, init);
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

const home = await fetch(appUrl);
if (!home.ok) {
  fail(`Главная страница ответила со статусом ${home.status}.`);
}

const homeHtml = await home.text();
if (!homeHtml.includes("CosmoCheck")) {
  fail("В HTML главной страницы не найден бренд CosmoCheck.");
}
if (homeHtml.includes("Apple")) {
  fail("На публичной странице не должна отображаться кнопка Apple.");
}
if (homeHtml.includes("OpenAI") || homeHtml.includes("Gemini") || homeHtml.includes("API key")) {
  fail("На публичной странице остались технические упоминания провайдеров или ключей.");
}
ok("Главная страница открывается и не раскрывает технический шум.");

const clientConfig = await fetchJson("/api/client-config");
if (clientConfig.response.status !== 200 || !clientConfig.payload.configured) {
  fail("client-config не подтверждает рабочую публичную auth-конфигурацию.");
}
ok("client-config отвечает корректно.");

const photoStatus = await fetchJson("/api/photo-analyze");
if (photoStatus.response.status !== 200 || !photoStatus.payload.requiresAuth) {
  fail("GET /api/photo-analyze должен отвечать статусом маршрута и признаком auth-only.");
}
ok("photo-analyze status-check отвечает корректно.");

const historyGet = await fetchJson("/api/history");
if (historyGet.response.status !== 401) {
  fail(`GET /api/history без входа должен возвращать 401, а не ${historyGet.response.status}.`);
}
ok("История закрыта для гостя.");

const historyPost = await fetchJson("/api/history", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    mode: "manual",
    overallVerdict: "good",
    summaryTitle: "Можно вместе",
    summaryCopy: "Smoke check",
    product1Name: "A",
    product2Name: "B",
    analysisPayload: {
      result: {
        overallVerdict: "good"
      }
    }
  })
});
if (historyPost.response.status !== 401) {
  fail(`POST /api/history без входа должен возвращать 401, а не ${historyPost.response.status}.`);
}
ok("Гостевые записи в историю заблокированы.");

const photoPost = await fetchJson("/api/photo-analyze", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    imageBase64: "aGVsbG8=",
    mimeType: "image/jpeg"
  })
});
if (photoPost.response.status !== 401) {
  fail(`POST /api/photo-analyze без входа должен возвращать 401, а не ${photoPost.response.status}.`);
}
ok("Фото-разбор закрыт для гостя.");

const analytics = await fetchJson("/api/analytics");
if (analytics.response.status !== 404) {
  fail(`/api/analytics должен оставаться закрытым, а не отвечать ${analytics.response.status}.`);
}
ok("Внутренняя аналитика не торчит в публичном контуре.");

console.log(`OK    Production smoke завершён для ${appUrl}.`);
