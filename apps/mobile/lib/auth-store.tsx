import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';
import type { Session, User } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { supabase, supabasePublicConfig } from './supabase';
import { mapAuthError } from './error-mapping';

WebBrowser.maybeCompleteAuthSession();

export type OAuthProvider = 'google' | 'apple';

type AuthOperationState = {
  signingIn: boolean;
  signingUp: boolean;
  signingOut: boolean;
  socialProvider: OAuthProvider | null;
};

type AuthActionResult = {
  needsEmailConfirmation: boolean;
};

type AuthStoreValue = {
  ready: boolean;
  configured: boolean;
  user: User | null;
  session: Session | null;
  operations: AuthOperationState;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<AuthActionResult>;
  signInWithOAuth: (provider: OAuthProvider) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
};

const defaultOperations: AuthOperationState = {
  signingIn: false,
  signingUp: false,
  signingOut: false,
  socialProvider: null,
};

const AuthStoreContext = createContext<AuthStoreValue | null>(null);

export function AuthStoreProvider({ children }: { children: React.ReactNode }) {
  const incomingUrl = Linking.useURL();
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [operations, setOperations] = useState<AuthOperationState>(defaultOperations);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }

    let mounted = true;

    void supabase.auth
      .getSession()
      .then(({ data, error: nextError }) => {
        if (!mounted) {
          return;
        }

        if (nextError) {
          setError(mapAuthError('restore', nextError).message);
        }

        setSession(data.session);
        setUser(data.session?.user ?? null);
        setReady(true);
      })
      .catch((nextError: unknown) => {
        if (!mounted) {
          return;
        }

        setError(mapAuthError('restore', nextError).message);
        setReady(true);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) {
        return;
      }

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase || Platform.OS === 'web' || !incomingUrl) {
      return;
    }

    const supabaseClient = supabase;

    const createSessionFromUrl = async (url: string) => {
      const { params, errorCode } = QueryParams.getQueryParams(url);

      if (errorCode) {
        throw new Error(errorCode);
      }

      const accessToken =
        typeof params.access_token === 'string' ? params.access_token : null;
      const refreshToken =
        typeof params.refresh_token === 'string' ? params.refresh_token : null;

      if (!accessToken || !refreshToken) {
        return;
      }

      const { data, error: nextError } = await supabaseClient.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (nextError) {
        throw nextError;
      }

      setSession(data.session);
      setUser(data.session?.user ?? null);
      setReady(true);
    };

    void createSessionFromUrl(incomingUrl).catch((nextError: unknown) => {
      setError(mapAuthError('callback', nextError).message);
    });
  }, [incomingUrl]);

  const setOperation = (key: keyof AuthOperationState, value: boolean) => {
    setOperations((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const clearError = () => {
    setError(null);
  };

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      throw new Error('Supabase Auth is not configured for this build.');
    }

    setOperation('signingIn', true);
    setError(null);

    try {
      const { data, error: nextError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (nextError) {
        throw nextError;
      }

      setSession(data.session);
      setUser(data.user);
    } catch (nextError) {
      const message = mapAuthError('sign-in', nextError).message;
      setError(message);
      throw new Error(message);
    } finally {
      setOperation('signingIn', false);
    }
  };

  const signUp = async (email: string, password: string): Promise<AuthActionResult> => {
    if (!supabase) {
      throw new Error('Supabase Auth is not configured for this build.');
    }

    setOperation('signingUp', true);
    setError(null);

    try {
      const { data, error: nextError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (nextError) {
        throw nextError;
      }

      setSession(data.session ?? null);
      setUser(data.user ?? null);

      return {
        needsEmailConfirmation: !data.session,
      };
    } catch (nextError) {
      const message = mapAuthError('sign-up', nextError).message;
      setError(message);
      throw new Error(message);
    } finally {
      setOperation('signingUp', false);
    }
  };

  const signInWithOAuth = async (provider: OAuthProvider) => {
    if (!supabase) {
      throw new Error('Supabase Auth is not configured for this build.');
    }

    setOperations((current) => ({
      ...current,
      socialProvider: provider,
    }));
    setError(null);

    const redirectTo = makeRedirectUri({
      path: 'auth',
      scheme: 'nutrition-planner',
    });

    try {
      if (Platform.OS === 'web') {
        const { error: nextError } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo,
          },
        });

        if (nextError) {
          throw nextError;
        }

        return;
      }

      const { data, error: nextError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (nextError) {
        throw nextError;
      }

      if (!data?.url) {
        throw new Error(`No ${provider} auth URL was returned by Supabase.`);
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type === 'success') {
        const { params, errorCode } = QueryParams.getQueryParams(result.url);

        if (errorCode) {
          throw new Error(errorCode);
        }

        const accessToken =
          typeof params.access_token === 'string' ? params.access_token : null;
        const refreshToken =
          typeof params.refresh_token === 'string' ? params.refresh_token : null;

        if (!accessToken || !refreshToken) {
          throw new Error(`${provider} sign-in completed without a session token.`);
        }

        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          throw sessionError;
        }

        setSession(sessionData.session);
        setUser(sessionData.session?.user ?? null);
        return;
      }

      if (result.type === 'cancel' || result.type === 'dismiss') {
        return;
      }

      throw new Error(`${provider} sign-in could not be completed.`);
    } catch (nextError) {
      const message = mapAuthError('oauth', nextError).message;
      setError(message);
      throw new Error(message);
    } finally {
      setOperations((current) => ({
        ...current,
        socialProvider: null,
      }));
    }
  };

  const signOut = async () => {
    if (!supabase) {
      return;
    }

    setOperation('signingOut', true);
    setError(null);

    try {
      const { error: nextError } = await supabase.auth.signOut();

      if (nextError) {
        throw nextError;
      }

      setSession(null);
      setUser(null);
    } catch (nextError) {
      const message = mapAuthError('sign-out', nextError).message;
      setError(message);
      throw new Error(message);
    } finally {
      setOperation('signingOut', false);
    }
  };

  const value = useMemo<AuthStoreValue>(
    () => ({
      ready,
      configured: supabasePublicConfig.configured,
      user,
      session,
      operations,
      error,
      signIn,
      signUp,
      signInWithOAuth,
      signOut,
      clearError,
    }),
    [error, operations, ready, session, user],
  );

  return <AuthStoreContext.Provider value={value}>{children}</AuthStoreContext.Provider>;
}

export const useAuthStore = (): AuthStoreValue => {
  const context = useContext(AuthStoreContext);

  if (!context) {
    throw new Error('useAuthStore must be used inside AuthStoreProvider');
  }

  return context;
};
