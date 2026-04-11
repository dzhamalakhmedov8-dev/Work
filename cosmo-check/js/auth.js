(function() {
  "use strict";

  const state = {
    client: null,
    configured: false,
    initialized: false,
    session: null,
    profile: null,
    listenerBound: false
  };

  const listeners = new Set();

  function applyAccessToken() {
    if (window.CosmoAPI && typeof window.CosmoAPI.setAuthToken === "function") {
      window.CosmoAPI.setAuthToken(state.session && state.session.access_token ? state.session.access_token : "");
    }
  }

  function getUser() {
    return state.session && state.session.user ? state.session.user : null;
  }

  function buildProfilePayload(user) {
    const metadata = user && user.user_metadata && typeof user.user_metadata === "object"
      ? user.user_metadata
      : {};
    const appMetadata = user && user.app_metadata && typeof user.app_metadata === "object"
      ? user.app_metadata
      : {};

    return {
      id: user.id,
      email: user.email || "",
      full_name: metadata.full_name || metadata.name || "",
      avatar_url: metadata.avatar_url || metadata.picture || "",
      auth_provider: appMetadata.provider || "email"
    };
  }

  async function syncProfile() {
    const user = getUser();
    if (!state.client || !user) {
      state.profile = null;
      return null;
    }

    const payload = buildProfilePayload(user);
    const existingResponse = await state.client
      .from("user_profiles")
      .select("id,email,full_name,avatar_url,auth_provider,created_at,updated_at")
      .eq("id", user.id)
      .maybeSingle();

    const existing = existingResponse && existingResponse.data ? existingResponse.data : null;
    const merged = {
      id: payload.id,
      email: payload.email || (existing && existing.email) || "",
      full_name: payload.full_name || (existing && existing.full_name) || "",
      avatar_url: payload.avatar_url || (existing && existing.avatar_url) || "",
      auth_provider: payload.auth_provider || (existing && existing.auth_provider) || "email"
    };
    const { data, error } = await state.client
      .from("user_profiles")
      .upsert(merged, { onConflict: "id" })
      .select("id,email,full_name,avatar_url,auth_provider,created_at,updated_at")
      .single();

    if (error) {
      state.profile = merged;
      return merged;
    }

    state.profile = data || merged;
    return state.profile;
  }

  function snapshot(event) {
    return {
      configured: state.configured,
      event: event || "READY",
      session: state.session,
      user: getUser(),
      profile: state.profile
    };
  }

  function emit(event) {
    const payload = snapshot(event);
    listeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (error) {
        // Ignore individual listener failures to keep auth reactive.
      }
    });
  }

  async function hydrate(event) {
    if (!state.client) {
      applyAccessToken();
      return snapshot(event);
    }

    const sessionResult = await state.client.auth.getSession();
    state.session = sessionResult && sessionResult.data ? sessionResult.data.session : null;
    applyAccessToken();

    if (getUser()) {
      await syncProfile();
    } else {
      state.profile = null;
    }

    return snapshot(event);
  }

  async function init() {
    if (state.initialized) {
      return snapshot("READY");
    }

    state.initialized = true;

    if (!window.CosmoAPI || !window.supabase || typeof window.supabase.createClient !== "function") {
      applyAccessToken();
      return snapshot("UNAVAILABLE");
    }

    const config = await window.CosmoAPI.fetchPublicConfig();
    if (!config || !config.configured || !config.supabaseUrl || !config.supabaseAnonKey) {
      applyAccessToken();
      return snapshot("UNCONFIGURED");
    }

    state.client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: "pkce"
      }
    });
    state.configured = true;

    if (!state.listenerBound) {
      state.listenerBound = true;
      state.client.auth.onAuthStateChange((event, session) => {
        state.session = session || null;
        applyAccessToken();
        Promise.resolve(getUser() ? syncProfile() : null)
          .catch(() => {
            state.profile = buildProfilePayload(getUser() || {});
          })
          .finally(() => {
            if (!getUser()) {
              state.profile = null;
            }
            emit(event);
          });
      });
    }

    return hydrate("READY");
  }

  function ensureClient() {
    if (!state.client || !state.configured) {
      throw new Error("Авторизация сейчас недоступна.");
    }
  }

  async function signUp(input) {
    ensureClient();
    const payload = input || {};
    const email = String(payload.email || "").trim();
    const password = String(payload.password || "");
    const fullName = String(payload.fullName || "").trim();

    const { data, error } = await state.client.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: fullName ? { full_name: fullName } : {}
      }
    });

    if (error) {
      throw error;
    }

    state.session = data && data.session ? data.session : state.session;
    applyAccessToken();

    if (getUser()) {
      await syncProfile();
    }

    return {
      needsEmailConfirmation: Boolean(data && data.user && !data.session),
      user: data ? data.user : null,
      session: data ? data.session : null
    };
  }

  async function signIn(input) {
    ensureClient();
    const payload = input || {};
    const email = String(payload.email || "").trim();
    const password = String(payload.password || "");

    const { data, error } = await state.client.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw error;
    }

    state.session = data && data.session ? data.session : null;
    applyAccessToken();
    await syncProfile();

    return {
      user: data ? data.user : null,
      session: data ? data.session : null
    };
  }

  async function signInWithProvider(provider) {
    ensureClient();

    const { data, error } = await state.client.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin
      }
    });

    if (error) {
      throw error;
    }

    return data;
  }

  async function signOut() {
    ensureClient();
    const { error } = await state.client.auth.signOut();
    if (error) {
      throw error;
    }

    state.session = null;
    state.profile = null;
    applyAccessToken();
    emit("SIGNED_OUT");
  }

  function subscribe(listener) {
    if (typeof listener !== "function") {
      return function noop() {};
    }

    listeners.add(listener);
    return function unsubscribe() {
      listeners.delete(listener);
    };
  }

  window.CosmoAuth = {
    init,
    signUp,
    signIn,
    signInWithProvider,
    signOut,
    subscribe,
    getSnapshot: function() {
      return snapshot("SNAPSHOT");
    }
  };
})();
