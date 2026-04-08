import {
  userProfileSchema,
  weeklyPlanSchema,
  type UserProfile,
  type WeeklyPlan,
} from '@nutrition-planner/shared';

import { supabase } from './supabase';

export type CloudWorkspace = {
  profile: UserProfile | null;
  currentPlan: WeeklyPlan | null;
  planHistory: WeeklyPlan[];
  shoppingChecks: Record<string, boolean>;
  lastInstallationId: string | null;
  hasAnyData: boolean;
};

type CloudWorkspaceSnapshot = {
  profile: UserProfile | null;
  currentPlan: WeeklyPlan | null;
  planHistory: WeeklyPlan[];
  shoppingChecks: Record<string, boolean>;
  installationId: string;
};

type CloudPlanRow = {
  userId: string;
  planId: string;
  plan: WeeklyPlan;
  source: string;
  isCurrent: boolean;
};

const assertSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase client is not configured for this build.');
  }

  return supabase;
};

const parseShoppingChecks = (value: unknown): Record<string, boolean> => {
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

const dedupePlans = (plans: WeeklyPlan[]): WeeklyPlan[] => {
  const seen = new Set<string>();
  const uniquePlans: WeeklyPlan[] = [];

  for (const plan of plans) {
    if (seen.has(plan.id)) {
      continue;
    }

    seen.add(plan.id);
    uniquePlans.push(plan);
  }

  return uniquePlans;
};

const parsePlanRows = (value: unknown): CloudPlanRow[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((row) => {
      if (!row || typeof row !== 'object') {
        return null;
      }

      const candidate = row as Record<string, unknown>;
      const userId = typeof candidate.user_id === 'string' ? candidate.user_id : null;
      const planId = typeof candidate.plan_id === 'string' ? candidate.plan_id : null;
      const source = typeof candidate.source === 'string' ? candidate.source : null;
      const parsedPlan = weeklyPlanSchema.safeParse(candidate.plan);

      if (!userId || !planId || !source || !parsedPlan.success) {
        return null;
      }

      return {
        userId,
        planId,
        source,
        plan: parsedPlan.data,
        isCurrent: candidate.is_current === true,
      } satisfies CloudPlanRow;
    })
    .filter((row): row is CloudPlanRow => Boolean(row));
};

const parseProfile = (value: unknown): UserProfile | null => {
  const parsed = userProfileSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

export const cloudSyncEnabled = (): boolean => Boolean(supabase);

export const loadCloudWorkspace = async (userId: string): Promise<CloudWorkspace> => {
  const client = assertSupabase();
  const [profileResult, plansResult, syncStateResult] = await Promise.all([
    client
      .from('user_profiles')
      .select('user_id, profile')
      .eq('user_id', userId)
      .maybeSingle(),
    client
      .from('user_plans')
      .select('user_id, plan_id, plan, source, is_current, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),
    client
      .from('user_sync_state')
      .select('user_id, shopping_checks, last_installation_id')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  if (profileResult.error) {
    throw new Error(profileResult.error.message);
  }

  if (plansResult.error) {
    throw new Error(plansResult.error.message);
  }

  if (syncStateResult.error) {
    throw new Error(syncStateResult.error.message);
  }

  const profile = parseProfile(profileResult.data?.profile ?? null);
  const parsedPlanRows = parsePlanRows(plansResult.data ?? []);
  const currentPlan =
    parsedPlanRows.find((row) => row.isCurrent)?.plan ?? parsedPlanRows[0]?.plan ?? null;
  const planHistory = dedupePlans(
    currentPlan
      ? [currentPlan, ...parsedPlanRows.map((row) => row.plan).filter((plan) => plan.id !== currentPlan.id)]
      : parsedPlanRows.map((row) => row.plan),
  ).slice(0, 12);
  const shoppingChecks = parseShoppingChecks(syncStateResult.data?.shopping_checks);
  const lastInstallationId =
    typeof syncStateResult.data?.last_installation_id === 'string'
      ? syncStateResult.data.last_installation_id
      : null;

  return {
    profile,
    currentPlan,
    planHistory,
    shoppingChecks,
    lastInstallationId,
    hasAnyData: Boolean(
      profile ||
        currentPlan ||
        planHistory.length > 0 ||
        Object.keys(shoppingChecks).length > 0 ||
        lastInstallationId,
    ),
  };
};

export const upsertCloudProfile = async (
  userId: string,
  profile: UserProfile,
): Promise<void> => {
  const client = assertSupabase();
  const { error } = await client.from('user_profiles').upsert(
    {
      user_id: userId,
      profile,
    },
    {
      onConflict: 'user_id',
    },
  );

  if (error) {
    throw new Error(error.message);
  }
};

export const syncCloudPlans = async (
  userId: string,
  currentPlan: WeeklyPlan | null,
  planHistory: WeeklyPlan[],
): Promise<void> => {
  const client = assertSupabase();
  const plans = dedupePlans(
    currentPlan
      ? [currentPlan, ...planHistory.filter((plan) => plan.id !== currentPlan.id)]
      : planHistory,
  ).slice(0, 12);

  const resetCurrentResult = await client
    .from('user_plans')
    .update({ is_current: false })
    .eq('user_id', userId)
    .eq('is_current', true);

  if (resetCurrentResult.error) {
    throw new Error(resetCurrentResult.error.message);
  }

  if (plans.length === 0) {
    return;
  }

  const rows = plans.map((plan) => ({
    user_id: userId,
    plan_id: plan.id,
    plan,
    validation: plan.validation,
    source: plan.source,
    is_current: currentPlan ? plan.id === currentPlan.id : false,
  }));
  const { error } = await client.from('user_plans').upsert(rows, {
    onConflict: 'user_id,plan_id',
  });

  if (error) {
    throw new Error(error.message);
  }
};

export const saveCloudShoppingChecks = async (
  userId: string,
  shoppingChecks: Record<string, boolean>,
  installationId: string,
): Promise<void> => {
  const client = assertSupabase();
  const { error } = await client.from('user_sync_state').upsert(
    {
      user_id: userId,
      shopping_checks: shoppingChecks,
      last_installation_id: installationId,
    },
    {
      onConflict: 'user_id',
    },
  );

  if (error) {
    throw new Error(error.message);
  }
};

export const pushLocalWorkspaceToCloud = async (
  userId: string,
  workspace: CloudWorkspaceSnapshot,
): Promise<void> => {
  if (workspace.profile) {
    await upsertCloudProfile(userId, workspace.profile);
  }

  await syncCloudPlans(userId, workspace.currentPlan, workspace.planHistory);
  await saveCloudShoppingChecks(userId, workspace.shoppingChecks, workspace.installationId);
};

export const deleteCloudWorkspace = async (userId: string): Promise<void> => {
  const client = assertSupabase();
  const [profileResult, plansResult, syncResult] = await Promise.all([
    client.from('user_profiles').delete().eq('user_id', userId),
    client.from('user_plans').delete().eq('user_id', userId),
    client.from('user_sync_state').delete().eq('user_id', userId),
  ]);

  if (profileResult.error) {
    throw new Error(profileResult.error.message);
  }

  if (plansResult.error) {
    throw new Error(plansResult.error.message);
  }

  if (syncResult.error) {
    throw new Error(syncResult.error.message);
  }
};
