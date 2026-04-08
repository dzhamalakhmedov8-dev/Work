import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
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
  setCloudShoppingCheck,
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
import {
  mapBackupError,
  mapPlannerError,
  mapSyncError,
  mapWorkspaceError,
  type MappedClientError,
} from './error-mapping';
import { useAuthStore } from './auth-store';

type AppSettings = {
  apiBaseUrl: string;
};

type AppOperationState = {
  savingProfile: boolean;
  generating: boolean;
  replanning: boolean;
  validating: boolean;
  resumingPendingAction: boolean;
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

type AccountStatusKind =
  | 'local-only'
  | 'syncing'
  | 'synced'
  | 'reconnect-required'
  | 'sync-error';

type AccountStatus = {
  kind: AccountStatusKind;
  title: string;
  message: string;
  tone: 'neutral' | 'success' | 'warm' | 'danger';
};

type LegacyWorkspaceSummary = {
  profileName: string | null;
  hasProfile: boolean;
  hasCurrentPlan: boolean;
  planHistoryCount: number;
  checkedItems: number;
};

type BackupImportMode = 'local-only' | 'local-and-cloud';

type BackupImportPreview = {
  bundle: ExportBundleV1;
  summary: {
    hasProfile: boolean;
    currentPlanTitle: string | null;
    historyCount: number;
  };
};

type PendingPlannerAction =
  | {
      type: 'generate';
      profile: UserProfile;
      returnPath?: string | null;
    }
  | {
      type: 'replan';
      request: ReplanRequest;
      returnPath?: string | null;
    }
  | {
      type: 'validate';
      returnPath?: string | null;
    };

type PendingPlannerActionSummary = {
  title: string;
  message: string;
};

type LocalWorkspace = {
  profile: UserProfile | null;
  currentPlan: WeeklyPlan | null;
  planHistory: WeeklyPlan[];
  shoppingChecks: Record<string, boolean>;
  hasAnyData: boolean;
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
  readOnlyMode: boolean;
  hasLegacyDeviceData: boolean;
  legacyDeviceDataSummary: LegacyWorkspaceSummary | null;
  accountStatus: AccountStatus;
  pendingPlannerAction: PendingPlannerAction | null;
  pendingPlannerActionSummary: PendingPlannerActionSummary | null;
  saveProfile: (profile: UserProfile) => Promise<void>;
  generateWeek: (
    profileOverride?: UserProfile,
    options?: { returnPath?: string },
  ) => Promise<void>;
  replanCurrentPlan: (
    request: ReplanRequest,
    options?: { returnPath?: string },
  ) => Promise<void>;
  validateCurrentPlan: (options?: {
    returnPath?: string;
  }) => Promise<PlanValidation | null>;
  queueGenerateWeekAfterAuth: (profileOverride: UserProfile, returnPath?: string) => Promise<void>;
  updateApiBaseUrl: (nextUrl: string) => Promise<void>;
  exportBackupFile: () => Promise<string | null>;
  prepareBackupImport: () => Promise<BackupImportPreview | null>;
  applyBackupImport: (bundle: ExportBundleV1, mode: BackupImportMode) => Promise<boolean>;
  importLegacyDeviceData: (mode: BackupImportMode) => Promise<boolean>;
  clearLocalDeviceData: () => Promise<void>;
  clearCloudWorkspace: () => Promise<void>;
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
  resumingPendingAction: false,
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
const lastWorkspaceUserIdKey = 'lastWorkspaceUserId';
const pendingPlannerActionKey = 'pendingPlannerAction';

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

const safeParsePendingPlannerAction = (value: unknown): PendingPlannerAction | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const returnPath =
    typeof candidate.returnPath === 'string' && candidate.returnPath.trim().length > 0
      ? candidate.returnPath.trim()
      : null;

  if (candidate.type === 'generate') {
    const parsedProfile = safeParseProfile(candidate.profile);
    if (!parsedProfile) {
      return null;
    }

    return {
      type: 'generate',
      profile: parsedProfile,
      returnPath,
    };
  }

  if (candidate.type === 'replan') {
    const request = candidate.request;

    if (!request || typeof request !== 'object' || Array.isArray(request)) {
      return null;
    }

    const parsedRequest = request as Partial<ReplanRequest>;
    if (
      parsedRequest.scope !== 'meal' &&
      parsedRequest.scope !== 'day' &&
      parsedRequest.scope !== 'week'
    ) {
      return null;
    }

    if (
      parsedRequest.reason !== 'refresh' &&
      parsedRequest.reason !== 'skip' &&
      parsedRequest.reason !== 'dislike' &&
      parsedRequest.reason !== 'ingredient_unavailable'
    ) {
      return null;
    }

    return {
      type: 'replan',
      request: {
        scope: parsedRequest.scope,
        reason: parsedRequest.reason,
        dayIndex:
          typeof parsedRequest.dayIndex === 'number' ? parsedRequest.dayIndex : undefined,
        mealSlotId:
          typeof parsedRequest.mealSlotId === 'string' ? parsedRequest.mealSlotId : undefined,
        blockedFoods: Array.isArray(parsedRequest.blockedFoods)
          ? parsedRequest.blockedFoods.filter(
              (item): item is string => typeof item === 'string' && item.trim().length > 0,
            )
          : [],
        preferredCuisines: Array.isArray(parsedRequest.preferredCuisines)
          ? parsedRequest.preferredCuisines.filter(
              (item): item is string => typeof item === 'string' && item.trim().length > 0,
            )
          : [],
      },
      returnPath,
    };
  }

  if (candidate.type === 'validate') {
    return {
      type: 'validate',
      returnPath,
    };
  }

  return null;
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

const readLocalWorkspace = (userId: string): LocalWorkspace => {
  const localProfile = safeParseProfile(readJson<UserProfile>(scopedDataKey(profileKey, userId)));
  const localCurrentPlan = safeParsePlan(
    readJson<WeeklyPlan>(scopedDataKey(currentPlanKey, userId)),
  );
  const localPlanHistory = safeParsePlanHistory(
    readJson<WeeklyPlan[]>(scopedDataKey(planHistoryKey, userId)),
  );
  const localShoppingChecks = safeParseShoppingChecks(
    readJson<Record<string, boolean>>(scopedDataKey(shoppingChecksKey, userId)),
  );

  return {
    profile: localProfile,
    currentPlan: localCurrentPlan,
    planHistory: localPlanHistory,
    shoppingChecks: localShoppingChecks,
    hasAnyData:
      Boolean(localProfile) ||
      Boolean(localCurrentPlan) ||
      localPlanHistory.length > 0 ||
      Object.keys(localShoppingChecks).length > 0,
  };
};

const readLegacyWorkspace = (): LocalWorkspace => {
  const legacyProfile = safeParseProfile(readJson<UserProfile>(profileKey));
  const legacyCurrentPlan = safeParsePlan(readJson<WeeklyPlan>(currentPlanKey));
  const legacyPlanHistory = safeParsePlanHistory(readJson<WeeklyPlan[]>(planHistoryKey));
  const legacyShoppingChecks = safeParseShoppingChecks(
    readJson<Record<string, boolean>>(shoppingChecksKey),
  );

  return {
    profile: legacyProfile,
    currentPlan: legacyCurrentPlan,
    planHistory: legacyPlanHistory,
    shoppingChecks: legacyShoppingChecks,
    hasAnyData:
      Boolean(legacyProfile) ||
      Boolean(legacyCurrentPlan) ||
      legacyPlanHistory.length > 0 ||
      Object.keys(legacyShoppingChecks).length > 0,
  };
};

const clearLegacyWorkspace = () => {
  removeKey(profileKey);
  removeKey(currentPlanKey);
  removeKey(planHistoryKey);
  removeKey(shoppingChecksKey);
};

const summarizeLegacyWorkspace = (workspace: LocalWorkspace): LegacyWorkspaceSummary | null => {
  if (!workspace.hasAnyData) {
    return null;
  }

  return {
    profileName: workspace.profile?.name ?? null,
    hasProfile: Boolean(workspace.profile),
    hasCurrentPlan: Boolean(workspace.currentPlan),
    planHistoryCount: workspace.planHistory.length,
    checkedItems: Object.values(workspace.shoppingChecks).filter(Boolean).length,
  };
};

const summarizeBackupImport = (bundle: ExportBundleV1): BackupImportPreview['summary'] => ({
  hasProfile: Boolean(bundle.profile),
  currentPlanTitle: bundle.currentPlan?.days?.[0]?.meals?.[0]?.recipe.title ?? null,
  historyCount: bundle.planHistory.length,
});

const summarizePendingPlannerAction = (
  action: PendingPlannerAction | null,
): PendingPlannerActionSummary | null => {
  if (!action) {
    return null;
  }

  if (action.type === 'generate') {
    return {
      title: 'Sign in to generate your week',
      message:
        'Your profile is ready. After sign-in, the app will save it and send the generation request to the planner.',
    };
  }

  if (action.type === 'replan') {
    return {
      title: 'Sign in to apply this replan',
      message:
        'The replacement request is queued. After sign-in, the planner will continue with this exact replan action.',
    };
  }

  return {
    title: 'Sign in to validate the current plan',
    message:
      'Validation is waiting for an authenticated session. After sign-in, the app will continue automatically.',
  };
};

const reconnectMessage = 'Reconnect the account before editing or syncing this workspace.';

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const { ready: authReady, session, user } = useAuthStore();
  const [ready, setReady] = useState(false);
  const [operations, setOperations] = useState<AppOperationState>(defaultOperations);
  const [error, setError] = useState<string | null>(null);
  const [syncIssue, setSyncIssue] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [installationId, setInstallationId] = useState('');
  const [apiBaseUrl, setApiBaseUrl] = useState(defaultSettings.apiBaseUrl);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentPlan, setCurrentPlan] = useState<WeeklyPlan | null>(null);
  const [planHistory, setPlanHistory] = useState<WeeklyPlan[]>([]);
  const [shoppingChecks, setShoppingChecks] = useState<Record<string, boolean>>({});
  const [lastCloudInstallationId, setLastCloudInstallationId] = useState<string | null>(null);
  const [readOnlyMode, setReadOnlyMode] = useState(false);
  const [localWorkspaceUserId, setLocalWorkspaceUserId] = useState<string | null>(null);
  const [hasLegacyDeviceData, setHasLegacyDeviceData] = useState(false);
  const [legacyDeviceDataSummary, setLegacyDeviceDataSummary] =
    useState<LegacyWorkspaceSummary | null>(null);
  const [pendingPlannerAction, setPendingPlannerAction] = useState<PendingPlannerAction | null>(
    null,
  );

  const activeUserId = user?.id ?? null;
  const activeAccessToken = session?.access_token ?? null;
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

  const applyWorkspaceToState = (
    workspaceUserId: string | null,
    workspace: LocalWorkspace,
    nextReadOnlyMode: boolean,
  ) => {
    setLocalWorkspaceUserId(workspaceUserId);
    setReadOnlyMode(nextReadOnlyMode);
    setProfile(workspace.profile);
    setCurrentPlan(workspace.currentPlan);
    setPlanHistory(workspace.planHistory);
    setShoppingChecks(workspace.shoppingChecks);
  };

  const persistProfileLocally = (userId: string, nextProfile: UserProfile | null) => {
    writeOrRemoveJson(scopedDataKey(profileKey, userId), nextProfile);
    setProfile(nextProfile);
    setLocalWorkspaceUserId(userId);
    setReadOnlyMode(false);
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
    setLocalWorkspaceUserId(userId);
    setReadOnlyMode(false);
  };

  const persistShoppingChecksLocally = (
    userId: string,
    nextShoppingChecks: Record<string, boolean>,
  ) => {
    writeOrRemoveJson(scopedDataKey(shoppingChecksKey, userId), nextShoppingChecks);
    setShoppingChecks(nextShoppingChecks);
    setLocalWorkspaceUserId(userId);
  };

  const setUserFacingError = (mapped: MappedClientError) => {
    setError(mapped.message);
  };

  const handleSyncFailure = (
    action:
      | 'hydrate'
      | 'profile'
      | 'plan'
      | 'shopping'
      | 'workspace-clear'
      | 'legacy-import'
      | 'backup-import',
    nextError: unknown,
  ) => {
    const mapped = mapSyncError(action, nextError);
    setSyncIssue(mapped.message);
    showToast(mapped.message, 'danger');
  };

  const requireEditableSession = (): boolean => {
    if (activeUserId) {
      return true;
    }

    setError(reconnectMessage);
    return false;
  };

  const clearScopedWorkspaceForUser = (userId: string) => {
    removeKey(scopedDataKey(profileKey, userId));
    removeKey(scopedDataKey(currentPlanKey, userId));
    removeKey(scopedDataKey(planHistoryKey, userId));
    removeKey(scopedDataKey(shoppingChecksKey, userId));
  };

  const clearPendingPlannerActionState = () => {
    removeKey(pendingPlannerActionKey);
    setPendingPlannerAction(null);
  };

  const queuePendingPlannerAction = async (
    action: PendingPlannerAction,
    message?: string,
  ) => {
    writeJson(pendingPlannerActionKey, action);
    setPendingPlannerAction(action);
    setError(null);

    if (message) {
      showToast(message, 'neutral');
    }

    router.push('/auth' as never);
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
      const legacyWorkspace = readLegacyWorkspace();
      const storedPendingPlannerAction = safeParsePendingPlannerAction(
        readJson<PendingPlannerAction>(pendingPlannerActionKey),
      );

      writeJson(installationIdKey, storedInstallationId);
      writeJson(settingsKey, storedSettings);
      setInstallationId(storedInstallationId);
      setApiBaseUrl(storedSettings.apiBaseUrl);
      setHasLegacyDeviceData(legacyWorkspace.hasAnyData);
      setLegacyDeviceDataSummary(summarizeLegacyWorkspace(legacyWorkspace));
      setPendingPlannerAction(storedPendingPlannerAction);
      setError(null);

      if (!activeUserId) {
        applyWorkspaceToState(
          null,
          {
            profile: null,
            currentPlan: null,
            planHistory: [],
            shoppingChecks: {},
            hasAnyData: false,
          },
          false,
        );
        setLastCloudInstallationId(null);

        setReady(true);
        return;
      }

      writeJson(lastWorkspaceUserIdKey, activeUserId);

      const localWorkspace = readLocalWorkspace(activeUserId);
      applyWorkspaceToState(activeUserId, localWorkspace, false);
      setLastCloudInstallationId(null);
      setSyncIssue(null);
      setReady(true);

      if (!cloudSyncEnabled) {
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
          setSyncIssue(null);
          return;
        }

        if (localWorkspace.hasAnyData) {
          await pushLocalWorkspaceToCloud({
            profile: localWorkspace.profile,
            currentPlan: localWorkspace.currentPlan,
            planHistory: localWorkspace.planHistory,
            shoppingChecks: localWorkspace.shoppingChecks,
            installationId: storedInstallationId,
          });
          setLastCloudInstallationId(storedInstallationId);
          setSyncIssue(null);
        }
      } catch (nextError) {
        if (!cancelled) {
          handleSyncFailure('hydrate', nextError);
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
  }, [activeUserId, authReady, cloudSyncEnabled]);

  useEffect(() => {
    if (
      !authReady ||
      !ready ||
      !activeUserId ||
      !activeAccessToken ||
      !pendingPlannerAction ||
      operations.hydratingRemote ||
      operations.resumingPendingAction
    ) {
      return;
    }

    let cancelled = false;

    const resumePendingPlannerAction = async () => {
      setOperation('resumingPendingAction', true);
      setError(null);
      let successMessage: string | null = null;

      try {
        if (pendingPlannerAction.type === 'generate') {
          await performSaveProfile(pendingPlannerAction.profile);
          await performGenerateWeek(pendingPlannerAction.profile);
          successMessage = 'Your week was generated after sign-in.';
        } else if (pendingPlannerAction.type === 'replan') {
          await performReplanCurrentPlan(pendingPlannerAction.request);
          successMessage = 'Your replan was applied after sign-in.';
        } else {
          await performValidateCurrentPlan();
          successMessage = 'Your plan was validated after sign-in.';
        }
      } catch {
        // The underlying action already stores the user-safe error message.
      } finally {
        if (!cancelled) {
          const returnPath = pendingPlannerAction.returnPath ?? '/(tabs)/profile';
          clearPendingPlannerActionState();
          setOperation('resumingPendingAction', false);
          if (successMessage) {
            showToast(successMessage, 'success');
          }
          router.replace(returnPath as never);
        }
      }
    };

    void resumePendingPlannerAction();

    return () => {
      cancelled = true;
    };
  }, [
    activeAccessToken,
    activeUserId,
    authReady,
    operations.hydratingRemote,
    operations.resumingPendingAction,
    pendingPlannerAction,
    ready,
  ]);

  const performSaveProfile = async (nextProfile: UserProfile) => {
    setOperation('savingProfile', true);
    setError(null);

    try {
      persistProfileLocally(activeUserId!, nextProfile);

      if (cloudSyncEnabled) {
        setOperation('syncingProfile', true);

        try {
          await upsertCloudProfile(nextProfile);
          setSyncIssue(null);
        } catch (nextError) {
          handleSyncFailure('profile', nextError);
        } finally {
          setOperation('syncingProfile', false);
        }
      }
    } catch {
      setError('The profile could not be saved on this device right now.');
      throw new Error('The profile could not be saved on this device right now.');
    } finally {
      setOperation('savingProfile', false);
    }
  };

  const saveProfile = async (nextProfile: UserProfile) => {
    if (!requireEditableSession()) {
      return;
    }

    await performSaveProfile(nextProfile);
  };

  const syncPlansAfterLocalChange = async (
    nextPlan: WeeklyPlan | null,
    nextHistory: WeeklyPlan[],
  ) => {
    if (!cloudSyncEnabled) {
      return;
    }

    setOperation('syncingPlan', true);

    try {
      await syncCloudPlans(nextPlan, nextHistory);
      setSyncIssue(null);
    } catch (nextError) {
      handleSyncFailure('plan', nextError);
    } finally {
      setOperation('syncingPlan', false);
    }
  };

  const performGenerateWeek = async (effectiveProfile: UserProfile) => {
    setOperation('generating', true);
    setError(null);

    try {
      const plan = await generatePlan(
        apiBaseUrl,
        effectiveProfile,
        installationId,
        activeAccessToken,
      );
      const nextHistory = dedupeHistory(planHistory, plan);

      persistPlanLocally(activeUserId!, plan, nextHistory);
      await syncPlansAfterLocalChange(plan, nextHistory);
    } catch (nextError) {
      const mapped = mapPlannerError('generate', nextError);
      setUserFacingError(mapped);
      throw new Error(mapped.message);
    } finally {
      setOperation('generating', false);
    }
  };

  const queueGenerateWeekAfterAuth = async (
    profileOverride: UserProfile,
    returnPath?: string,
  ) => {
    await queuePendingPlannerAction(
      {
        type: 'generate',
        profile: profileOverride,
        returnPath: returnPath ?? null,
      },
      'Sign in to generate the week from the profile you just confirmed.',
    );
  };

  const generateWeek = async (
    profileOverride?: UserProfile,
    options?: { returnPath?: string },
  ) => {
    const effectiveProfile = profileOverride ?? profile;

    if (!effectiveProfile) {
      setError('Complete the profile before generating a weekly plan.');
      return;
    }

    if (!activeUserId || !activeAccessToken) {
      await queueGenerateWeekAfterAuth(effectiveProfile, options?.returnPath);
      return;
    }

    await performGenerateWeek(effectiveProfile);
  };

  const performReplanCurrentPlan = async (request: ReplanRequest) => {
    if (!profile || !currentPlan) {
      setError('Generate a weekly plan before trying to replace meals or days.');
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
        activeAccessToken,
      );
      const nextHistory = dedupeHistory(planHistory, plan);

      persistPlanLocally(activeUserId!, plan, nextHistory);
      await syncPlansAfterLocalChange(plan, nextHistory);
    } catch (nextError) {
      const mapped = mapPlannerError('replan', nextError);
      setUserFacingError(mapped);
      throw new Error(mapped.message);
    } finally {
      setOperation('replanning', false);
    }
  };

  const replanCurrentPlan = async (
    request: ReplanRequest,
    options?: { returnPath?: string },
  ) => {
    if (!profile || !currentPlan) {
      setError('Generate a weekly plan before trying to replace meals or days.');
      return;
    }

    if (!activeUserId || !activeAccessToken) {
      await queuePendingPlannerAction(
        {
          type: 'replan',
          request,
          returnPath: options?.returnPath ?? null,
        },
        'Sign in to apply this replan request.',
      );
      return;
    }

    await performReplanCurrentPlan(request);
  };

  const performValidateCurrentPlan = async (): Promise<PlanValidation | null> => {
    if (!profile || !currentPlan) {
      setError('Generate a weekly plan before running validation.');
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
        activeAccessToken,
      );
      const nextPlan = {
        ...currentPlan,
        validation,
      };
      const nextHistory = planHistory.map((plan) => (plan.id === nextPlan.id ? nextPlan : plan));

      persistPlanLocally(activeUserId!, nextPlan, nextHistory);
      await syncPlansAfterLocalChange(nextPlan, nextHistory);
      return validation;
    } catch (nextError) {
      const mapped = mapPlannerError('validate', nextError);
      setUserFacingError(mapped);
      throw new Error(mapped.message);
    } finally {
      setOperation('validating', false);
    }
  };

  const validateCurrentPlan = async (
    options?: { returnPath?: string },
  ): Promise<PlanValidation | null> => {
    if (!profile || !currentPlan) {
      setError('Generate a weekly plan before running validation.');
      return null;
    }

    if (!activeUserId || !activeAccessToken) {
      await queuePendingPlannerAction(
        {
          type: 'validate',
          returnPath: options?.returnPath ?? null,
        },
        'Sign in to validate the current plan.',
      );
      return null;
    }

    return performValidateCurrentPlan();
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

  const prepareBackupImport = async (): Promise<BackupImportPreview | null> => {
    if (!requireEditableSession()) {
      return null;
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
        return null;
      }

      const fileContent = await FileSystemLegacy.readAsStringAsync(result.assets[0].uri, {
        encoding: 'utf8',
      });
      const bundle = exportBundleV1Schema.parse(JSON.parse(fileContent));

      return {
        bundle,
        summary: summarizeBackupImport(bundle),
      };
    } catch (nextError) {
      const mapped = mapBackupError('pick', nextError);
      setUserFacingError(mapped);
      throw new Error(mapped.message);
    } finally {
      setOperation('importing', false);
    }
  };

  const applyBackupImport = async (
    bundle: ExportBundleV1,
    mode: BackupImportMode,
  ): Promise<boolean> => {
    if (!requireEditableSession()) {
      return false;
    }

    setOperation('importing', true);
    setError(null);

    try {
      const nextSettings = safeParseSettings(readJson<AppSettings>(settingsKey));

      persistProfileLocally(activeUserId!, bundle.profile);
      persistPlanLocally(activeUserId!, bundle.currentPlan, bundle.planHistory);
      persistShoppingChecksLocally(activeUserId!, {});
      setApiBaseUrl(nextSettings.apiBaseUrl);
      writeJson(settingsKey, nextSettings);

      if (mode === 'local-and-cloud' && cloudSyncEnabled) {
        setOperation('syncingProfile', true);
        setOperation('syncingPlan', true);
        setOperation('syncingShopping', true);

        try {
          await deleteCloudWorkspace();
          await pushLocalWorkspaceToCloud({
            profile: bundle.profile,
            currentPlan: bundle.currentPlan,
            planHistory: bundle.planHistory,
            shoppingChecks: {},
            installationId,
          });
          setLastCloudInstallationId(installationId);
          setSyncIssue(null);
        } catch (nextError) {
          handleSyncFailure('backup-import', nextError);
        } finally {
          setOperation('syncingProfile', false);
          setOperation('syncingPlan', false);
          setOperation('syncingShopping', false);
        }
      } else {
        setSyncIssue('Cloud sync is unchanged. This device now has a local-only backup copy.');
      }

      return true;
    } catch (nextError) {
      const mapped = mapBackupError('apply', nextError);
      setUserFacingError(mapped);
      throw new Error(mapped.message);
    } finally {
      setOperation('importing', false);
    }
  };

  const importLegacyDeviceData = async (mode: BackupImportMode): Promise<boolean> => {
    if (!requireEditableSession()) {
      return false;
    }

    const legacyWorkspace = readLegacyWorkspace();

    if (!legacyWorkspace.hasAnyData) {
      setError('There is no previous device data left to import.');
      return false;
    }

    setOperation('importing', true);
    setError(null);

    try {
      persistProfileLocally(activeUserId!, legacyWorkspace.profile);
      persistPlanLocally(
        activeUserId!,
        legacyWorkspace.currentPlan,
        legacyWorkspace.planHistory,
      );
      persistShoppingChecksLocally(activeUserId!, legacyWorkspace.shoppingChecks);
      clearLegacyWorkspace();
      setHasLegacyDeviceData(false);
      setLegacyDeviceDataSummary(null);

      if (mode === 'local-and-cloud' && cloudSyncEnabled) {
        setOperation('syncingProfile', true);
        setOperation('syncingPlan', true);
        setOperation('syncingShopping', true);

        try {
          await pushLocalWorkspaceToCloud({
            profile: legacyWorkspace.profile,
            currentPlan: legacyWorkspace.currentPlan,
            planHistory: legacyWorkspace.planHistory,
            shoppingChecks: legacyWorkspace.shoppingChecks,
            installationId,
          });
          setLastCloudInstallationId(installationId);
          setSyncIssue(null);
        } catch (nextError) {
          handleSyncFailure('legacy-import', nextError);
        } finally {
          setOperation('syncingProfile', false);
          setOperation('syncingPlan', false);
          setOperation('syncingShopping', false);
        }
      } else {
        setSyncIssue('Cloud sync is unchanged. The imported device data is local-only for now.');
      }

      return true;
    } catch (nextError) {
      const mapped = mapWorkspaceError('legacy-import', nextError);
      setUserFacingError(mapped);
      throw new Error(mapped.message);
    } finally {
      setOperation('importing', false);
    }
  };

  const clearLocalDeviceData = async () => {
    const targetUserId = activeUserId ?? localWorkspaceUserId;

    if (!targetUserId) {
      setError('There is no device workspace to clear right now.');
      return;
    }

    setOperation('resetting', true);
    setError(null);

    try {
      clearScopedWorkspaceForUser(targetUserId);
      applyWorkspaceToState(
        activeUserId ? activeUserId : null,
        {
          profile: null,
          currentPlan: null,
          planHistory: [],
          shoppingChecks: {},
          hasAnyData: false,
        },
        !activeUserId,
      );
      setSyncIssue(
        activeUserId
          ? 'This device copy was cleared. The shared cloud workspace is unchanged.'
          : null,
      );

      if (!activeUserId) {
        removeKey(lastWorkspaceUserIdKey);
      }
    } catch (nextError) {
      const mapped = mapWorkspaceError('local-clear', nextError);
      setUserFacingError(mapped);
      throw new Error(mapped.message);
    } finally {
      setOperation('resetting', false);
    }
  };

  const clearCloudWorkspace = async () => {
    if (!requireEditableSession()) {
      return;
    }

    setOperation('resetting', true);
    setError(null);
    setOperation('syncingProfile', true);
    setOperation('syncingPlan', true);
    setOperation('syncingShopping', true);

    try {
      await deleteCloudWorkspace();
      clearScopedWorkspaceForUser(activeUserId!);
      applyWorkspaceToState(
        activeUserId!,
        {
          profile: null,
          currentPlan: null,
          planHistory: [],
          shoppingChecks: {},
          hasAnyData: false,
        },
        false,
      );
      setLastCloudInstallationId(null);
      setSyncIssue(null);
    } catch (nextError) {
      handleSyncFailure('workspace-clear', nextError);
      throw nextError;
    } finally {
      setOperation('syncingProfile', false);
      setOperation('syncingPlan', false);
      setOperation('syncingShopping', false);
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
    if (!currentPlan) {
      return;
    }

    if (!requireEditableSession()) {
      return;
    }

    const itemKey = buildShoppingCheckKey(currentPlan.id, ingredientId);
    const checked = !shoppingChecks[itemKey];
    const nextState = checked
      ? {
          ...shoppingChecks,
          [itemKey]: true,
        }
      : Object.fromEntries(Object.entries(shoppingChecks).filter(([key]) => key !== itemKey));

    persistShoppingChecksLocally(activeUserId!, nextState);

    if (!cloudSyncEnabled) {
      return;
    }

    setOperation('syncingShopping', true);

    void setCloudShoppingCheck(currentPlan.id, ingredientId, checked, installationId)
      .then(() => {
        setLastCloudInstallationId(installationId);
        setSyncIssue(null);
      })
      .catch((nextError) => {
        handleSyncFailure('shopping', nextError);
      })
      .finally(() => {
        setOperation('syncingShopping', false);
      });
  };

  const accountStatus = useMemo<AccountStatus>(() => {
    if (readOnlyMode) {
      return {
        kind: 'reconnect-required',
        title: 'Reconnect required',
        message: 'You are viewing the last device copy. Sign in again to edit or sync this workspace.',
        tone: 'warm',
      };
    }

    if (
      operations.hydratingRemote ||
      operations.syncingProfile ||
      operations.syncingPlan ||
      operations.syncingShopping
    ) {
      return {
        kind: 'syncing',
        title: 'Syncing account',
        message: 'The app is reconciling your local workspace with the shared account copy.',
        tone: 'neutral',
      };
    }

    if (syncIssue) {
      return {
        kind: 'sync-error',
        title: 'Cloud sync paused',
        message: syncIssue,
        tone: 'danger',
      };
    }

    if (cloudSyncEnabled && activeUserId) {
      return {
        kind: 'synced',
        title: 'Synced to your account',
        message: 'Profile, current plan, and shopping progress are linked to the shared workspace.',
        tone: 'success',
      };
    }

    return {
      kind: 'local-only',
      title: 'Local device mode',
      message: 'This copy is available on the current device only until the account reconnects.',
      tone: 'warm',
    };
  }, [
    activeUserId,
    cloudSyncEnabled,
    operations.hydratingRemote,
    operations.syncingPlan,
    operations.syncingProfile,
    operations.syncingShopping,
    readOnlyMode,
    syncIssue,
  ]);

  const pendingPlannerActionSummary = useMemo(
    () => summarizePendingPlannerAction(pendingPlannerAction),
    [pendingPlannerAction],
  );

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
        readOnlyMode,
        hasLegacyDeviceData,
        legacyDeviceDataSummary,
        accountStatus,
        pendingPlannerAction,
        pendingPlannerActionSummary,
        saveProfile,
        generateWeek,
        replanCurrentPlan,
        validateCurrentPlan,
        queueGenerateWeekAfterAuth,
        updateApiBaseUrl,
        exportBackupFile,
        prepareBackupImport,
        applyBackupImport,
        importLegacyDeviceData,
        clearLocalDeviceData,
        clearCloudWorkspace,
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
