import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { supabase, supabasePublicConfig } from './supabase';

type AuthOperationState = {
  signingIn: boolean;
  signingUp: boolean;
  signingOut: boolean;
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
  signOut: () => Promise<void>;
  clearError: () => void;
};

const defaultOperations: AuthOperationState = {
  signingIn: false,
  signingUp: false,
  signingOut: false,
};

const AuthStoreContext = createContext<AuthStoreValue | null>(null);

export function AuthStoreProvider({ children }: { children: React.ReactNode }) {
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
          setError(nextError.message);
        }

        setSession(data.session);
        setUser(data.session?.user ?? null);
        setReady(true);
      })
      .catch((nextError: unknown) => {
        if (!mounted) {
          return;
        }

        setError(nextError instanceof Error ? nextError.message : 'Failed to restore auth session.');
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
      const message =
        nextError instanceof Error ? nextError.message : 'Failed to sign in with email and password.';
      setError(message);
      throw nextError;
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
      const message =
        nextError instanceof Error ? nextError.message : 'Failed to create the account.';
      setError(message);
      throw nextError;
    } finally {
      setOperation('signingUp', false);
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
      const message =
        nextError instanceof Error ? nextError.message : 'Failed to sign out of this device.';
      setError(message);
      throw nextError;
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
