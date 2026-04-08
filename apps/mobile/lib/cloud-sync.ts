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

export type CloudWorkspaceSnapshot = {
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

type ShoppingCheckRow = {
  user_id: string;
  plan_id: string;
  ingredient_id: string;
  checked: boolean;
};

const assertSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase client is not configured for this build.');
  }

  return supabase;
};

const buildShoppingCheckKey = (planId: string, ingredientId: string): string =>
  `${planId}:${ingredientId}`;

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

const parseShoppingRows = (value: unknown): Record<string, boolean> => {
  if (!Array.isArray(value)) {
    return {};
  }

  return value.reduce<Record<string, boolean>>((accumulator, item) => {
    if (!item || typeof item !== 'object') {
      return accumulator;
    }

    const row = item as Partial<ShoppingCheckRow>;
    if (
      typeof row.plan_id === 'string' &&
      typeof row.ingredient_id === 'string' &&
      row.checked === true
    ) {
      accumulator[buildShoppingCheckKey(row.plan_id, row.ingredient_id)] = true;
    }

    return accumulator;
  }, {});
};

const shoppingChecksToRows = (
  shoppingChecks: Record<string, boolean>,
): Array<{ plan_id: string; ingredient_id: string; checked: boolean }> =>
  Object.entries(shoppingChecks).reduce<Array<{ plan_id: string; ingredient_id: string; checked: boolean }>>(
    (rows, [compositeKey, checked]) => {
      if (!checked) {
        return rows;
      }

      const [planId, ingredientId] = compositeKey.split(':');
      if (!planId || !ingredientId) {
        return rows;
      }

      rows.push({
        plan_id: planId,
        ingredient_id: ingredientId,
        checked: true,
      });

      return rows;
    },
    [],
  );

export const cloudSyncEnabled = (): boolean => Boolean(supabase);

export const loadCloudWorkspace = async (userId: string): Promise<CloudWorkspace> => {
  const client = assertSupabase();
  const [profileResult, plansResult, syncStateResult, shoppingChecksResult] = await Promise.all([
    client.from('user_profiles').select('user_id, profile').eq('user_id', userId).maybeSingle(),
    client
      .from('user_plans')
      .select('user_id, plan_id, plan, source, is_current, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),
    client
      .from('user_sync_state')
      .select('user_id, last_installation_id')
      .eq('user_id', userId)
      .maybeSingle(),
    client
      .from('user_shopping_checks')
      .select('user_id, plan_id, ingredient_id, checked')
      .eq('user_id', userId),
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

  if (shoppingChecksResult.error) {
    throw new Error(shoppingChecksResult.error.message);
  }

  const profile = parseProfile(profileResult.data?.profile ?? null);
  const parsedPlanRows = parsePlanRows(plansResult.data ?? []);
  const currentPlan =
    parsedPlanRows.find((row) => row.isCurrent)?.plan ?? parsedPlanRows[0]?.plan ?? null;
  const planHistory = dedupePlans(
    currentPlan
      ? [
          currentPlan,
          ...parsedPlanRows
            .map((row) => row.plan)
            .filter((plan) => plan.id !== currentPlan.id),
        ]
      : parsedPlanRows.map((row) => row.plan),
  ).slice(0, 12);
  const shoppingChecks = parseShoppingRows(shoppingChecksResult.data ?? []);
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

export const upsertCloudProfile = async (profile: UserProfile): Promise<void> => {
  const client = assertSupabase();
  const { error } = await client.rpc('upsert_user_profile', {
    profile,
  });

  if (error) {
    throw new Error(error.message);
  }
};

export const syncCloudPlans = async (
  currentPlan: WeeklyPlan | null,
  planHistory: WeeklyPlan[],
): Promise<void> => {
  const client = assertSupabase();

  if (currentPlan) {
    const replaceResult = await client.rpc('replace_user_current_plan', {
      plan: currentPlan,
      validation: currentPlan.validation,
      source: currentPlan.source,
    });

    if (replaceResult.error) {
      throw new Error(replaceResult.error.message);
    }
  }

  const history = dedupePlans(
    currentPlan
      ? planHistory.filter((plan) => plan.id !== currentPlan.id)
      : planHistory,
  ).slice(0, 12);

  const historyResult = await client.rpc('upsert_user_plan_history', {
    plans: history,
  });

  if (historyResult.error) {
    throw new Error(historyResult.error.message);
  }
};

export const setCloudShoppingCheck = async (
  planId: string,
  ingredientId: string,
  checked: boolean,
  installationId: string,
): Promise<void> => {
  const client = assertSupabase();
  const { error } = await client.rpc('set_user_shopping_check', {
    plan_id: planId,
    ingredient_id: ingredientId,
    checked,
    installation_id: installationId,
  });

  if (error) {
    throw new Error(error.message);
  }
};

export const replaceCloudShoppingChecks = async (
  shoppingChecks: Record<string, boolean>,
  installationId: string,
): Promise<void> => {
  const client = assertSupabase();
  const { error } = await client.rpc('replace_user_shopping_checks', {
    checks: shoppingChecksToRows(shoppingChecks),
    installation_id: installationId,
  });

  if (error) {
    throw new Error(error.message);
  }
};

export const pushLocalWorkspaceToCloud = async (
  workspace: CloudWorkspaceSnapshot,
): Promise<void> => {
  if (workspace.profile) {
    await upsertCloudProfile(workspace.profile);
  }

  await syncCloudPlans(workspace.currentPlan, workspace.planHistory);
  await replaceCloudShoppingChecks(workspace.shoppingChecks, workspace.installationId);
};

export const deleteCloudWorkspace = async (): Promise<void> => {
  const client = assertSupabase();
  const { error } = await client.rpc('clear_user_workspace');

  if (error) {
    throw new Error(error.message);
  }
};
