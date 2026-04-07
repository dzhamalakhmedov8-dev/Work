import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { PlanValidation, UserProfile, WeeklyPlan } from '../../../packages/shared/src';

type PlannerAction = 'generate' | 'replan' | 'validate';

type PersistPlannerSnapshotInput = {
  action: PlannerAction;
  installationId?: string | null;
  profile: UserProfile;
  plan: WeeklyPlan;
  validation: PlanValidation;
  requestPayload: unknown;
  responsePayload: unknown;
  source?: string;
};

export type SupabasePersistenceMeta = {
  provider: 'supabase' | 'none';
  configured: boolean;
  persisted: boolean;
  eventLogged: boolean;
  reason?: string;
};

const plannerInstallationsTable = 'planner_installations';
const plannerEventsTable = 'planner_events';

let cachedClient: SupabaseClient | null | undefined;

const normalizeValue = (value: string | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const normalizeInstallationId = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, 120);
};

export const getSupabaseStatus = () => {
  const url = normalizeValue(process.env.SUPABASE_URL);
  const hasServiceRoleKey = Boolean(normalizeValue(process.env.SUPABASE_SERVICE_ROLE_KEY));

  return {
    configured: Boolean(url && hasServiceRoleKey),
    hasServiceRoleKey,
    url,
  };
};

const getSupabaseAdminClient = (): SupabaseClient | null => {
  if (cachedClient !== undefined) {
    return cachedClient;
  }

  const { configured, url } = getSupabaseStatus();
  const serviceRoleKey = normalizeValue(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!configured || !url || !serviceRoleKey) {
    cachedClient = null;
    return cachedClient;
  }

  cachedClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedClient;
};

export const persistPlannerSnapshot = async (
  input: PersistPlannerSnapshotInput,
): Promise<SupabasePersistenceMeta> => {
  const client = getSupabaseAdminClient();
  const installationId = normalizeInstallationId(input.installationId);

  if (!client) {
    return {
      provider: 'none',
      configured: false,
      persisted: false,
      eventLogged: false,
      reason: 'supabase-not-configured',
    };
  }

  if (!installationId) {
    return {
      provider: 'supabase',
      configured: true,
      persisted: false,
      eventLogged: false,
      reason: 'missing-installation-id',
    };
  }

  const now = new Date().toISOString();

  const { error: snapshotError } = await client.from(plannerInstallationsTable).upsert(
    {
      installation_id: installationId,
      profile_id: input.profile.id,
      profile: input.profile,
      current_plan_id: input.plan.id,
      current_plan: input.plan,
      current_validation: input.validation,
      current_plan_source: input.source ?? input.plan.source,
      last_action: input.action,
      last_request_meta: {
        syncedAt: now,
        action: input.action,
        source: input.source ?? input.plan.source,
      },
      updated_at: now,
    },
    {
      onConflict: 'installation_id',
    },
  );

  if (snapshotError) {
    console.error('[supabase] failed to persist planner snapshot', snapshotError);
    return {
      provider: 'supabase',
      configured: true,
      persisted: false,
      eventLogged: false,
      reason: snapshotError.message,
    };
  }

  const { error: eventError } = await client.from(plannerEventsTable).insert({
    installation_id: installationId,
    action: input.action,
    profile_id: input.profile.id,
    plan_id: input.plan.id,
    request_payload: input.requestPayload,
    response_payload: input.responsePayload,
  });

  if (eventError) {
    console.error('[supabase] failed to log planner event', eventError);
    return {
      provider: 'supabase',
      configured: true,
      persisted: true,
      eventLogged: false,
      reason: eventError.message,
    };
  }

  return {
    provider: 'supabase',
    configured: true,
    persisted: true,
    eventLogged: true,
  };
};
