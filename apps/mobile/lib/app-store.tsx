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
  cloudSyncEnabled as isCloudSyncEnabled,
  deleteCloudWorkspace,
  loadCloudWorkspace,
  pushLocalWorkspaceToCloud,
  saveCloudShoppingChecks,
  syncCloudPlans,
  upsertCloudProfile,
} from './cloud-sync';
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
  hydratingRemote: boolean;
  syncingProfile: boolean;
  syncingPlan: boolean;
  syncingShopping: boolean;
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
  cloudSyncEnabled: boolean;
  lastCloudInstallationId: string | null;
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
  hydratingRemote: false,
  syncingProfile: false,
  syncingPlan: false,
  syncingShopping: false,
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

const writeOrRemoveJson = (key: string, value: unknown): void => {
  if (
    value === null ||
    value === undefined ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0)
  ) {
    removeKey(key);
    return;
  }

  writeJson(key, value);
};

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
  const [lastCloudInstallationId, setLastCloudInstallationId] = useState<string | null>(null);
  const activeUserId = user?.id ?? null;
  const cloudSyncEnabled = isCloudSyncEnabled() && Boolean(activeUserId);

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

  const persistProfileLocally = (userId: string, nextProfile: UserProfile | null) => {
    writeOrRemoveJson(scopedDataKey(profileKey, userId), nextProfile);
    setProfile(nextProfile);
  };

  const persistPlanLocally = (
    userId: string,
    nextPlan: WeeklyPlan | null,
    nextHistory: WeeklyPlan[],
  ) => {
    writeOrRemoveJson(scopedDataKey(currentPlanKey, userId), nextPlan);
    writeOrRemoveJson(scopedDataKey(planHistoryKey, userId), nextHistory);
    setCurrentPlan(nextPlan);
    setPlanHistory(nextHistory);
  };

  const persistShoppingChecksLocally = (userId: string, nextShoppingChecks: Record<string, boolean>) => {
    writeOrRemoveJson(scopedDataKey(shoppingChecksKey, userId), nextShoppingChecks);
    setShoppingChecks(nextShoppingChecks);
  };

  const handleSyncFailure = (fallbackMessage: string, nextError: unknown) => {
    const message = nextError instanceof Error ? nextError.message : fallbackMessage;
    setError(message);
    showToast(message, 'danger');
  };

  useEffect(() => {
    if (!authReady) {
      return;
    }

    let cancelled = false;

    const bootstrap = async () => {
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
        setLastCloudInstallationId(null);
        setError(null);
        setReady(true);
        return;
      }

      const scopedProfileStorageKey = scopedDataKey(profileKey, activeUserId);
      const scopedCurrentPlanStorageKey = scopedDataKey(currentPlanKey, activeUserId);
      const scopedPlanHistoryStorageKey = scopedDataKey(planHistoryKey, activeUserId);
      const scopedShoppingChecksStorageKey = scopedDataKey(shoppingChecksKey, activeUserId);

      const rawScopedProfile = readJson<UserProfile>(scopedProfileStorageKey);
      const rawScopedCurrentPlan = readJson<WeeklyPlan>(scopedCurrentPlanStorageKey);
      const rawScopedPlanHistory = readJson<WeeklyPlan[]>(scopedPlanHistoryStorageKey);
      const rawScopedShoppingChecks = readJson<Record<string, boolean>>(scopedShoppingChecksStorageKey);

      const profileFallback = safeParseProfile(readJson<UserProfile>(profileKey));
      const currentPlanFallback = safeParsePlan(readJson<WeeklyPlan>(currentPlanKey));
      const planHistoryFallback = safeParsePlanHistory(readJson<WeeklyPlan[]>(planHistoryKey));
      const shoppingChecksFallback = safeParseShoppingChecks(
        readJson<Record<string, boolean>>(shoppingChecksKey),
      );

      const localProfile = safeParseProfile(rawScopedProfile) ?? profileFallback;
      const localCurrentPlan = safeParsePlan(rawScopedCurrentPlan) ?? currentPlanFallback;
      const localPlanHistory =
        rawScopedPlanHistory !== null
          ? safeParsePlanHistory(rawScopedPlanHistory)
          : planHistoryFallback;
      const localShoppingChecks =
        rawScopedShoppingChecks !== null
          ? safeParseShoppingChecks(rawScopedShoppingChecks)
          : shoppingChecksFallback;

      if (localProfile && !readJson<UserProfile>(scopedProfileStorageKey)) {
        writeJson(scopedProfileStorageKey, localProfile);
      }

      if (localCurrentPlan && !readJson<WeeklyPlan>(scopedCurrentPlanStorageKey)) {
        writeJson(scopedCurrentPlanStorageKey, localCurrentPlan);
      }

      if (localPlanHistory.length > 0 && !readJson<WeeklyPlan[]>(scopedPlanHistoryStorageKey)) {
        writeJson(scopedPlanHistoryStorageKey, localPlanHistory);
      }

      if (
        Object.keys(localShoppingChecks).length > 0 &&
        !readJson<Record<string, boolean>>(scopedShoppingChecksStorageKey)
      ) {
        writeJson(scopedShoppingChecksStorageKey, localShoppingChecks);
      }

      setProfile(localProfile);
      setCurrentPlan(localCurrentPlan);
      setPlanHistory(localPlanHistory);
      setShoppingChecks(localShoppingChecks);
      setLastCloudInstallationId(null);
      setError(null);
      setReady(true);

      if (!isCloudSyncEnabled()) {
        return;
      }

      setOperation('hydratingRemote', true);

      try {
        const remoteWorkspace = await loadCloudWorkspace(activeUserId);

        if (cancelled) {
          return;
        }

        if (remoteWorkspace.hasAnyData) {
          persistProfileLocally(activeUserId, remoteWorkspace.profile);
          persistPlanLocally(
            activeUserId,
            remoteWorkspace.currentPlan,
            remoteWorkspace.planHistory,
          );
          persistShoppingChecksLocally(activeUserId, remoteWorkspace.shoppingChecks);
          setLastCloudInstallationId(remoteWorkspace.lastInstallationId);
          return;
        }

        const hasLocalWorkspace =
          Boolean(localProfile) ||
          Boolean(localCurrentPlan) ||
          localPlanHistory.length > 0 ||
          Object.keys(localShoppingChecks).length > 0;

        if (hasLocalWorkspace) {
          await pushLocalWorkspaceToCloud(activeUserId, {
            profile: localProfile,
            currentPlan: localCurrentPlan,
            planHistory: localPlanHistory,
            shoppingChecks: localShoppingChecks,
            installationId: storedInstallationId,
          });
          setLastCloudInstallationId(storedInstallationId);
        }
      } catch (nextError) {
        if (!cancelled) {
          handleSyncFailure(
            'Cloud sync is temporarily unavailable. Local data is still available on this device.',
            nextError,
          );
        }
      } finally {
        if (!cancelled) {
          setOperation('hydratingRemote', false);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [activeUserId, authReady]);

  const saveProfile = async (nextProfile: UserProfile) => {
    if (!activeUserId) {
      setError('Sign in to save a profile on this device.');
      return;
    }

    setOperation('savingProfile', true);
    setError(null);

    try {
      persistProfileLocally(activeUserId, nextProfile);

      if (cloudSyncEnabled) {
        setOperation('syncingProfile', true);

        try {
          await upsertCloudProfile(activeUserId, nextProfile);
        } catch (nextError) {
          handleSyncFailure(
            'Profile was saved locally, but cloud sync could not update the account.',
            nextError,
          );
        } finally {
          setOperation('syncingProfile', false);
        }
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to save profile');
      throw nextError;
    } finally {
      setOperation('savingProfile', false);
    }
  };

  const syncPlansAfterLocalChange = async (
    userId: string,
    nextPlan: WeeklyPlan | null,
    nextHistory: WeeklyPlan[],
  ) => {
    if (!cloudSyncEnabled) {
      return;
    }

    setOperation('syncingPlan', true);

    try {
      await syncCloudPlans(userId, nextPlan, nextHistory);
    } catch (nextError) {
      handleSyncFailure(
        'The plan was updated locally, but cloud sync could not update the account history.',
        nextError,
      );
    } finally {
      setOperation('syncingPlan', false);
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

      persistPlanLocally(activeUserId, plan, nextHistory);
      await syncPlansAfterLocalChange(activeUserId, plan, nextHistory);
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

      persistPlanLocally(activeUserId, plan, nextHistory);
      await syncPlansAfterLocalChange(activeUserId, plan, nextHistory);
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
      const nextHistory = planHistory.map((plan) => (plan.id === nextPlan.id ? nextPlan : plan));

      persistPlanLocally(activeUserId, nextPlan, nextHistory);
      await syncPlansAfterLocalChange(activeUserId, nextPlan, nextHistory);
      return validation;
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : 'Failed to validate the current plan.',
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

      persistProfileLocally(activeUserId, bundle.profile);
      persistPlanLocally(activeUserId, bundle.currentPlan, bundle.planHistory);
      setApiBaseUrl(nextSettings.apiBaseUrl);
      writeJson(settingsKey, nextSettings);

      if (cloudSyncEnabled) {
        setOperation('syncingProfile', true);
        setOperation('syncingPlan', true);

        try {
          await pushLocalWorkspaceToCloud(activeUserId, {
            profile: bundle.profile,
            currentPlan: bundle.currentPlan,
            planHistory: bundle.planHistory,
            shoppingChecks,
            installationId,
          });
          setLastCloudInstallationId(installationId);
        } catch (nextError) {
          handleSyncFailure(
            'Backup was imported locally, but cloud sync could not update the account.',
            nextError,
          );
        } finally {
          setOperation('syncingProfile', false);
          setOperation('syncingPlan', false);
        }
      }

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
        persistProfileLocally(activeUserId, null);
        persistPlanLocally(activeUserId, null, []);
        persistShoppingChecksLocally(activeUserId, {});
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
      setLastCloudInstallationId(null);
      setError(null);

      if (activeUserId && cloudSyncEnabled) {
        setOperation('syncingProfile', true);
        setOperation('syncingPlan', true);
        setOperation('syncingShopping', true);

        try {
          await deleteCloudWorkspace(activeUserId);
        } catch (nextError) {
          handleSyncFailure(
            'Local planner data was reset, but cloud data could not be cleared for this account.',
            nextError,
          );
        } finally {
          setOperation('syncingProfile', false);
          setOperation('syncingPlan', false);
          setOperation('syncingShopping', false);
        }
      }
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
    const nextState = {
      ...shoppingChecks,
      [itemKey]: !shoppingChecks[itemKey],
    };

    persistShoppingChecksLocally(activeUserId, nextState);

    if (!cloudSyncEnabled) {
      return;
    }

    setOperation('syncingShopping', true);

    void saveCloudShoppingChecks(activeUserId, nextState, installationId)
      .then(() => {
        setLastCloudInstallationId(installationId);
      })
      .catch((nextError) => {
        handleSyncFailure(
          'Shopping progress was saved locally, but cloud sync could not update the account.',
          nextError,
        );
      })
      .finally(() => {
        setOperation('syncingShopping', false);
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
        cloudSyncEnabled,
        lastCloudInstallationId,
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
