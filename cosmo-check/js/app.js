(function() {
  "use strict";

  const state = {
    selectedMode: "photo",
    photoAvailable: false,
    analysisStep: "idle",
    product1: null,
    product2: null,
    authReady: false,
    authConfigured: false,
    authUser: null,
    authProfile: null,
    authModalOpen: false,
    authBusy: false,
    authIntent: "default",
    pendingPostAuthAction: null,
    abortController: null,
    runToken: 0,
    historyItems: [],
    historyConfigured: false,
    historyLoaded: false
  };

  const refs = {};
  const POST_AUTH_DRAFT_KEY = "cosmocheck-post-auth-draft";
  const LEGACY_API_KEY_STORAGE_KEY = "cosmocheck_apikey";
  const LEGACY_PROVIDER_STORAGE_KEY = "cosmocheck_provider";
  const SESSION_PROVIDER_STORAGE_KEY = "cosmocheck_provider";
  const API_STORAGE_NOTICE_SELECTOR = "[data-api-storage-note]";
  let runtimeApiKey = "";
  let runtimeApiProvider = "";
  const ui = window.CosmoUI || null;

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    if (!window.CosmoAPI || !window.CosmoCompatibility || !window.CosmoIngredients) {
      document.body.innerHTML = "<main style='padding:2rem;font-family:sans-serif'>Не удалось загрузить базовые модули CosmoCheck.</main>";
      return;
    }

    bindRefs();
    migrateLegacyApiCredentialStorage();
    restorePendingAnalyzeDraft();
    bindEvents();
    buildDemoCards();
    render();
    void bootstrapAuth();
  }

  function readStorageValue(storage, key) {
    try {
      return storage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function writeStorageValue(storage, key, value) {
    try {
      storage.setItem(key, value);
      return true;
    } catch (error) {
      return false;
    }
  }

  function removeStorageValue(storage, key) {
    try {
      storage.removeItem(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  function normalizeRuntimeProvider(provider) {
    const normalized = String(provider || "").trim().toLowerCase();
    if (normalized === "openai" || normalized === "gemini") {
      return normalized;
    }
    return "";
  }

  function updateApiStorageNotice() {
    const note = runtimeApiProvider
      ? `Ключ нужен только для этой вкладки. После перезагрузки он исчезнет, а выбранный провайдер ${runtimeApiProvider === "openai" ? "OpenAI" : "Gemini"} сохранится только до конца сессии.`
      : "Ключ нужен только для этой вкладки и не сохраняется после перезагрузки или закрытия страницы.";

    document.querySelectorAll(API_STORAGE_NOTICE_SELECTOR).forEach((node) => {
      node.textContent = note;
    });
  }

  function setRuntimeApiCredentials(input) {
    const payload = input && typeof input === "object" ? input : {};
    const nextProvider = normalizeRuntimeProvider(payload.provider);
    const nextKey = String(payload.apiKey || "").trim();

    runtimeApiProvider = nextProvider;
    runtimeApiKey = nextKey;

    if (runtimeApiProvider) {
      writeStorageValue(sessionStorage, SESSION_PROVIDER_STORAGE_KEY, runtimeApiProvider);
    } else {
      removeStorageValue(sessionStorage, SESSION_PROVIDER_STORAGE_KEY);
    }

    removeStorageValue(localStorage, LEGACY_API_KEY_STORAGE_KEY);
    removeStorageValue(localStorage, LEGACY_PROVIDER_STORAGE_KEY);
    updateApiStorageNotice();
  }

  function clearRuntimeApiCredentials() {
    runtimeApiKey = "";
    runtimeApiProvider = "";
    removeStorageValue(sessionStorage, SESSION_PROVIDER_STORAGE_KEY);
    removeStorageValue(localStorage, LEGACY_API_KEY_STORAGE_KEY);
    removeStorageValue(localStorage, LEGACY_PROVIDER_STORAGE_KEY);
    updateApiStorageNotice();
  }

  function migrateLegacyApiCredentialStorage() {
    const sessionProvider = normalizeRuntimeProvider(readStorageValue(sessionStorage, SESSION_PROVIDER_STORAGE_KEY));
    const legacyProvider = normalizeRuntimeProvider(readStorageValue(localStorage, LEGACY_PROVIDER_STORAGE_KEY));
    const providerToKeep = sessionProvider || legacyProvider;

    runtimeApiProvider = providerToKeep;
    runtimeApiKey = "";

    if (providerToKeep) {
      writeStorageValue(sessionStorage, SESSION_PROVIDER_STORAGE_KEY, providerToKeep);
    } else {
      removeStorageValue(sessionStorage, SESSION_PROVIDER_STORAGE_KEY);
    }

    removeStorageValue(localStorage, LEGACY_API_KEY_STORAGE_KEY);
    removeStorageValue(localStorage, LEGACY_PROVIDER_STORAGE_KEY);
    updateApiStorageNotice();
  }

  window.CosmoRuntimeSecrets = {
    setApiCredentials: setRuntimeApiCredentials,
    clearApiCredentials: clearRuntimeApiCredentials,
    getApiCredentials() {
      return {
        provider: runtimeApiProvider,
        apiKey: runtimeApiKey
      };
    },
    getProviderPreference() {
      return runtimeApiProvider;
    }
  };

  function bindRefs() {
    refs.accountSummary = document.getElementById("accountSummary");
    refs.accountAvatar = document.getElementById("accountAvatar");
    refs.accountName = document.getElementById("accountName");
    refs.accountEmail = document.getElementById("accountEmail");
    refs.authSignOutBtn = document.getElementById("authSignOutBtn");
    refs.headerAuthBtn = document.getElementById("headerAuthBtn");
    refs.heroStartBtn = document.getElementById("heroStartBtn");
    refs.heroPreviewBtn = document.getElementById("heroPreviewBtn");
    refs.breadcrumbMode = document.getElementById("breadcrumbMode");
    refs.modeSwitch = document.getElementById("modeSwitch");
    refs.manualModeBtn = document.getElementById("manualModeBtn");
    refs.photoModeBtn = document.getElementById("photoModeBtn");
    refs.manualWorkspace = document.getElementById("manualWorkspace");
    refs.photoWorkspace = document.getElementById("photoWorkspace");
    refs.actionStatus = document.getElementById("actionStatus");
    refs.actionStatusTitle = document.getElementById("actionStatusTitle");
    refs.actionStatusCopy = document.getElementById("actionStatusCopy");
    refs.analyzeBtn = document.getElementById("analyzeBtn");
    refs.analyzerTitle = document.getElementById("analyzerTitle");
    refs.analyzerIntro = document.getElementById("analyzerIntro");
    refs.demoGrid = document.getElementById("demoGrid");
    refs.historySection = document.getElementById("historySection");
    refs.historyLead = document.getElementById("historyLead");
    refs.historyToolbar = document.getElementById("historyToolbar");
    refs.historyNote = document.getElementById("historyNote");
    refs.historyGrid = document.getElementById("historyGrid");
    refs.clearHistoryBtn = document.getElementById("clearHistoryBtn");
    refs.newScanBtn = document.getElementById("newScanBtn");
    refs.resultsSection = document.getElementById("resultsSection");
    refs.verdictCard = document.getElementById("verdictCard");
    refs.verdictKicker = document.getElementById("verdictKicker");
    refs.verdictTitle = document.getElementById("verdictTitle");
    refs.verdictDescription = document.getElementById("verdictDescription");
    refs.routineTitle = document.getElementById("routineTitle");
    refs.routineCopy = document.getElementById("routineCopy");
    refs.whyCopy = document.getElementById("whyCopy");
    refs.productsSummary = document.getElementById("productsSummary");
    refs.interactionsContainer = document.getElementById("interactionsContainer");
    refs.sourcesList = document.getElementById("sourcesList");
    refs.progressOverlay = document.getElementById("progressOverlay");
    refs.progressCopy = document.getElementById("progressCopy");
    refs.progressSteps = Array.from(document.querySelectorAll(".progress-step"));
    refs.cancelAnalysisBtn = document.getElementById("cancelAnalysisBtn");
    refs.toastStack = document.getElementById("toastStack");
    refs.authModal = document.getElementById("authModal");
    refs.authModalTitle = document.getElementById("authModalTitle");
    refs.authCloseBtn = document.getElementById("authCloseBtn");
    refs.authGoogleBtn = document.getElementById("authGoogleBtn");
    refs.authRegisterBtn = document.getElementById("authRegisterBtn");
    refs.authLoginBtn = document.getElementById("authLoginBtn");
    refs.authStatus = document.getElementById("authStatus");
    refs.authStatusTitle = document.getElementById("authStatusTitle");
    refs.authStatusCopy = document.getElementById("authStatusCopy");
    refs.authModalCopy = document.getElementById("authModalCopy");
    refs.authName = document.getElementById("authName");
    refs.authEmail = document.getElementById("authEmail");
    refs.authPassword = document.getElementById("authPassword");
    refs.manualName1 = document.getElementById("manualName1");
    refs.manualName2 = document.getElementById("manualName2");
    refs.manualIngredients1 = document.getElementById("manualIngredients1");
    refs.manualIngredients2 = document.getElementById("manualIngredients2");
  }

  function bindEvents() {
    [refs.heroStartBtn].filter(Boolean).forEach((button) => {
      button.addEventListener("click", () => scrollToTarget("analyzerTitle"));
    });
    if (refs.headerAuthBtn) {
      refs.headerAuthBtn.addEventListener("click", () => openAuthModal("default"));
    }
    if (refs.heroStartBtn) {
      refs.heroStartBtn.addEventListener("click", () => {
        if (state.photoAvailable) {
          selectMode("photo");
        }
      });
    }
    if (refs.heroPreviewBtn) {
      refs.heroPreviewBtn.addEventListener("click", () => scrollToTarget("demoTitle"));
    }
    if (refs.authCloseBtn) {
      refs.authCloseBtn.addEventListener("click", closeAuthModal);
    }
    if (refs.authGoogleBtn) {
      refs.authGoogleBtn.addEventListener("click", () => handleSocialAuth("google"));
    }
    if (refs.authModal) {
      refs.authModal.addEventListener("click", (event) => {
        if (event.target === refs.authModal) {
          closeAuthModal();
        }
      });
    }
    if (refs.authRegisterBtn) {
      refs.authRegisterBtn.addEventListener("click", handleAuthRegister);
    }
    if (refs.authLoginBtn) {
      refs.authLoginBtn.addEventListener("click", handleAuthLogin);
    }
    if (refs.authSignOutBtn) {
      refs.authSignOutBtn.addEventListener("click", handleAuthSignOut);
    }
    if (refs.clearHistoryBtn) {
      refs.clearHistoryBtn.addEventListener("click", handleClearHistory);
    }
    refs.manualModeBtn.addEventListener("click", () => selectMode("manual"));
    refs.photoModeBtn.addEventListener("click", () => selectMode("photo"));
    refs.analyzeBtn.addEventListener("click", handleAnalyze);
    refs.cancelAnalysisBtn.addEventListener("click", cancelActiveAnalysis);
    refs.newScanBtn.addEventListener("click", resetAll);

    [1, 2].forEach((productNum) => {
      const input = document.getElementById(`uploadInput${productNum}`);
      const card = document.getElementById(`uploadCard${productNum}`);
      const selectBtn = card.querySelector(".upload-select");
      const replaceBtn = card.querySelector(".upload-replace");
      const removeBtn = card.querySelector(".upload-remove");

      selectBtn.addEventListener("click", () => triggerUpload(productNum));
      replaceBtn.addEventListener("click", () => triggerUpload(productNum));
      removeBtn.addEventListener("click", () => clearProduct(productNum));

      input.addEventListener("change", async (event) => {
        const file = event.target.files && event.target.files[0];
        if (file) {
          await handleFileUpload(file, productNum);
        }
        input.value = "";
      });
    });

    document.addEventListener("input", (event) => {
      if (
        event.target === refs.manualIngredients1 ||
        event.target === refs.manualIngredients2 ||
        event.target === refs.manualName1 ||
        event.target === refs.manualName2
      ) {
        renderActionState();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !refs.progressOverlay.hidden) {
        cancelActiveAnalysis();
        return;
      }

      if (event.key === "Escape" && state.authModalOpen) {
        closeAuthModal();
      }
    });
  }

  function getAuthIntentCopy(intent) {
    if (intent === "photo-analysis") {
      return {
        title: "Войдите, чтобы сохранить эту пару",
        copy: "Так можно спокойно вернуться к ней позже и продолжить с того же места.",
        statusTitle: "Вход займёт всего пару секунд",
        statusCopy: "После этого пара и рекомендации будут рядом в аккаунте."
      };
    }

    if (intent === "manual-analysis") {
      return {
        title: "Войдите, чтобы сохранить эту пару",
        copy: "Так готовая рекомендация останется рядом, и к ней будет легко вернуться позже.",
        statusTitle: "Вход займёт всего пару секунд",
        statusCopy: "После этого разбор и рекомендации будут рядом в аккаунте."
      };
    }

    return {
      title: "Войдите в CosmoCheck",
      copy: "Так пары средств и готовые рекомендации будут рядом, когда вы захотите к ним вернуться.",
      statusTitle: "Всё будет рядом",
      statusCopy: "Войдите удобным способом, чтобы рекомендации сохранялись в аккаунте."
    };
  }

  function serializePhotoProduct(product) {
    if (!product || !product.base64 || !product.mimeType) {
      return null;
    }

    return {
      fileName: product.file && product.file.name ? product.file.name : "photo.jpg",
      mimeType: product.mimeType,
      base64: product.base64
    };
  }

  function restorePhotoProduct(product) {
    if (!product || !product.base64 || !product.mimeType) {
      return null;
    }

    return {
      file: {
        name: product.fileName || "photo.jpg",
      },
      previewUrl: `data:${product.mimeType};base64,${product.base64}`,
      base64: product.base64,
      mimeType: product.mimeType,
      analysis: null
    };
  }

  function readManualDraft() {
    return {
      manualName1: refs.manualName1 ? refs.manualName1.value : "",
      manualName2: refs.manualName2 ? refs.manualName2.value : "",
      manualIngredients1: refs.manualIngredients1 ? refs.manualIngredients1.value : "",
      manualIngredients2: refs.manualIngredients2 ? refs.manualIngredients2.value : ""
    };
  }

  function applyManualDraft(draft) {
    if (!draft) {
      return;
    }

    if (refs.manualName1) {
      refs.manualName1.value = draft.manualName1 || "";
    }
    if (refs.manualName2) {
      refs.manualName2.value = draft.manualName2 || "";
    }
    if (refs.manualIngredients1) {
      refs.manualIngredients1.value = draft.manualIngredients1 || "";
    }
    if (refs.manualIngredients2) {
      refs.manualIngredients2.value = draft.manualIngredients2 || "";
    }
  }

  function clearPendingAnalyzeDraft() {
    try {
      sessionStorage.removeItem(POST_AUTH_DRAFT_KEY);
    } catch (error) {
      // Ignore storage cleanup errors.
    }
  }

  function persistPendingAnalyzeDraft() {
    if (!state.pendingPostAuthAction) {
      return false;
    }

    try {
      const payload = {
        pendingPostAuthAction: state.pendingPostAuthAction,
        selectedMode: state.selectedMode,
        manualDraft: readManualDraft(),
        product1: serializePhotoProduct(state.product1),
        product2: serializePhotoProduct(state.product2)
      };
      sessionStorage.setItem(POST_AUTH_DRAFT_KEY, JSON.stringify(payload));
      return true;
    } catch (error) {
      return false;
    }
  }

  function restorePendingAnalyzeDraft() {
    try {
      const raw = sessionStorage.getItem(POST_AUTH_DRAFT_KEY);
      if (!raw) {
        return;
      }

      const payload = JSON.parse(raw);
      if (!payload || !payload.pendingPostAuthAction) {
        clearPendingAnalyzeDraft();
        return;
      }

      state.pendingPostAuthAction = payload.pendingPostAuthAction;
      state.authIntent = payload.pendingPostAuthAction;
      applyManualDraft(payload.manualDraft);

      const restoredProduct1 = restorePhotoProduct(payload.product1);
      const restoredProduct2 = restorePhotoProduct(payload.product2);
      if (restoredProduct1) {
        state.product1 = restoredProduct1;
      }
      if (restoredProduct2) {
        state.product2 = restoredProduct2;
      }
      if (payload.selectedMode === "photo" || restoredProduct1 || restoredProduct2) {
        state.selectedMode = "photo";
      } else {
        state.selectedMode = "manual";
      }
    } catch (error) {
      clearPendingAnalyzeDraft();
    }
  }

  async function loadPhotoAvailability() {
    try {
      const payload = await window.CosmoAPI.fetchPhotoAvailability();
      state.photoAvailable = Boolean(payload && payload.available);
    } catch (error) {
      state.photoAvailable = false;
    } finally {
      if (!state.photoAvailable && state.selectedMode === "photo") {
        state.selectedMode = "manual";
      }
      render();
    }
  }

  async function bootstrapAuth() {
    if (!window.CosmoAuth) {
      state.authReady = true;
      state.authConfigured = false;
      renderAuthState();
      await loadHistory();
      await loadPhotoAvailability();
      return;
    }

    try {
      const snapshot = await window.CosmoAuth.init();
      applyAuthSnapshot(snapshot);
      window.CosmoAuth.subscribe(handleAuthChange);
    } catch (error) {
      state.authReady = true;
      state.authConfigured = false;
      renderAuthState();
      showToast("Сейчас не получается открыть вход. Попробуйте ещё раз чуть позже.", "error");
    }

    await loadHistory();
    await loadPhotoAvailability();
    await maybeResumePostAuthAction();
  }

  function applyAuthSnapshot(snapshot) {
    state.authReady = true;
    state.authConfigured = Boolean(snapshot && snapshot.configured);
    state.authUser = snapshot && snapshot.user ? snapshot.user : null;
    state.authProfile = snapshot && snapshot.profile ? snapshot.profile : null;
    if (state.authUser) {
      state.authBusy = false;
    }
    renderAuthState();
  }

  async function handleAuthChange(snapshot) {
    applyAuthSnapshot(snapshot);

    if (snapshot && snapshot.event === "SIGNED_IN") {
      closeAuthModal(false);
      showToast("Вы вошли в аккаунт. Рекомендации будут рядом, когда захотите к ним вернуться.", "success");
    }

    if (snapshot && snapshot.event === "SIGNED_OUT") {
      showToast("Вы вышли из аккаунта.", "success");
    }

    await loadHistory();
    await loadPhotoAvailability();
    await maybeResumePostAuthAction();
  }

  function openAuthModal(intent) {
    if (!state.authConfigured) {
      showToast("Сейчас вход временно недоступен. Попробуйте чуть позже.", "error");
      return;
    }

    state.authIntent = intent || "default";
    state.authModalOpen = true;
    applyDefaultAuthStatus(state.authIntent);
    renderAuthState();
    if (refs.authGoogleBtn && !state.authUser) {
      refs.authGoogleBtn.focus();
    }
  }

  function closeAuthModal(resetPendingAction = true) {
    state.authModalOpen = false;
    if (resetPendingAction) {
      state.pendingPostAuthAction = null;
      state.authIntent = "default";
      clearPendingAnalyzeDraft();
    }
    renderAuthState();
  }

  function getDisplayName() {
    const profileName = state.authProfile && state.authProfile.full_name ? state.authProfile.full_name : "";
    const userMeta = state.authUser && state.authUser.user_metadata && typeof state.authUser.user_metadata === "object"
      ? state.authUser.user_metadata
      : {};
    const metaName = userMeta.full_name || userMeta.name || "";
    const email = state.authUser && state.authUser.email ? state.authUser.email : "";

    return String(profileName || metaName || (email ? email.split("@")[0] : "CosmoCheck")).trim();
  }

  function getUserInitial() {
    const label = getDisplayName();
    return label ? label.charAt(0).toUpperCase() : "C";
  }

  function renderAuthState() {
    if (refs.authModal) {
      refs.authModal.hidden = !state.authModalOpen;
    }

    if (!state.authReady || !state.authConfigured) {
      if (refs.accountSummary) {
        refs.accountSummary.hidden = true;
      }
      if (refs.headerAuthBtn) {
        refs.headerAuthBtn.hidden = true;
      }
      return;
    }

    const loggedIn = Boolean(state.authUser);
    const authIntentCopy = getAuthIntentCopy(state.authIntent);

    if (refs.authModalCopy) {
      refs.authModalCopy.textContent = authIntentCopy.copy;
    }
    if (refs.authModalTitle) {
      refs.authModalTitle.textContent = authIntentCopy.title;
    }

    if (refs.accountSummary) {
      refs.accountSummary.hidden = !loggedIn;
    }
    if (refs.headerAuthBtn) {
      refs.headerAuthBtn.hidden = loggedIn;
      refs.headerAuthBtn.disabled = state.authBusy;
    }

    if (loggedIn) {
      const email = state.authUser && state.authUser.email ? state.authUser.email : "";
      refs.accountName.textContent = getDisplayName();
      refs.accountEmail.textContent = email;
      refs.accountAvatar.textContent = getUserInitial();
    }

    if (refs.authGoogleBtn) {
      refs.authGoogleBtn.disabled = state.authBusy;
      refs.authGoogleBtn.textContent = state.authBusy ? "Открываем Google…" : "Продолжить через Google";
    }

    if (refs.authRegisterBtn) {
      refs.authRegisterBtn.disabled = state.authBusy;
    }

    if (refs.authLoginBtn) {
      refs.authLoginBtn.disabled = state.authBusy;
    }
  }

  function applyDefaultAuthStatus(intent) {
    const authIntentCopy = getAuthIntentCopy(intent);
    setAuthStatus("inline-status-info", authIntentCopy.statusTitle, authIntentCopy.statusCopy);
  }

  async function maybeResumePostAuthAction() {
    if (!state.pendingPostAuthAction || !state.authUser || state.analysisStep !== "idle") {
      return;
    }

    const pendingAction = state.pendingPostAuthAction;
    if (pendingAction === "photo-analysis" && (!state.photoAvailable || !state.product1 || !state.product2)) {
      return;
    }

    if (pendingAction === "manual-analysis" && !getManualProducts()) {
      return;
    }

    state.pendingPostAuthAction = null;
    state.authIntent = "default";
    clearPendingAnalyzeDraft();
    renderAuthState();
    showToast(
      pendingAction === "photo-analysis" ? "Возвращаемся к вашей паре по фото." : "Возвращаемся к вашей паре.",
      "success"
    );

    if (pendingAction === "photo-analysis") {
      await runPhotoAnalysis();
      return;
    }

    await runManualAnalysis(getManualProducts());
  }

  function setAuthStatus(tone, title, copy) {
    if (!refs.authStatus) {
      return;
    }

    refs.authStatus.className = `inline-status ${tone}`;
    refs.authStatusTitle.textContent = title;
    refs.authStatusCopy.textContent = copy;
  }

  function formatAuthError(error, fallback) {
    const message = error instanceof Error ? String(error.message || "").trim() : "";
    const normalized = message.toLowerCase();

    if (normalized.includes("provider is not enabled") || normalized.includes("unsupported provider")) {
      return "Этот способ входа пока недоступен. Можно войти по электронной почте.";
    }

    if (normalized.includes("invalid login credentials")) {
      return "Проверьте email и пароль и попробуйте ещё раз.";
    }

    if (normalized.includes("user already registered")) {
      return "Этот email уже используется. Попробуйте просто войти в аккаунт.";
    }

    if (normalized.includes("email not confirmed")) {
      return "Сначала подтвердите адрес через письмо на почте, а затем войдите в аккаунт.";
    }

    if (normalized.includes("password should be at least")) {
      return "Пароль должен быть не короче 6 символов.";
    }

    if (normalized.includes("rate limit")) {
      return "Сейчас запросов слишком много. Попробуйте ещё раз чуть позже.";
    }

    return message || fallback;
  }

  function getAuthFormValues() {
    return {
      fullName: refs.authName.value.trim(),
      email: refs.authEmail.value.trim(),
      password: refs.authPassword.value
    };
  }

  async function handleAuthRegister() {
    const form = getAuthFormValues();
    if (!form.email || !form.password) {
      setAuthStatus("inline-status-warning", "Нужны email и пароль.", "Добавьте оба поля, чтобы создать аккаунт.");
      return;
    }

    if (form.password.length < 6) {
      setAuthStatus("inline-status-warning", "Пароль пока слишком короткий.", "Для спокойного входа нужен пароль длиной не меньше 6 символов.");
      return;
    }

    if (state.pendingPostAuthAction) {
      persistPendingAnalyzeDraft();
    }

    state.authBusy = true;
    renderAuthState();
    setAuthStatus("inline-status-info", "Создаём аккаунт…", "Это займёт всего пару секунд.");

    try {
      const result = await window.CosmoAuth.signUp(form);
        if (result && result.needsEmailConfirmation) {
          state.authBusy = false;
          renderAuthState();
          setAuthStatus("inline-status-safe", "Проверьте почту.", "Мы отправили письмо для подтверждения адреса. После этого можно будет войти.");
          showToast("Письмо для подтверждения уже отправлено.", "success");
          return;
        }
    } catch (error) {
      state.authBusy = false;
      renderAuthState();
      setAuthStatus(
        "inline-status-warning",
        "Не получилось создать аккаунт.",
        formatAuthError(error, "Попробуйте ещё раз чуть позже.")
      );
    }
  }

  async function handleAuthLogin() {
    const form = getAuthFormValues();
    if (state.pendingPostAuthAction) {
      persistPendingAnalyzeDraft();
    }
    if (!form.email || !form.password) {
      setAuthStatus("inline-status-warning", "Нужны email и пароль.", "Добавьте оба поля, чтобы войти в свой аккаунт.");
      return;
    }

    state.authBusy = true;
    renderAuthState();
    setAuthStatus("inline-status-info", "Входим…", "Ещё немного — и рекомендации снова будут рядом.");

    try {
      await window.CosmoAuth.signIn(form);
    } catch (error) {
      state.authBusy = false;
      renderAuthState();
      setAuthStatus(
        "inline-status-warning",
        "Войти пока не получилось.",
        formatAuthError(error, "Проверьте данные и попробуйте ещё раз.")
      );
    }
  }

  async function handleSocialAuth(provider) {
    const providerLabel = provider === "apple" ? "Apple" : "Google";
    state.authBusy = true;
    if (state.pendingPostAuthAction) {
      const persisted = persistPendingAnalyzeDraft();
      if (!persisted) {
        showToast("Не получилось сохранить этот шаг. Если что, его можно быстро повторить.", "error");
      }
    }
    renderAuthState();
    setAuthStatus("inline-status-info", `Переходим к ${providerLabel}…`, "Сейчас откроется окно входа.");

    try {
      await window.CosmoAuth.signInWithProvider(provider);
    } catch (error) {
      state.authBusy = false;
      renderAuthState();
      setAuthStatus(
        "inline-status-warning",
        `${providerLabel} пока недоступен.`,
        formatAuthError(error, "Попробуйте ещё раз чуть позже.")
      );
    }
  }

  async function handleAuthSignOut() {
    try {
      await window.CosmoAuth.signOut();
      closeAuthModal();
    } catch (error) {
      showToast("Не удалось завершить сеанс. Попробуйте ещё раз.", "error");
    }
  }

  function scrollToTarget(id) {
    const target = document.getElementById(id);
    if (!target) {
      return;
    }
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function buildDemoCards() {
    if (ui && typeof ui.clearNode === "function") {
      ui.clearNode(refs.demoGrid);
    } else {
      refs.demoGrid.innerHTML = "";
    }

    window.CosmoCompatibility.DEMO_SCENARIOS.forEach((scenario) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "demo-card";
      card.appendChild(document.createElement("span")).className = "demo-label";
      card.querySelector(".demo-label").textContent = "Пример";
      card.appendChild(document.createElement("strong")).textContent = getDemoTitle(scenario.id);
      card.appendChild(document.createElement("p")).textContent = scenario.description;
      const badge = document.createElement("span");
      badge.className = `severity-pill ${getVerdictClass(scenario.id)}`;
      badge.textContent = getDemoBadge(scenario.id);
      card.appendChild(badge);
      card.addEventListener("click", () => runDemoScenario(scenario));
      refs.demoGrid.appendChild(card);
    });
  }

  function selectMode(nextMode) {
    if (nextMode === "photo" && !state.photoAvailable) {
      return;
    }

    state.selectedMode = nextMode;
    render();
  }

  function render() {
    renderAuthState();
    renderModeVisibility();
    renderUploadCards();
    renderActionState();
    renderHistory();
  }

  function renderModeVisibility() {
    if (refs.analyzerTitle) {
      refs.analyzerTitle.textContent = !state.photoAvailable || state.selectedMode === "manual"
        ? "Вставьте два состава."
        : "Загрузите два фото.";
    }
    if (refs.breadcrumbMode) {
      refs.breadcrumbMode.textContent = !state.photoAvailable || state.selectedMode === "manual"
        ? "по составу"
        : "по фото";
    }
    if (refs.heroStartBtn) {
      refs.heroStartBtn.textContent = state.photoAvailable ? "Загрузить фото" : "Вставить состав";
    }
    refs.modeSwitch.hidden = !state.photoAvailable;
    refs.manualWorkspace.classList.toggle("is-active", !state.photoAvailable || state.selectedMode === "manual");
    refs.photoWorkspace.classList.toggle("is-active", state.photoAvailable && state.selectedMode === "photo");
    refs.manualModeBtn.classList.toggle("is-selected", !state.photoAvailable || state.selectedMode === "manual");
    refs.photoModeBtn.classList.toggle("is-selected", state.photoAvailable && state.selectedMode === "photo");
    refs.manualModeBtn.setAttribute("aria-pressed", String(!state.photoAvailable || state.selectedMode === "manual"));
    refs.photoModeBtn.setAttribute("aria-pressed", String(state.photoAvailable && state.selectedMode === "photo"));
  }

  function renderUploadCards() {
    [1, 2].forEach((productNum) => {
      const card = document.getElementById(`uploadCard${productNum}`);
      const preview = state[`product${productNum}`];
      const title = card.querySelector(".preview-title");
      const meta = card.querySelector(".preview-meta");
      const image = card.querySelector(".preview-image");

      card.classList.toggle("is-filled", Boolean(preview));

      if (!preview) {
        image.removeAttribute("src");
        image.removeAttribute("alt");
        title.textContent = "Фото еще не добавлено";
        meta.textContent = "После загрузки фото можно заменить или удалить.";
        return;
      }

      image.src = preview.previewUrl;
      image.alt = `Превью средства ${productNum}`;
      if (preview.analysis) {
        const ingredientsCount = Array.isArray(preview.analysis.ingredients)
          ? preview.analysis.ingredients.length
          : 0;
        const confidenceText = buildConfidenceLabel(preview.analysis);
        title.textContent = preview.analysis.product_name || `Средство ${productNum}`;
        meta.textContent = [
          preview.analysis.brand || "Название не определено",
          ingredientsCount ? `${ingredientsCount} ингредиентов` : "",
          confidenceText
        ].filter(Boolean).join(" • ");
      } else {
        title.textContent = preview.file.name;
        meta.textContent = "Готово к сравнению.";
      }
    });
  }

  function renderActionState(message) {
    const status = getActionState();
    refs.actionStatus.className = `inline-status ${status.tone}`;
    refs.actionStatusTitle.textContent = message && message.title ? message.title : status.title;
    refs.actionStatusCopy.textContent = message && message.copy ? message.copy : status.copy;
    refs.analyzeBtn.disabled = !status.canAnalyze || state.analysisStep !== "idle";
    refs.analyzeBtn.textContent = status.buttonLabel;
  }

  function renderHistory() {
    if (!refs.historySection || !refs.historyGrid) {
      return;
    }

    if (!state.authUser || !state.historyLoaded || !state.historyConfigured || !state.historyItems.length) {
      refs.historySection.hidden = true;
      if (ui && typeof ui.clearNode === "function") {
        ui.clearNode(refs.historyGrid);
      } else {
        refs.historyGrid.innerHTML = "";
      }
      if (refs.historyToolbar) {
        refs.historyToolbar.hidden = true;
      }
      return;
    }

    refs.historySection.hidden = false;
    if (ui && typeof ui.clearNode === "function") {
      ui.clearNode(refs.historyGrid);
    } else {
      refs.historyGrid.innerHTML = "";
    }
    if (refs.historyLead) {
      refs.historyLead.textContent = "Последние разборы в аккаунте.";
    }
    if (refs.historyToolbar && refs.historyNote && refs.clearHistoryBtn) {
      refs.historyToolbar.hidden = false;
      refs.historyNote.textContent = "К ним можно быстро вернуться.";
      refs.clearHistoryBtn.hidden = false;
      refs.clearHistoryBtn.textContent = "Очистить";
    }

    state.historyItems.forEach((item) => {
      const card = document.createElement("article");
      card.className = "history-card";
      const payload = item.analysis_payload || {};
      const result = payload.result || {};
      const badgeClass = getVerdictClass(item.overall_verdict);
      const top = document.createElement("div");
      top.className = "history-card-top";
      const copy = document.createElement("div");
      copy.appendChild(document.createElement("h4")).textContent = item.summary_title || "Рекомендация";
      copy.appendChild(document.createElement("p")).textContent = item.summary_copy || "";
      const badge = document.createElement("span");
      badge.className = `severity-pill ${badgeClass}`;
      badge.textContent = getHistoryBadge(item.overall_verdict);
      top.append(copy, badge);

      const meta = document.createElement("div");
      meta.className = "history-card-meta";
      meta.appendChild(document.createElement("span")).className = "history-card-products";
      meta.querySelector(".history-card-products").textContent = `${item.product_1_name || "Средство 1"} + ${item.product_2_name || "Средство 2"}`;
      meta.appendChild(document.createElement("span")).className = "history-card-date";
      meta.querySelector(".history-card-date").textContent = formatHistoryDate(item.created_at);

      const actionButton = document.createElement("button");
      actionButton.className = "button button-secondary button-compact";
      actionButton.type = "button";
      actionButton.textContent = "Открыть разбор";
      actionButton.addEventListener("click", () => {
        if (!payload.product1 || !payload.product2 || !result.overallVerdict) {
          showToast("Не удалось открыть этот разбор.", "error");
          return;
        }
        renderResults(result, payload.product1, payload.product2);
      });
      card.append(top, meta, actionButton);
      refs.historyGrid.appendChild(card);
    });
  }

  function getActionState() {
    if (state.selectedMode === "photo" && state.photoAvailable) {
      if (!state.product1 || !state.product2) {
        return {
          canAnalyze: false,
          tone: "inline-status-info",
          title: "Добавьте два фото.",
          copy: "Тогда можно будет сравнить эту пару.",
          buttonLabel: "Получить рекомендацию"
        };
      }

      if (!state.authUser) {
        return {
          canAnalyze: true,
          tone: "inline-status-info",
          title: "Фото готовы.",
          copy: "Войдите, чтобы увидеть рекомендацию.",
          buttonLabel: "Войти и продолжить"
        };
      }

        return {
          canAnalyze: true,
          tone: "inline-status-safe",
          title: "Можно собирать рекомендацию.",
          copy: "Соберём один короткий вывод по этой паре.",
          buttonLabel: "Получить рекомендацию"
        };
    }

    const products = getManualProducts();
    if (!products) {
      return {
        canAnalyze: false,
        tone: "inline-status-info",
        title: "Вставьте оба состава.",
        copy: "Разделяйте ингредиенты запятыми или новой строкой.",
        buttonLabel: "Получить рекомендацию"
      };
    }

    if (!state.authUser) {
      return {
        canAnalyze: true,
        tone: "inline-status-info",
        title: "Составы готовы.",
        copy: "Войдите, чтобы увидеть рекомендацию.",
        buttonLabel: "Войти и продолжить"
      };
    }

    return {
      canAnalyze: true,
      tone: "inline-status-safe",
      title: "Можно собирать рекомендацию.",
      copy: "Соберём один короткий вывод по этой паре.",
      buttonLabel: "Получить рекомендацию"
    };
  }

  function triggerUpload(productNum) {
    const input = document.getElementById(`uploadInput${productNum}`);
    if (input) {
      input.click();
    }
  }

  async function handleFileUpload(file, productNum) {
    if (!file.type.startsWith("image/")) {
      showToast("Для этого шага нужен файл изображения.", "error");
      return;
    }

    try {
      const prepared = await window.CosmoAPI.prepareImageFile(file);
      updateProduct(productNum, {
        file: prepared.file,
        previewUrl: prepared.previewUrl,
        base64: prepared.base64,
        mimeType: prepared.mimeType,
        analysis: null
      });
      render();
      showToast(`Фото для средства ${productNum} добавлено`, "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Не получилось добавить это фото.", "error");
    }
  }

  function updateProduct(productNum, payload) {
    const key = `product${productNum}`;
    const previous = state[key];
    if (
      previous &&
      previous.previewUrl &&
      previous.previewUrl.startsWith("blob:") &&
      previous.previewUrl !== payload.previewUrl
    ) {
      URL.revokeObjectURL(previous.previewUrl);
    }
    state[key] = payload;
  }

  function buildDisplayNameFromAnalysis(analysis, fallbackLabel) {
    const productName = String(analysis && analysis.product_name ? analysis.product_name : "").trim();
    const brand = String(analysis && analysis.brand ? analysis.brand : "").trim();

    if (brand && productName) {
      const lowerBrand = brand.toLowerCase();
      const lowerProductName = productName.toLowerCase();
      return lowerProductName.includes(lowerBrand) ? productName : `${brand} ${productName}`;
    }

    return productName || brand || fallbackLabel;
  }

  function getPhotoAnalysisQuality(analysis) {
    const ingredients = normalizeIngredients(analysis && analysis.ingredients);
    const confidence = Number(analysis && analysis.confidence);
    const normalizedConfidence = Number.isFinite(confidence) ? confidence : 0;
    const identified = analysis ? analysis.identified !== false : false;
    const hasProductContext = Boolean(
      String(analysis && analysis.product_name ? analysis.product_name : "").trim() ||
      String(analysis && analysis.brand ? analysis.brand : "").trim()
    );
    const needsReview =
      !identified ||
      normalizedConfidence < 0.78 ||
      ingredients.length < 5 ||
      (!hasProductContext && ingredients.length < 7);

    return {
      ingredients,
      confidence: normalizedConfidence,
      identified,
      needsReview
    };
  }

  function buildConfidenceLabel(analysis) {
    const confidence = Number(analysis && analysis.confidence);
    if (!Number.isFinite(confidence)) {
      return "";
    }
    const percent = Math.round(Math.max(0, Math.min(1, confidence)) * 100);
    if (percent >= 90) {
      return `уверенность ${percent}%`;
    }
    if (percent >= 75) {
      return `умеренная уверенность ${percent}%`;
    }
    return `нужна проверка ${percent}%`;
  }

  function buildUncertaintyNote(product1, product2) {
    const analyses = [product1 && product1.analysisMeta, product2 && product2.analysisMeta].filter(Boolean);
    if (!analyses.length) {
      return "";
    }

    const labels = analyses
      .map((analysis, index) => ({ index: index + 1, label: buildConfidenceLabel(analysis) }))
      .filter((item) => item.label);

    if (!labels.length) {
      return "";
    }

    return `По фото уверенность чтения: ${labels.map((item) => `средство ${item.index} — ${item.label}`).join("; ")}. Если что-то на этикетке было видно нечетко, лучше быстро сверить список ингредиентов вручную.`;
  }

  function movePhotoAnalysisToManualReview(analysis1, analysis2, ingredients1, ingredients2) {
    state.selectedMode = "manual";
    refs.manualName1.value = buildDisplayNameFromAnalysis(analysis1, "Средство 1");
    refs.manualName2.value = buildDisplayNameFromAnalysis(analysis2, "Средство 2");
    refs.manualIngredients1.value = ingredients1.join(", ");
    refs.manualIngredients2.value = ingredients2.join(", ");
    refs.resultsSection.hidden = true;
    render();
    scrollToTarget("analyzerTitle");
    renderActionState({
      title: "Лучше быстро проверить распознанный текст.",
      copy: "Мы перенесли составы в поля ниже. Посмотрите их и при необходимости поправьте пару строк перед рекомендацией."
    });
    showToast("Сначала проверьте распознанный состав, потом продолжим.", "warning");
  }

  function clearProduct(productNum) {
    const key = `product${productNum}`;
    const current = state[key];
    if (current && current.previewUrl && current.previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(current.previewUrl);
    }
    state[key] = null;
    state.pendingPostAuthAction = null;
    refs.resultsSection.hidden = true;
    render();
  }

  async function handleAnalyze() {
    if (state.selectedMode === "photo" && state.photoAvailable) {
      if (!state.product1 || !state.product2) {
        renderActionState();
        return;
      }
      if (!state.authUser) {
        state.pendingPostAuthAction = "photo-analysis";
        openAuthModal("photo-analysis");
        return;
      }
      await runPhotoAnalysis();
      return;
    }

    const products = getManualProducts();
    if (!products) {
      renderActionState({
        title: "Нужны оба состава.",
        copy: "Добавьте список ингредиентов для каждого средства, чтобы получить рекомендацию."
      });
      return;
    }

    if (!state.authUser) {
      state.pendingPostAuthAction = "manual-analysis";
      openAuthModal("manual-analysis");
      return;
    }

    await runManualAnalysis(products);
  }

  function startAnalysis(copy) {
    state.analysisStep = "ingredients";
    state.runToken += 1;
    state.abortController = new AbortController();
    refs.progressOverlay.hidden = false;
    refs.progressCopy.textContent = copy || "Собираем всё важное об этой паре и готовим понятную рекомендацию.";
    updateProgressStep("ingredients");
    renderActionState({
      title: "Собираем рекомендацию.",
      copy: "Это займет всего несколько секунд."
    });
    return state.runToken;
  }

  function updateProgressStep(nextStep) {
    state.analysisStep = nextStep;
    const order = ["ingredients", "actives", "compatibility"];
    refs.progressSteps.forEach((item) => {
      const currentIndex = order.indexOf(nextStep);
      const itemIndex = order.indexOf(item.dataset.step);
      item.classList.toggle("is-current", itemIndex === currentIndex);
      item.classList.toggle("is-complete", itemIndex < currentIndex);
    });
  }

  function finishAnalysis() {
    refs.progressOverlay.hidden = true;
    state.abortController = null;
    state.analysisStep = "idle";
    renderActionState();
  }

  function cancelActiveAnalysis() {
    if (state.abortController) {
      state.abortController.abort();
      state.abortController = null;
    }

      refs.progressOverlay.hidden = true;
      state.analysisStep = "idle";
      renderActionState({
        title: "Проверку остановили.",
        copy: "Можно спокойно поправить пару и попробовать ещё раз."
      });
  }

  async function runManualAnalysis(products) {
    const token = startAnalysis("Собираем составы двух средств и готовим спокойную рекомендацию по их сочетанию.");

    try {
      await wait(260, token);
      updateProgressStep("actives");
      await wait(320, token);

      const result = window.CosmoCompatibility.analyzeCompatibility(
        products.product1.ingredients,
        products.product2.ingredients
      );

      updateProgressStep("compatibility");
      await wait(220, token);
      renderResults(result, products.product1, products.product2);
      void persistHistoryEntry(result, products.product1, products.product2);
      finishAnalysis();
    } catch (error) {
      handleAnalysisError(error);
    }
  }

  async function runPhotoAnalysis() {
    const token = startAnalysis("Читаем составы по двум фото и собираем рекомендацию по этой паре средств.");

    try {
      const signal = state.abortController.signal;
      const [analysis1, analysis2] = await Promise.all([
        window.CosmoAPI.extractIngredientsFromPhoto(state.product1.base64, state.product1.mimeType, { signal }),
        window.CosmoAPI.extractIngredientsFromPhoto(state.product2.base64, state.product2.mimeType, { signal })
      ]);

      if (token !== state.runToken) {
        return;
      }

      updateProduct(1, {
        file: state.product1.file,
        previewUrl: state.product1.previewUrl,
        base64: state.product1.base64,
        mimeType: state.product1.mimeType,
        analysis: analysis1
      });
      updateProduct(2, {
        file: state.product2.file,
        previewUrl: state.product2.previewUrl,
        base64: state.product2.base64,
        mimeType: state.product2.mimeType,
        analysis: analysis2
      });

      renderUploadCards();
      updateProgressStep("actives");
      await wait(220, token);

      const quality1 = getPhotoAnalysisQuality(analysis1);
      const quality2 = getPhotoAnalysisQuality(analysis2);
      const ingredients1 = quality1.ingredients;
      const ingredients2 = quality2.ingredients;

      if (quality1.needsReview || quality2.needsReview) {
        finishAnalysis();
        movePhotoAnalysisToManualReview(analysis1, analysis2, ingredients1, ingredients2);
        return;
      }

      const result = window.CosmoCompatibility.analyzeCompatibility(ingredients1, ingredients2);

      updateProgressStep("compatibility");
      await wait(180, token);

      const product1 = buildProductFromAnalysis(analysis1, ingredients1);
      const product2 = buildProductFromAnalysis(analysis2, ingredients2);
      renderResults(result, product1, product2);
      void persistHistoryEntry(result, product1, product2);
      finishAnalysis();
    } catch (error) {
      handleAnalysisError(error);
    }
  }

  async function runDemoScenario(scenario) {
    const token = startAnalysis("Открываем пример и собираем готовую рекомендацию в том виде, в котором вы увидите свой результат.");

    try {
      await wait(220, token);
      updateProgressStep("actives");
      await wait(260, token);
      updateProgressStep("compatibility");

      const result = window.CosmoCompatibility.analyzeCompatibility(
        scenario.product1.ingredients,
        scenario.product2.ingredients
      );

      await wait(180, token);
      renderResults(result, {
        name: scenario.product1.name,
        brand: scenario.product1.brand,
        ingredients: scenario.product1.ingredients
      }, {
        name: scenario.product2.name,
        brand: scenario.product2.brand,
        ingredients: scenario.product2.ingredients
      });

      finishAnalysis();
    } catch (error) {
      handleAnalysisError(error);
    }
  }

  function handleAnalysisError(error) {
    if (error && error.name === "AbortError") {
      cancelActiveAnalysis();
      return;
    }

      refs.progressOverlay.hidden = true;
      state.abortController = null;
      state.analysisStep = "idle";
      renderActionState({
        title: "Пока не получилось собрать рекомендацию.",
        copy: error instanceof Error ? error.message : "Попробуйте ещё раз."
      });
      showToast(error instanceof Error ? error.message : "Пока не получилось собрать рекомендацию.", "error");
  }

  function renderResults(result, product1, product2) {
    const verdictConfig = getVerdictConfig(result);
    const sources = collectSources(result);
    const uncertaintyNote = buildUncertaintyNote(product1, product2);

    refs.resultsSection.hidden = false;
    refs.verdictCard.classList.remove("good", "caution", "bad");
    refs.verdictCard.classList.add(verdictConfig.className);
    refs.verdictKicker.textContent = verdictConfig.kicker;
    refs.verdictTitle.textContent = verdictConfig.title;
    refs.verdictDescription.textContent = uncertaintyNote
      ? `${verdictConfig.description} ${uncertaintyNote}`
      : verdictConfig.description;
    refs.routineTitle.textContent = verdictConfig.routineTitle;
    refs.routineCopy.textContent = verdictConfig.routineCopy;
    refs.whyCopy.textContent = verdictConfig.whyCopy;

    renderProductsSummary(product1, product2, result);
    renderInteractions(result);
    renderSources(sources);

      refs.resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
      renderActionState({
        title: "Рекомендация готова.",
        copy: "Сначала главное решение, потом короткие детали, которые помогут в рутине."
      });
  }

  async function loadHistory() {
    if (!state.authUser) {
      state.historyConfigured = state.authConfigured;
      state.historyItems = [];
      state.historyLoaded = true;
      renderHistory();
      return;
    }

    try {
      const payload = await window.CosmoAPI.fetchAnalysisHistory();
      state.historyConfigured = Boolean(payload && payload.configured);
      state.historyItems = Array.isArray(payload && payload.items) ? payload.items : [];
    } catch (error) {
      state.historyConfigured = false;
      state.historyItems = [];
    } finally {
      state.historyLoaded = true;
      renderHistory();
    }
  }

  async function handleClearHistory() {
    if (!state.authUser) {
      return;
    }

      const confirmed = window.confirm("Очистить сохранённую историю рекомендаций в аккаунте?");
    if (!confirmed) {
      return;
    }

    try {
        await window.CosmoAPI.clearAnalysisHistory();
        state.historyItems = [];
        state.historyLoaded = true;
        renderHistory();
        showToast("История аккаунта очищена.", "success");
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Не получилось очистить историю аккаунта.", "error");
      }
  }

  async function persistHistoryEntry(result, product1, product2) {
    if (!state.authUser) {
      return;
    }

    const verdictConfig = getVerdictConfig(result);
    const entry = {
      mode: state.selectedMode === "photo" ? "photo" : "manual",
      overallVerdict: result.overallVerdict,
      summaryTitle: verdictConfig.title,
      summaryCopy: verdictConfig.routineCopy,
      product1Name: product1.name || "Средство 1",
      product2Name: product2.name || "Средство 2",
      analysisPayload: {
        result,
        product1,
        product2
      }
    };

      try {
        const payload = await window.CosmoAPI.saveAnalysisHistory(entry);
      if (payload && payload.configured === false) {
        state.historyConfigured = false;
        renderHistory();
        return;
      }
        await loadHistory();
      } catch (error) {
        showToast("Не получилось сохранить рекомендацию в истории.", "error");
      }
  }

  function renderProductsSummary(product1, product2, result) {
    refs.productsSummary.innerHTML = "";
    refs.productsSummary.appendChild(createProductCard(product1, result.product1Active, "Средство 1"));
    refs.productsSummary.appendChild(createProductCard(product2, result.product2Active, "Средство 2"));
  }

  function createProductCard(product, activeInfo, fallbackLabel) {
    const card = document.createElement("article");
    card.className = "product-card reveal";

    const foundNames = activeInfo.found.map((item) => item.originalName);
    const unknownPreview = activeInfo.notFound.slice(0, 5).join(", ");
    const unknownText = activeInfo.notFound.length
      ? `Главное по этой формуле уже учтено в рекомендации${unknownPreview ? `: ${unknownPreview}` : ""}.`
      : "Главное по этой формуле уже учтено в рекомендации.";
    const metaParts = [];
    if (product.brand) {
      metaParts.push(product.brand);
    }
    metaParts.push(`${product.ingredients.length} ингредиентов`);
    const confidenceText = product.analysisMeta ? buildConfidenceLabel(product.analysisMeta) : "";
    if (confidenceText) {
      metaParts.push(confidenceText);
    }

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = fallbackLabel;
    const title = document.createElement("h4");
    title.textContent = product.name || fallbackLabel;
    const meta = document.createElement("p");
    meta.className = "product-meta";
    meta.textContent = metaParts.join(" • ");
    const chipList = document.createElement("div");
    chipList.className = "chip-list";
    if (foundNames.length) {
      foundNames.forEach((name) => {
        const chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = name;
        chipList.appendChild(chip);
      });
    } else {
      const chip = document.createElement("span");
      chip.className = "chip chip-neutral";
      chip.textContent = "Ключевые активы не выделены отдельно";
      chipList.appendChild(chip);
    }
    const unknown = document.createElement("p");
    unknown.className = "product-meta";
    unknown.textContent = unknownText;
    card.append(eyebrow, title, meta, chipList, unknown);
    return card;
  }

  function renderInteractions(result) {
    if (ui && typeof ui.clearNode === "function") {
      ui.clearNode(refs.interactionsContainer);
    } else {
      refs.interactionsContainer.innerHTML = "";
    }
    const interactions = [
      ...result.conflicts.map((item) => ({ ...item, type: "bad" })),
      ...result.cautions.map((item) => ({ ...item, type: "caution" })),
      ...result.synergies.map((item) => ({ ...item, type: "good" }))
    ];

    if (!interactions.length) {
      const empty = document.createElement("article");
      empty.className = "interaction-card good reveal";
      const top = document.createElement("div");
      top.className = "interaction-top";
      const copy = document.createElement("div");
      copy.appendChild(document.createElement("h4")).textContent = "Явных конфликтов между ключевыми активами не видно";
      const badge = document.createElement("span");
      badge.className = "severity-pill good";
      badge.textContent = "Можно вместе";
      top.append(copy, badge);
      const paragraph = document.createElement("p");
      paragraph.textContent = "В текущем разборе не видно сочетаний, которые мешали бы использовать эти средства в одной рутине.";
      empty.append(top, paragraph);
      refs.interactionsContainer.appendChild(empty);
      return;
    }

    interactions.forEach((interaction) => {
      const card = document.createElement("article");
      card.className = `interaction-card ${interaction.type} reveal`;
      const top = document.createElement("div");
      top.className = "interaction-top";
      const copy = document.createElement("div");
      copy.appendChild(document.createElement("h4")).textContent = interaction.rule.title;
      const meta = document.createElement("p");
      meta.className = "interaction-meta";
      meta.textContent = formatIngredientPair(interaction);
      copy.appendChild(meta);
      const badge = document.createElement("span");
      badge.className = `severity-pill ${interaction.type}`;
      badge.textContent = getInteractionBadge(interaction.type);
      top.append(copy, badge);
      const reason = document.createElement("p");
      reason.textContent = interaction.rule.reason;
      const advice = document.createElement("p");
      const adviceLabel = document.createElement("strong");
      adviceLabel.textContent = "Как лучше использовать:";
      advice.append(adviceLabel, document.createTextNode(` ${interaction.rule.advice}`));
      card.append(top, reason, advice);
      if (interaction.rule.source) {
        const source = document.createElement("p");
        source.className = "interaction-meta";
        const sourceLabel = document.createElement("strong");
        sourceLabel.textContent = "Источник:";
        source.append(sourceLabel, document.createTextNode(` ${interaction.rule.source}`));
        card.appendChild(source);
      }
      refs.interactionsContainer.appendChild(card);
    });
  }

  function renderSources(sources) {
    if (ui && typeof ui.clearNode === "function") {
      ui.clearNode(refs.sourcesList);
    } else {
      refs.sourcesList.innerHTML = "";
    }

    if (!sources.length) {
      const fallback = document.createElement("div");
      fallback.className = "source-item";
      fallback.appendChild(document.createElement("strong")).textContent = "Рекомендация опирается на общие правила сочетания активов";
      fallback.appendChild(document.createElement("p")).textContent = "Для этой пары отдельные ссылки не выделены, поэтому рекомендация собрана на основе известных сочетаний активов.";
      refs.sourcesList.appendChild(fallback);
      return;
    }

    sources.forEach((source) => {
      const item = document.createElement("div");
      item.className = "source-item";
      item.appendChild(document.createElement("strong")).textContent = source;
      item.appendChild(document.createElement("p")).textContent = "Этот материал помогает объяснить одно или несколько правил, которые повлияли на рекомендацию.";
      refs.sourcesList.appendChild(item);
    });
  }

  function getVerdictConfig(result) {
    const topRule = result.conflicts[0] || result.cautions[0] || result.synergies[0];

    if (result.overallVerdict === "bad") {
      return {
        className: "bad",
        kicker: "Можно ли сочетать",
        title: "Не сочетать в одном нанесении",
        description: "Эту пару спокойнее развести по времени, чтобы не перегружать кожу и снизить риск лишнего раздражения.",
        routineTitle: "Как лучше поступить",
        routineCopy: topRule ? topRule.rule.advice : "Лучше развести эти средства по разным дням или по разному времени суток.",
        whyCopy: topRule ? topRule.rule.reason : "Главный риск связан с тем, что сочетание активов может оказаться слишком активным для одной рутины."
      };
    }

    if (result.overallVerdict === "caution") {
      return {
        className: "caution",
        kicker: "Можно ли сочетать",
        title: "Лучше разделить по времени",
        description: "Эти средства можно сочетать осознанно, но для более спокойной рутины их часто удобнее разнести по времени.",
        routineTitle: "Как лучше поступить",
        routineCopy: topRule ? topRule.rule.advice : "Если кожа чувствительная, лучше не накладывать эти средства в один и тот же уход.",
        whyCopy: topRule ? topRule.rule.reason : "Комбинация не критична, но в одной рутине может оказаться слишком активной."
      };
    }

    return {
      className: "good",
      kicker: "Можно ли сочетать",
      title: "Можно использовать вместе",
      description: "У этой пары не видно явных конфликтов в текущем разборе, поэтому ее обычно можно рассматривать для одной рутины.",
      routineTitle: "Как лучше использовать",
      routineCopy: topRule ? topRule.rule.advice : "У этой пары не видно конфликтов в одной рутине, поэтому можно использовать ее спокойно и наблюдать за комфортом кожи.",
      whyCopy: topRule ? topRule.rule.reason : "В текущем разборе не найдено конфликтов между активами этих двух средств."
    };
  }

  function collectSources(result) {
    const raw = [
      ...result.conflicts,
      ...result.cautions,
      ...result.synergies
    ].map((item) => item.rule && item.rule.source).filter(Boolean);

    return [...new Set(raw)];
  }

  function formatIngredientPair(interaction) {
    const left = interaction.ingredientsA.map((item) => item.originalName).join(", ");
    const right = interaction.ingredientsB.map((item) => item.originalName).join(", ");
    return `${left} × ${right}`;
  }

  function buildProductFromAnalysis(analysis, ingredients) {
    return {
      name: analysis.product_name || "Средство",
      brand: analysis.brand || "",
      ingredients,
      analysisMeta: {
        confidence: analysis.confidence,
        identified: analysis.identified
      }
    };
  }

  function getManualProducts() {
    const ingredients1 = normalizeIngredients(refs.manualIngredients1.value);
    const ingredients2 = normalizeIngredients(refs.manualIngredients2.value);
    if (!ingredients1.length || !ingredients2.length) {
      return null;
    }

    return {
      product1: {
        name: refs.manualName1.value.trim() || "Средство 1",
        brand: "",
        ingredients: ingredients1
      },
      product2: {
        name: refs.manualName2.value.trim() || "Средство 2",
        brand: "",
        ingredients: ingredients2
      }
    };
  }

  function normalizeIngredients(value) {
    if (Array.isArray(value)) {
      return value.map((item) => String(item).trim()).filter(Boolean);
    }

    return String(value || "")
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function resetAll() {
    cancelActiveAnalysis();
    [1, 2].forEach((productNum) => clearProduct(productNum));
    refs.manualName1.value = "";
    refs.manualName2.value = "";
    refs.manualIngredients1.value = "";
    refs.manualIngredients2.value = "";
    refs.resultsSection.hidden = true;
    state.selectedMode = state.photoAvailable ? "photo" : "manual";
    render();
      scrollToTarget("analyzerTitle");
      renderActionState({
        title: "Можно сравнить другую пару.",
        copy: "Добавьте другие средства, и мы соберём новую рекомендацию."
      });
  }

  function getDemoTitle(id) {
    if (id === "danger") {
      return "Лучше разделить";
    }
    if (id === "caution") {
      return "Нужна мягкость";
    }
    return "Можно вместе";
  }

  function getDemoBadge(id) {
    if (id === "danger") {
      return "Лучше развести";
    }
    if (id === "caution") {
      return "Разделить по времени";
    }
    return "Можно вместе";
  }

  function getInteractionBadge(type) {
    if (type === "bad") {
      return "Не сочетать";
    }
    if (type === "caution") {
      return "Разделить";
    }
    return "Можно вместе";
  }

  function getHistoryBadge(verdict) {
    if (verdict === "bad") {
      return "Не сочетать";
    }
    if (verdict === "caution") {
      return "Разделить";
    }
    return "Можно вместе";
  }

  function getVerdictClass(value) {
    if (value === "danger" || value === "bad") {
      return "bad";
    }
    if (value === "caution") {
      return "caution";
    }
    return "good";
  }

  function createMetricCard(label, value) {
    return `
      <article class="metric-card">
        <span class="metric-label">${escapeHtml(label)}</span>
        <strong class="metric-value">${escapeHtml(value)}</strong>
      </article>
    `;
  }

  function createBreakdownItem(label, value, tone) {
    return `
      <div class="breakdown-item${tone ? ` ${tone}` : ""}">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </div>
    `;
  }

  function formatInt(value) {
    return new Intl.NumberFormat("ru-RU").format(Number(value || 0));
  }

  function formatAverage(value) {
    return Number(value || 0).toFixed(1);
  }

  function formatLastAnalysis(value) {
    if (!value) {
      return "пока нет";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "недавно";
    }

    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function formatHistoryDate(value) {
    if (!value) {
      return "Только что";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Недавно";
    }

    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "long",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  async function wait(ms, token) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (token !== state.runToken) {
          reject(new DOMException("Анализ отменён", "AbortError"));
          return;
        }
        resolve();
      }, ms);

      if (state.abortController) {
        state.abortController.signal.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(new DOMException("Анализ отменён", "AbortError"));
        }, { once: true });
      }
    });
  }

  function showToast(message, tone) {
    const toast = document.createElement("div");
    toast.className = `toast ${tone || "success"}`;
    toast.textContent = message;
    refs.toastStack.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3200);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
