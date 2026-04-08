import React, { useState } from 'react';
import { router } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ExportBundleV1 } from '@nutrition-planner/shared';

import {
  AccountStateBanner,
  AppTextInput,
  HeroPanel,
  InfoBanner,
  Pill,
  PrimaryButton,
  ScreenCard,
  SecondaryButton,
  SectionTitle,
} from '../../components/ui';
import { useAppStore } from '../../lib/app-store';
import { useAuthStore } from '../../lib/auth-store';
import { getSupabasePublicConfigStatus } from '../../lib/supabase';
import { colors, spacing } from '../../theme';

type PendingImport = {
  bundle: ExportBundleV1;
  summary: {
    hasProfile: boolean;
    currentPlanTitle: string | null;
    historyCount: number;
  };
};

export default function SettingsScreen() {
  const supabasePublicConfig = getSupabasePublicConfigStatus();
  const { operations: authOperations, signOut, user } = useAuthStore();
  const {
    accountStatus,
    apiBaseUrl,
    applyBackupImport,
    clearCloudWorkspace,
    clearError,
    clearLocalDeviceData,
    cloudSyncEnabled,
    currentPlan,
    error,
    exportBackupFile,
    installationId,
    lastCloudInstallationId,
    operations,
    prepareBackupImport,
    readOnlyMode,
    showToast,
    updateApiBaseUrl,
    validateCurrentPlan,
  } = useAppStore();
  const [draftApiUrl, setDraftApiUrl] = useState(apiBaseUrl);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [validationMessage, setValidationMessage] = useState<{
    message: string;
    tone: 'success' | 'warm' | 'danger';
  } | null>(null);

  const saveApiUrl = async () => {
    await updateApiBaseUrl(draftApiUrl);
    showToast('API base URL updated for future requests.', 'success');
  };

  const validate = async () => {
    if (!currentPlan) {
      setValidationMessage({
        message: 'Generate a weekly plan first, then run validation here.',
        tone: 'warm',
      });
      return;
    }

    const validation = await validateCurrentPlan();
    if (!validation) {
      return;
    }

    setValidationMessage({
      message: validation.isValid
        ? 'The current weekly plan is within the app tolerances.'
        : [...validation.errors, ...validation.warnings].slice(0, 3).join('\n'),
      tone: validation.isValid ? 'success' : validation.errors.length > 0 ? 'danger' : 'warm',
    });
  };

  const exportBackup = async () => {
    const fileUri = await exportBackupFile();
    if (fileUri) {
      showToast('Backup exported and ready to share.', 'success');
    }
  };

  const chooseBackup = async () => {
    clearError();
    const preview = await prepareBackupImport();
    if (preview) {
      setPendingImport(preview);
      showToast('Backup preview loaded. Choose how to apply it.', 'success');
    }
  };

  const applyImport = async (mode: 'local-only' | 'local-and-cloud') => {
    if (!pendingImport) {
      return;
    }

    const imported = await applyBackupImport(pendingImport.bundle, mode);
    if (imported) {
      setPendingImport(null);
      showToast(
        mode === 'local-and-cloud'
          ? 'Backup applied locally and synced to the account workspace.'
          : 'Backup applied to this device only.',
        'success',
      );
    }
  };

  const confirmClearLocal = () => {
    Alert.alert(
      'Clear this device',
      'This removes the stored profile, weekly plan, history, and shopping checklist from this device only. The account workspace stays unchanged.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear device',
          style: 'destructive',
          onPress: () => {
            void clearLocalDeviceData().then(() => {
              showToast('This device copy was cleared.', 'success');
            });
          },
        },
      ],
    );
  };

  const confirmClearCloud = () => {
    Alert.alert(
      'Clear cloud workspace',
      'This removes the shared profile, plan history, and shopping progress for the signed-in account. The action is destructive.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear cloud',
          style: 'destructive',
          onPress: () => {
            void clearCloudWorkspace().then(() => {
              showToast('Cloud workspace cleared for this account.', 'success');
            });
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <HeroPanel
          eyebrow="Settings"
          title="Backups, validation, and account trust controls."
          subtitle="Use this screen to validate the active week, inspect sync state, and decide whether a change should affect only this device or the shared account workspace."
          tone="base"
        />

        <AccountStateBanner
          title={accountStatus.title}
          message={accountStatus.message}
          tone={accountStatus.tone}
        />

        {error ? <InfoBanner message={error} tone="danger" /> : null}
        {validationMessage ? (
          <InfoBanner message={validationMessage.message} tone={validationMessage.tone} />
        ) : null}

        <ScreenCard>
          <SectionTitle
            eyebrow="Account"
            title={user?.email ?? 'Device workspace'}
            subtitle={
              readOnlyMode
                ? 'This device has a read-only local copy. Reconnect before you edit or sync anything.'
                : 'Supabase Auth controls access, and the planner workspace can sync profile and plan data through the database.'
            }
          />
          <View style={styles.statusRow}>
            <Pill
              label={readOnlyMode ? 'Reconnect required' : cloudSyncEnabled ? 'Cloud sync active' : 'Cloud sync unavailable'}
              tone={readOnlyMode ? 'warm' : cloudSyncEnabled ? 'success' : 'warm'}
            />
            {operations.hydratingRemote ? <Pill label="Hydrating account" tone="warm" /> : null}
            {operations.syncingProfile || operations.syncingPlan || operations.syncingShopping ? (
              <Pill label="Syncing changes" tone="accent" />
            ) : null}
          </View>
          {lastCloudInstallationId ? (
            <Text style={styles.helperText}>
              Last synced installation: {lastCloudInstallationId}
            </Text>
          ) : null}
          {readOnlyMode ? (
            <PrimaryButton label="Reconnect account" onPress={() => router.push('/auth' as never)} />
          ) : (
            <SecondaryButton
              label={authOperations.signingOut ? 'Signing out...' : 'Sign out'}
              onPress={() => signOut()}
              disabled={authOperations.signingOut}
            />
          )}
        </ScreenCard>

        <ScreenCard>
          <SectionTitle
            eyebrow="Maintenance"
            title="Plan checks and backup"
            subtitle="Validation double-checks the active week, while backup import now shows a preview before anything is overwritten."
          />
          <SecondaryButton
            label={operations.validating ? 'Validating...' : 'Validate current plan'}
            onPress={validate}
            disabled={operations.validating || readOnlyMode}
          />
          <SecondaryButton
            label={operations.exporting ? 'Exporting...' : 'Export JSON backup'}
            onPress={exportBackup}
            disabled={operations.exporting}
          />
          <SecondaryButton
            label={operations.importing ? 'Opening backup...' : 'Choose JSON backup'}
            onPress={chooseBackup}
            disabled={operations.importing || readOnlyMode}
          />
        </ScreenCard>

        {pendingImport ? (
          <ScreenCard tone="accent">
            <SectionTitle
              eyebrow="Backup preview"
              title="Choose where this backup should apply"
              subtitle="This preview is intentionally explicit so imports never overwrite account data by accident."
            />
            <Text style={styles.helperText}>
              {pendingImport.summary.hasProfile ? 'Profile included.' : 'No profile in this backup.'}
              {' '}
              {pendingImport.summary.currentPlanTitle
                ? `Current plan starts with ${pendingImport.summary.currentPlanTitle}.`
                : 'No current plan in this backup.'}
              {' '}
              {pendingImport.summary.historyCount} history item(s).
            </Text>
            <View style={styles.actionStack}>
              <PrimaryButton
                label={operations.importing ? 'Applying...' : 'Apply to this device only'}
                onPress={() => applyImport('local-only')}
                disabled={operations.importing}
              />
              <SecondaryButton
                label={operations.importing ? 'Applying...' : 'Apply locally and sync to cloud'}
                onPress={() => applyImport('local-and-cloud')}
                disabled={operations.importing || readOnlyMode}
              />
              <SecondaryButton label="Cancel preview" onPress={() => setPendingImport(null)} />
            </View>
          </ScreenCard>
        ) : null}

        <ScreenCard tone="warm">
          <SectionTitle
            eyebrow="Destructive actions"
            title="Separate device and cloud clearing"
            subtitle="These actions are split on purpose so you always know whether you are clearing only this device or the shared account workspace."
          />
          <View style={styles.actionStack}>
            <PrimaryButton
              label={operations.resetting ? 'Clearing...' : 'Clear this device'}
              onPress={confirmClearLocal}
              disabled={operations.resetting}
              tone="warm"
            />
            <SecondaryButton
              label={operations.resetting ? 'Clearing...' : 'Clear cloud workspace'}
              onPress={confirmClearCloud}
              disabled={operations.resetting || readOnlyMode}
            />
          </View>
        </ScreenCard>

        {__DEV__ ? (
          <>
            <ScreenCard tone="base">
              <SectionTitle
                eyebrow="Development"
                title="API base URL"
                subtitle="Published web builds use the built-in API automatically. Override this only when you intentionally want to point the app elsewhere."
              />
              <AppTextInput
                autoCapitalize="none"
                autoCorrect={false}
                value={draftApiUrl}
                onChangeText={setDraftApiUrl}
                placeholder="https://your-api.example.com"
              />
              <PrimaryButton
                label={operations.updatingApiUrl ? 'Saving...' : 'Save API URL'}
                onPress={saveApiUrl}
                disabled={operations.updatingApiUrl}
              />
            </ScreenCard>

            <ScreenCard tone="base">
              <SectionTitle
                eyebrow="Device"
                title="Installation identity"
                subtitle="Useful when debugging or comparing backups between devices."
              />
              <Text style={styles.mono}>{installationId}</Text>
            </ScreenCard>

            <ScreenCard tone="base">
              <SectionTitle
                eyebrow="Supabase"
                title="Public client config"
                subtitle="The mobile app reads these values from Expo public env variables for auth and user-scoped sync. The planner API still uses the private service-role token for server-side persistence."
              />
              <View style={styles.statusRow}>
                <Pill
                  label={supabasePublicConfig.configured ? 'Public keys configured' : 'Public keys missing'}
                  tone={supabasePublicConfig.configured ? 'success' : 'danger'}
                />
              </View>
              <Text style={styles.configLabel}>Project URL</Text>
              <Text style={styles.configValue}>
                {supabasePublicConfig.url ?? 'Missing EXPO_PUBLIC_SUPABASE_URL'}
              </Text>
              <Text style={styles.configLabel}>Anon key</Text>
              <Text style={styles.configValue}>
                {supabasePublicConfig.anonKeyConfigured
                  ? 'Configured via EXPO_PUBLIC_SUPABASE_ANON_KEY'
                  : 'Missing EXPO_PUBLIC_SUPABASE_ANON_KEY'}
              </Text>
              <Text style={styles.helperText}>
                For planner API persistence, also set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the server or Vercel environment.
              </Text>
            </ScreenCard>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: spacing.xxl + 36,
  },
  mono: {
    color: colors.ink,
    fontFamily: 'Courier',
    fontSize: 13,
    lineHeight: 19,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionStack: {
    gap: spacing.sm,
  },
  configLabel: {
    color: colors.inkSoft,
    fontSize: 13,
    fontWeight: '700',
  },
  configValue: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 20,
  },
  helperText: {
    color: colors.inkMuted,
    fontSize: 13,
    lineHeight: 18,
  },
});
