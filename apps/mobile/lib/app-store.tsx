import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
  exportBundleV1Schema,
  exportBundleVersion,
  userProfileSchema,
  weeklyPlanSchema,
  type ExportBundleV1,
  type PlanValidation,
  type ReplanRequest,
  type UserProfile,
  type WeeklyPlan,
} from '@nutrition-planner/shared';

import {
  generatePlan,
  getDefaultApiUrl,
  replanPlan,
  shouldUpgradeStoredApiUrl,
  validatePlan,
} from './api';
import { readJson, removeKey, writeJson } from './database';
import { useAuthStore } from './auth-store';

type AppSettings = {
  apiBaseUrl: string;
};

type AppOperationState = {
  savingProfile: boolean;
  generating: boolean;
  replanning: boolean;
  validating: boolean;
  updatingApiUrl: boolean;
  exporting: boolean;
  importing: boolean;
  resetting: boolean;
};

type ToastState = {
  id: string;
  message: string;
  tone: 'neutral' | 'success' | 'danger';
};

type AppStoreValue = {
  ready: boolean;
  busy: boolean;
  operations: AppOperationState;
  error: string | null;
  toast: ToastState | null;
  installationId: string;
  apiBaseUrl: string;
  profile: UserProfile | null;
  currentPlan: WeeklyPlan | null;
  planHistory: WeeklyPlan[];
  shoppingChecks: Record<string, boolean>;
  saveProfile: (profile: UserProfile) => Promise<void>;
  generateWeek: (profileOverride?: UserProfile) => Promise<void>;
  replanCurrentPlan: (request: ReplanRequest) => Promise<void>;
  validateCurrentPlan: () => Promise<PlanValidation | null>;
  updateApiBaseUrl: (nextUrl: string) => Promise<void>;
  exportBackupFile: () => Promise<string | null>;
  importBackupFile: () => Promise<boolean>;
  resetAllData: () => Promise<void>;
  toggleShoppingItem: (ingredientId: string) => void;
  isShoppingItemChecked: (ingredientId: string, planIdOverride?: string) => boolean;
  showToast: (message: string, tone?: ToastState['tone']) => void;
  clearToast: () => void;
  clearError: () => void;
};

const defaultSettings: AppSettings = {
  apiBaseUrl: getDefaultApiUrl(),
};

const defaultOperations: AppOperationState = {
  savingProfile: false,
  generating: false,
  replanning: false,
  validating: false,
  updatingApiUrl: false,
  exporting: false,
  importing: false,
  resetting: false,
};

const installationIdKey = 'installationId';
const settingsKey = 'settings';
const profileKey = 'profile';
const currentPlanKey = 'currentPlan';
const planHistoryKey = 'planHistory';
const shoppingChecksKey = 'shoppingChecks';

const AppStoreContext = createContext<AppStoreValue | null>(null);

