type ErrorAudience = 'auth' | 'planner' | 'sync' | 'backup' | 'workspace';

type MappedClientError = {
  audience: ErrorAudience;
  code: string;
  message: string;
};

const debugLog = (context: string, error: unknown) => {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.error(`[mobile:${context}]`, error);
  }
};

const normalizeMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message.trim();
  }

  if (typeof error === 'string') {
    return error.trim();
  }

  return '';
};

const includesAny = (value: string, patterns: string[]): boolean =>
  patterns.some((pattern) => value.includes(pattern));

export const mapAuthError = (
  action: 'sign-in' | 'sign-up' | 'oauth' | 'sign-out' | 'restore' | 'callback',
  error: unknown,
): MappedClientError => {
  const normalized = normalizeMessage(error).toLowerCase();
  debugLog(`auth:${action}`, error);

  if (includesAny(normalized, ['invalid login credentials', 'invalid grant'])) {
    return {
      audience: 'auth',
      code: 'auth/invalid-credentials',
      message: 'Sign-in failed. Check the email and password, then try again.',
    };
  }

  if (includesAny(normalized, ['email not confirmed', 'email link is invalid or has expired'])) {
    return {
      audience: 'auth',
      code: 'auth/email-confirmation-required',
      message: 'Check your email to confirm the account before signing in.',
    };
  }

  if (includesAny(normalized, ['provider is not enabled', 'unsupported provider'])) {
    return {
      audience: 'auth',
      code: 'auth/provider-disabled',
      message: 'This sign-in provider is not fully configured yet.',
    };
  }

  if (includesAny(normalized, ['refresh token', 'jwt expired', 'session expired'])) {
    return {
      audience: 'auth',
      code: 'auth/session-expired',
      message: 'Your session expired. Sign in again to keep editing and syncing.',
    };
  }

  if (action === 'sign-out') {
    return {
      audience: 'auth',
      code: 'auth/sign-out-failed',
      message: 'Could not sign out right now. Try again in a moment.',
    };
  }

  if (action === 'sign-up') {
    return {
      audience: 'auth',
      code: 'auth/sign-up-failed',
      message: 'Account setup could not be completed right now.',
    };
  }

  if (action === 'oauth') {
    return {
      audience: 'auth',
      code: 'auth/oauth-failed',
      message: 'Social sign-in could not be completed right now.',
    };
  }

  if (action === 'callback') {
    return {
      audience: 'auth',
      code: 'auth/callback-failed',
      message: 'The sign-in callback could not be completed. Try again.',
    };
  }

  if (action === 'restore') {
    return {
      audience: 'auth',
      code: 'auth/restore-failed',
      message: 'The account session could not be restored right now.',
    };
  }

  return {
    audience: 'auth',
    code: 'auth/sign-in-failed',
    message: 'Sign-in failed. Try again in a moment.',
  };
};

export const mapSyncError = (
  action:
    | 'hydrate'
    | 'profile'
    | 'plan'
    | 'shopping'
    | 'workspace-clear'
    | 'legacy-import'
    | 'backup-import',
  error: unknown,
): MappedClientError => {
  const normalized = normalizeMessage(error).toLowerCase();
  debugLog(`sync:${action}`, error);

  if (
    includesAny(normalized, [
      'jwt expired',
      'invalid jwt',
      'auth session missing',
      'permission denied',
      'row-level security',
      'not authenticated',
    ])
  ) {
    return {
      audience: 'sync',
      code: 'sync/reconnect-required',
      message: 'Reconnect the account before the app can sync changes.',
    };
  }

  if (
    includesAny(normalized, [
      'relation',
      'schema cache',
      'function',
      'column',
      'no route matched',
      'failed to fetch',
      'network request failed',
      'timeout',
    ])
  ) {
    return {
      audience: 'sync',
      code: 'sync/unavailable',
      message: 'Cloud sync is temporarily unavailable. Local data is still safe on this device.',
    };
  }

  if (action === 'workspace-clear') {
    return {
      audience: 'sync',
      code: 'sync/cloud-clear-failed',
      message: 'The device was updated, but the shared cloud workspace could not be cleared.',
    };
  }

  return {
    audience: 'sync',
    code: 'sync/general-failure',
    message: 'Cloud sync is temporarily unavailable. Local data is still safe on this device.',
  };
};

export const mapPlannerError = (
  action: 'generate' | 'replan' | 'validate',
  error: unknown,
): MappedClientError => {
  const normalized = normalizeMessage(error).toLowerCase();
  debugLog(`planner:${action}`, error);

  if (includesAny(normalized, ['failed to fetch', 'network request failed', 'timeout'])) {
    return {
      audience: 'planner',
      code: 'planner/network',
      message: 'The planner API is unavailable right now. Try again in a moment.',
    };
  }

  if (includesAny(normalized, ['403', '401', 'unauthorized'])) {
    return {
      audience: 'planner',
      code: 'planner/auth',
      message: 'Reconnect the account before the planner can update your week.',
    };
  }

  if (action === 'validate') {
    return {
      audience: 'planner',
      code: 'planner/validate-failed',
      message: 'Plan validation could not be completed right now.',
    };
  }

  return {
    audience: 'planner',
    code: `planner/${action}-failed`,
    message:
      action === 'generate'
        ? 'The weekly plan could not be generated right now.'
        : 'The planner could not update the current week right now.',
  };
};

export const mapBackupError = (
  action: 'pick' | 'apply',
  error: unknown,
): MappedClientError => {
  debugLog(`backup:${action}`, error);

  return {
    audience: 'backup',
    code: action === 'pick' ? 'backup/read-failed' : 'backup/apply-failed',
    message:
      action === 'pick'
        ? 'The backup file could not be opened or parsed.'
        : 'The backup could not be applied right now.',
  };
};

export const mapWorkspaceError = (
  action: 'local-clear' | 'legacy-import',
  error: unknown,
): MappedClientError => {
  debugLog(`workspace:${action}`, error);

  return {
    audience: 'workspace',
    code: action === 'local-clear' ? 'workspace/local-clear-failed' : 'workspace/legacy-import-failed',
    message:
      action === 'local-clear'
        ? 'The device copy could not be cleared right now.'
        : 'The previous device data could not be imported right now.',
  };
};

export type { MappedClientError };
