import React, { createContext, useContext, useEffect, useState } from 'react';
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
import { clearStore, readJson, removeKey, writeJson } from './database';

type AppSettings = {
  apiBaseUrl: string;
};

type AppStoreValue = {
  ready: boolean;
  busy: boolean;
  error: string | null;
  installationId: string;
  apiBaseUrl: string;
  profile: UserProfile | null;
  currentPlan: WeeklyPlan | null;
  planHistory: WeeklyPlan[];
  saveProfile: (profile: UserProfile) => Promise<void>;
  generateWeek: (profileOverride?: UserProfile) => Promise<void>;
  replanCurrentPlan: (request: ReplanRequest) => Promise<void>;
  validateCurrentPlan: () => Promise<PlanValidation | null>;
  updateApiBaseUrl: (nextUrl: string) => Promise<void>;
  exportBackupFile: () => Promise<string | null>;
  importBackupFile: () => Promise<boolean>;
  resetAllData: () => Promise<void>;
  clearError: () => void;
};

const defaultSettings: AppSettings = {
  apiBaseUrl: getDefaultApiUrl(),
};

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

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [installationId, setInstallationId] = useState('');
  const [apiBaseUrl, setApiBaseUrl] = useState(defaultSettings.apiBaseUrl);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentPlan, setCurrentPlan] = useState<WeeklyPlan | null>(null);
  const [planHistory, setPlanHistory] = useState<WeeklyPlan[]>([]);

  useEffect(() => {
    const storedInstallationId = readJson<string>('installationId') ?? createInstallationId();
    const storedSettings = safeParseSettings(readJson<AppSettings>('settings'));
    const storedProfile = safeParseProfile(readJson<UserProfile>('profile'));
    const storedCurrentPlan = safeParsePlan(readJson<WeeklyPlan>('currentPlan'));
    const storedPlanHistory = safeParsePlanHistory(readJson<WeeklyPlan[]>('planHistory'));

    writeJson('installationId', storedInstallationId);
    writeJson('settings', storedSettings);
    setInstallationId(storedInstallationId);
    setApiBaseUrl(storedSettings.apiBaseUrl);
    setProfile(storedProfile);
    setCurrentPlan(storedCurrentPlan);
    setPlanHistory(storedPlanHistory);
    setReady(true);
  }, []);

  const clearError = () => {
    setError(null);
  };

  const saveProfile = async (nextProfile: UserProfile) => {
    setBusy(true);
    setError(null);

    try {
      writeJson('profile', nextProfile);
      setProfile(nextProfile);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to save profile');
      throw nextError;
    } finally {
      setBusy(false);
    }
  };

  const generateWeek = async (profileOverride?: UserProfile) => {
    const effectiveProfile = profileOverride ?? profile;

    if (!effectiveProfile) {
      setError('Create a profile before generating a plan.');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const plan = await generatePlan(apiBaseUrl, effectiveProfile, installationId);
      const nextHistory = dedupeHistory(planHistory, plan);

      writeJson('currentPlan', plan);
      writeJson('planHistory', nextHistory);
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
      setBusy(false);
    }
  };

  const replanCurrentPlan = async (request: ReplanRequest) => {
    if (!profile || !currentPlan) {
      setError('You need an active profile and weekly plan before replanning.');
      return;
    }

    setBusy(true);
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

      writeJson('currentPlan', plan);
      writeJson('planHistory', nextHistory);
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
      setBusy(false);
    }
  };

  const validateCurrentPlan = async (): Promise<PlanValidation | null> => {
    if (!profile || !currentPlan) {
      return null;
    }

    setBusy(true);
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

      writeJson('currentPlan', nextPlan);
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
      setBusy(false);
    }
  };

  const updateApiBaseUrl = async (nextUrl: string) => {
    const normalized = nextUrl.trim() || defaultSettings.apiBaseUrl;
    const nextSettings = { apiBaseUrl: normalized };

    writeJson('settings', nextSettings);
    setApiBaseUrl(normalized);
  };

  const exportBackupFile = async (): Promise<string | null> => {
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
  };

  const importBackupFile = async (): Promise<boolean> => {
    setError(null);
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || !result.assets?.[0]) {
      return false;
    }

    try {
      const fileContent = await FileSystemLegacy.readAsStringAsync(result.assets[0].uri, {
        encoding: 'utf8',
      });
      const bundle = exportBundleV1Schema.parse(JSON.parse(fileContent));
      const nextSettings = safeParseSettings(readJson<AppSettings>('settings'));

      if (bundle.profile) {
        writeJson('profile', bundle.profile);
      } else {
        removeKey('profile');
      }

      if (bundle.currentPlan) {
        writeJson('currentPlan', bundle.currentPlan);
      } else {
        removeKey('currentPlan');
      }

      writeJson('planHistory', bundle.planHistory);
      writeJson('settings', nextSettings);
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
    }
  };

  const resetAllData = async () => {
    clearStore();
    const nextInstallationId = createInstallationId();

    writeJson('installationId', nextInstallationId);
    writeJson('settings', defaultSettings);
    setInstallationId(nextInstallationId);
    setApiBaseUrl(defaultSettings.apiBaseUrl);
    setProfile(null);
    setCurrentPlan(null);
    setPlanHistory([]);
    setError(null);
  };

  return (
    <AppStoreContext.Provider
      value={{
        ready,
        busy,
        error,
        installationId,
        apiBaseUrl,
        profile,
        currentPlan,
        planHistory,
        saveProfile,
        generateWeek,
        replanCurrentPlan,
        validateCurrentPlan,
        updateApiBaseUrl,
        exportBackupFile,
        importBackupFile,
        resetAllData,
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