const createInstallationId = (): string =>
  `install-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;

const dedupeHistory = (history: WeeklyPlan[], nextPlan: WeeklyPlan): WeeklyPlan[] =>
  [nextPlan, ...history.filter((plan) => plan.id !== nextPlan.id)].slice(0, 12);

const safeParseProfile = (value: unknown): UserProfile | null => {
  const parsed = userProfileSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

const safeParsePlan = (value: unknown): WeeklyPlan | null => {
  const parsed = weeklyPlanSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

const safeParsePlanHistory = (value: unknown): WeeklyPlan[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => safeParsePlan(item))
    .filter((item): item is WeeklyPlan => Boolean(item));
};

const safeParseSettings = (value: unknown): AppSettings => {
  const defaultApiUrl = getDefaultApiUrl();

  if (!value || typeof value !== 'object') {
    return { apiBaseUrl: defaultApiUrl };
  }

  const candidate = value as Partial<AppSettings>;
  const rawApiUrl = typeof candidate.apiBaseUrl === 'string' ? candidate.apiBaseUrl.trim() : '';

  return {
    apiBaseUrl:
      rawApiUrl.length > 0 && !shouldUpgradeStoredApiUrl(rawApiUrl) ? rawApiUrl : defaultApiUrl,
  };
};

const safeParseShoppingChecks = (value: unknown): Record<string, boolean> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce<Record<string, boolean>>((accumulator, [key, state]) => {
    if (typeof state === 'boolean') {
      accumulator[key] = state;
    }

    return accumulator;
  }, {});
};

const buildShoppingCheckKey = (planId: string, ingredientId: string): string =>
  `${planId}:${ingredientId}`;

const scopedDataKey = (baseKey: string, userId: string): string => `user:${userId}:${baseKey}`;

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const { ready: authReady, user } = useAuthStore();
  const [ready, setReady] = useState(false);
  const [operations, setOperations] = useState<AppOperationState>(defaultOperations);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [installationId, setInstallationId] = useState('');
  const [apiBaseUrl, setApiBaseUrl] = useState(defaultSettings.apiBaseUrl);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentPlan, setCurrentPlan] = useState<WeeklyPlan | null>(null);
  const [planHistory, setPlanHistory] = useState<WeeklyPlan[]>([]);
  const [shoppingChecks, setShoppingChecks] = useState<Record<string, boolean>>({});
  const activeUserId = user?.id ?? null;

  useEffect(() => {
    if (!authReady) {
      return;
    }

    setReady(false);
    const storedInstallationId = readJson<string>(installationIdKey) ?? createInstallationId();
    const storedSettings = safeParseSettings(readJson<AppSettings>(settingsKey));

    writeJson(installationIdKey, storedInstallationId);
    writeJson(settingsKey, storedSettings);
    setInstallationId(storedInstallationId);
    setApiBaseUrl(storedSettings.apiBaseUrl);

    if (!activeUserId) {
      setProfile(null);
      setCurrentPlan(null);
      setPlanHistory([]);
      setShoppingChecks({});
      setError(null);
      setReady(true);
      return;
    }

    const scopedProfileKey = scopedDataKey(profileKey, activeUserId);
    const scopedCurrentPlanKey = scopedDataKey(currentPlanKey, activeUserId);
    const scopedPlanHistoryKey = scopedDataKey(planHistoryKey, activeUserId);
    const scopedShoppingChecksKey = scopedDataKey(shoppingChecksKey, activeUserId);

    const rawScopedProfile = readJson<UserProfile>(scopedProfileKey);
    const rawScopedCurrentPlan = readJson<WeeklyPlan>(scopedCurrentPlanKey);
    const rawScopedPlanHistory = readJson<WeeklyPlan[]>(scopedPlanHistoryKey);
    const rawScopedShoppingChecks = readJson<Record<string, boolean>>(scopedShoppingChecksKey);

    const profileFallback = safeParseProfile(readJson<UserProfile>(profileKey));
    const currentPlanFallback = safeParsePlan(readJson<WeeklyPlan>(currentPlanKey));
    const planHistoryFallback = safeParsePlanHistory(readJson<WeeklyPlan[]>(planHistoryKey));
    const shoppingChecksFallback = safeParseShoppingChecks(
      readJson<Record<string, boolean>>(shoppingChecksKey),
    );

    const storedProfile = safeParseProfile(rawScopedProfile) ?? profileFallback;
    const storedCurrentPlan = safeParsePlan(rawScopedCurrentPlan) ?? currentPlanFallback;
    const storedPlanHistory =
      rawScopedPlanHistory !== null
        ? safeParsePlanHistory(rawScopedPlanHistory)
        : planHistoryFallback;
    const storedShoppingChecks =
      rawScopedShoppingChecks !== null
        ? safeParseShoppingChecks(rawScopedShoppingChecks)
        : shoppingChecksFallback;

    if (storedProfile && !readJson<UserProfile>(scopedProfileKey)) {
      writeJson(scopedProfileKey, storedProfile);
    }

    if (storedCurrentPlan && !readJson<WeeklyPlan>(scopedCurrentPlanKey)) {
      writeJson(scopedCurrentPlanKey, storedCurrentPlan);
    }

    if (storedPlanHistory.length > 0 && !readJson<WeeklyPlan[]>(scopedPlanHistoryKey)) {
      writeJson(scopedPlanHistoryKey, storedPlanHistory);
    }

    if (
      Object.keys(storedShoppingChecks).length > 0 &&
      !readJson<Record<string, boolean>>(scopedShoppingChecksKey)
    ) {
      writeJson(scopedShoppingChecksKey, storedShoppingChecks);
    }

    setProfile(storedProfile);
    setCurrentPlan(storedCurrentPlan);
    setPlanHistory(storedPlanHistory);
    setShoppingChecks(storedShoppingChecks);
    setError(null);
    setReady(true);
  }, [activeUserId, authReady]);

  const busy = useMemo(() => Object.values(operations).some(Boolean), [operations]);

  const setOperation = (key: keyof AppOperationState, value: boolean) => {
    setOperations((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const clearError = () => {
    setError(null);
  };

  const showToast = (message: string, tone: ToastState['tone'] = 'neutral') => {
    setToast({
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      message,
      tone,
    });
  };

  const clearToast = () => {
    setToast(null);
  };

  const saveProfile = async (nextProfile: UserProfile) => {
    if (!activeUserId) {
      setError('Sign in to save a profile on this device.');
      return;
    }

    setOperation('savingProfile', true);
    setError(null);

    try {
      writeJson(scopedDataKey(profileKey, activeUserId), nextProfile);
      setProfile(nextProfile);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to save profile');
      throw nextError;
    } finally {
      setOperation('savingProfile', false);
    }
  };

  const generateWeek = async (profileOverride?: UserProfile) => {
    if (!activeUserId) {
      setError('Sign in to generate a weekly plan.');
      return;
    }

    const effectiveProfile = profileOverride ?? profile;

    if (!effectiveProfile) {
      setError('Create a profile before generating a plan.');
      return;
    }

    setOperation('generating', true);
    setError(null);

    try {
      const plan = await generatePlan(apiBaseUrl, effectiveProfile, installationId);
      const nextHistory = dedupeHistory(planHistory, plan);

      writeJson(scopedDataKey(currentPlanKey, activeUserId), plan);
      writeJson(scopedDataKey(planHistoryKey, activeUserId), nextHistory);
      setCurrentPlan(plan);
      setPlanHistory(nextHistory);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Failed to generate a weekly plan. Check that the API is running.',
      );
      throw nextError;
    } finally {
      setOperation('generating', false);
    }
  };

  const replanCurrentPlan = async (request: ReplanRequest) => {
    if (!activeUserId) {
      setError('Sign in to update the weekly plan.');
      return;
    }

    if (!profile || !currentPlan) {
      setError('You need an active profile and weekly plan before replanning.');
      return;
    }

    setOperation('replanning', true);
    setError(null);

    try {
      const plan = await replanPlan(
        apiBaseUrl,
        {
          profile,
          currentPlan,
          request,
        },
        installationId,
      );
      const nextHistory = dedupeHistory(planHistory, plan);

      writeJson(scopedDataKey(currentPlanKey, activeUserId), plan);
      writeJson(scopedDataKey(planHistoryKey, activeUserId), nextHistory);
      setCurrentPlan(plan);
      setPlanHistory(nextHistory);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Failed to update the plan. Make sure the API is reachable.',
      );
      throw nextError;
    } finally {
      setOperation('replanning', false);
    }
  };

  const validateCurrentPlan = async (): Promise<PlanValidation | null> => {
    if (!activeUserId) {
      setError('Sign in to validate the current plan.');
      return null;
    }

    if (!profile || !currentPlan) {
      return null;
    }

    setOperation('validating', true);
    setError(null);

    try {
      const validation = await validatePlan(
        apiBaseUrl,
        {
          profile,
          plan: currentPlan,
        },
        installationId,
      );
      const nextPlan = {
        ...currentPlan,
        validation,
      };

      writeJson(scopedDataKey(currentPlanKey, activeUserId), nextPlan);
      setCurrentPlan(nextPlan);
      return validation;
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Failed to validate the current plan.',
      );
      throw nextError;
    } finally {
      setOperation('validating', false);
    }
  };

  const updateApiBaseUrl = async (nextUrl: string) => {
    setOperation('updatingApiUrl', true);
    try {
      const normalized = nextUrl.trim() || defaultSettings.apiBaseUrl;
      const nextSettings = { apiBaseUrl: normalized };

      writeJson(settingsKey, nextSettings);
      setApiBaseUrl(normalized);
    } finally {
      setOperation('updatingApiUrl', false);
    }
  };

  const exportBackupFile = async (): Promise<string | null> => {
    setOperation('exporting', true);
    setError(null);

    try {
      const bundle: ExportBundleV1 = exportBundleV1Schema.parse({
        version: exportBundleVersion,
        exportedAt: new Date().toISOString(),
        profile,
        currentPlan,
        planHistory,
      });
      const baseDirectory =
        FileSystemLegacy.documentDirectory ?? FileSystemLegacy.cacheDirectory;

      if (!baseDirectory) {
        setError('No writable file directory is available on this device.');
        return null;
      }

      const fileUri = `${baseDirectory}nutrition-planner-backup-${Date.now()}.json`;
      await FileSystemLegacy.writeAsStringAsync(fileUri, JSON.stringify(bundle, null, 2), {
        encoding: 'utf8',
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export Nutrition Planner backup',
        });
      }

      return fileUri;
    } finally {
      setOperation('exporting', false);
    }
  };

  const importBackupFile = async (): Promise<boolean> => {
    if (!activeUserId) {
      setError('Sign in to import a backup into your planner profile.');
      return false;
    }

    setOperation('importing', true);
    setError(null);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.[0]) {
        return false;
      }

      const fileContent = await FileSystemLegacy.readAsStringAsync(result.assets[0].uri, {
        encoding: 'utf8',
      });
      const bundle = exportBundleV1Schema.parse(JSON.parse(fileContent));
      const nextSettings = safeParseSettings(readJson<AppSettings>(settingsKey));
      const scopedProfileKey = scopedDataKey(profileKey, activeUserId);
      const scopedCurrentPlanKey = scopedDataKey(currentPlanKey, activeUserId);
      const scopedPlanHistoryKey = scopedDataKey(planHistoryKey, activeUserId);

      if (bundle.profile) {
        writeJson(scopedProfileKey, bundle.profile);
      } else {
        removeKey(scopedProfileKey);
      }

      if (bundle.currentPlan) {
        writeJson(scopedCurrentPlanKey, bundle.currentPlan);
      } else {
        removeKey(scopedCurrentPlanKey);
      }

      writeJson(scopedPlanHistoryKey, bundle.planHistory);
      writeJson(settingsKey, nextSettings);
      setProfile(bundle.profile);
      setCurrentPlan(bundle.currentPlan);
      setPlanHistory(bundle.planHistory);
      setApiBaseUrl(nextSettings.apiBaseUrl);

      return true;
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : 'Failed to import the backup file.',
      );
      throw nextError;
    } finally {
      setOperation('importing', false);
    }
  };

  const resetAllData = async () => {
    setOperation('resetting', true);
    try {
      if (activeUserId) {
        removeKey(scopedDataKey(profileKey, activeUserId));
        removeKey(scopedDataKey(currentPlanKey, activeUserId));
        removeKey(scopedDataKey(planHistoryKey, activeUserId));
        removeKey(scopedDataKey(shoppingChecksKey, activeUserId));
      }

      removeKey(profileKey);
      removeKey(currentPlanKey);
      removeKey(planHistoryKey);
      removeKey(shoppingChecksKey);
      removeKey(installationIdKey);
      removeKey(settingsKey);
      const nextInstallationId = createInstallationId();

      writeJson(installationIdKey, nextInstallationId);
      writeJson(settingsKey, defaultSettings);
      writeJson(shoppingChecksKey, {});
      setInstallationId(nextInstallationId);
      setApiBaseUrl(defaultSettings.apiBaseUrl);
      setProfile(null);
      setCurrentPlan(null);
      setPlanHistory([]);
      setShoppingChecks({});
      setError(null);
    } finally {
      setOperation('resetting', false);
    }
  };

  const isShoppingItemChecked = (ingredientId: string, planIdOverride?: string): boolean => {
    const activePlanId = planIdOverride ?? currentPlan?.id;

    if (!activePlanId) {
      return false;
    }

    return shoppingChecks[buildShoppingCheckKey(activePlanId, ingredientId)] ?? false;
  };

  const toggleShoppingItem = (ingredientId: string) => {
    if (!currentPlan || !activeUserId) {
      return;
    }

    const itemKey = buildShoppingCheckKey(currentPlan.id, ingredientId);

    setShoppingChecks((current) => {
      const nextState = {
        ...current,
        [itemKey]: !current[itemKey],
      };
      writeJson(scopedDataKey(shoppingChecksKey, activeUserId), nextState);
      return nextState;
    });
  };

  return (
    <AppStoreContext.Provider
      value={{
        ready,
        busy,
        operations,
        error,
        toast,
        installationId,
        apiBaseUrl,
        profile,
        currentPlan,
        planHistory,
        shoppingChecks,
        saveProfile,
        generateWeek,
        replanCurrentPlan,
        validateCurrentPlan,
        updateApiBaseUrl,
        exportBackupFile,
        importBackupFile,
        resetAllData,
        toggleShoppingItem,
        isShoppingItemChecked,
        showToast,
        clearToast,
        clearError,
      }}
    >
      {children}
    </AppStoreContext.Provider>
  );
}

export const useAppStore = (): AppStoreValue => {
  const context = useContext(AppStoreContext);

  if (!context) {
    throw new Error('useAppStore must be used inside AppStoreProvider');
  }

  return context;
};
