import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

type SupabasePublicConfig = {
  url: string | null;
  anonKey: string | null;
  configured: boolean;
};

const normalize = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const getPublicConfig = (): SupabasePublicConfig => {
  const extra = Constants.expoConfig?.extra as
    | { supabaseUrl?: string; supabaseAnonKey?: string }
    | undefined;
  const url = normalize(extra?.supabaseUrl);
  const anonKey = normalize(extra?.supabaseAnonKey);

  return {
    url,
    anonKey,
    configured: Boolean(url && anonKey),
  };
};

export const supabasePublicConfig = getPublicConfig();

export const supabase = supabasePublicConfig.configured
  ? createClient(supabasePublicConfig.url!, supabasePublicConfig.anonKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
        storage: Platform.OS === 'web' ? undefined : AsyncStorage,
        storageKey: 'nutrition-planner-auth',
      },
    })
  : null;

export const getSupabasePublicConfigStatus = () => ({
  ...supabasePublicConfig,
  anonKeyConfigured: Boolean(supabasePublicConfig.anonKey),
});
