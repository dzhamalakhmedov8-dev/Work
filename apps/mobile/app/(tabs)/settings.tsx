import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
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

export default function SettingsScreen() {
  const supabasePublicConfig = getSupabasePublicConfigStatus();
  const { operations: authOperations, signOut, user } = useAuthStore();
  const {
    apiBaseUrl,
    cloudSyncEnabled,
    currentPlan,
    error,
    exportBackupFile,
    importBackupFile,
    installationId,
    lastCloudInstallationId,
    operations,
    resetAllData,
    showToast,
    updateApiBaseUrl,
    validateCurrentPlan,
  } = useAppStore();
  const [draftApiUrl, setDraftApiUrl] = useState(apiBaseUrl);
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

  const importBackup = async () => {
    const imported = await importBackupFile();
    if (imported) {
      showToast(
        cloudSyncEnabled
          ? 'Backup imported locally and queued for cloud sync.'
          : 'Backup imported into local storage.',
        'success',
      );
    }
  };

  const reset = async () => {
    Alert.alert('Reset planner data', 'This will remove the profile, weekly plan, history, and shopping checklist from this device. If cloud sync is active, the account workspace will be cleared too.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          void resetAllData().then(() => {
            showToast(
              cloudSyncEnabled
                ? 'Planner data was reset on this device and in the linked account workspace.'
                : 'Planner data was reset on this device.',
              'success',
            );
          });
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <HeroPanel
          eyebrow="Settings"
          title="Backups, validation, and device-level controls."
          subtitle="Use this screen to validate the active week, move data between devices, and check whether the signed-in account is syncing with the shared workspace."
          tone="base"
        />

        {error ? <InfoBanner message={error} tone="danger" /> : null}
        {validationMessage ? (
          <InfoBanner message={validationMessage.message} tone={validationMessage.tone} />
        ) : null}

        <ScreenCard>
          <SectionTitle
            eyebrow="Account"
            title={user?.email ?? 'Signed-in account'}
            subtitle="Supabase Auth controls access, and the planner workspace can now sync profile and plan data through the database."
          />
          <View style={styles.statusRow}>
            <Pill
              label={cloudSyncEnabled ? 'Cloud sync active' : 'Cloud sync unavailable'}
              tone={cloudSyncEnabled ? 'success' : 'warm'}
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
          <SecondaryButton
            label={authOperations.signingOut ? 'Signing out...' : 'Sign out'}
            onPress={() => signOut()}
            disabled={authOperations.signingOut}
          />
        </ScreenCard>

        <ScreenCard>
          <SectionTitle
            eyebrow="Maintenance"
            title="Plan checks and backup"
            subtitle="Validation double-checks the active week, while export and import keep the app portable."
          />
          <SecondaryButton
            label={operations.validating ? 'Validating...' : 'Validate current plan'}
            onPress={validate}
            disabled={operations.validating}
          />
          <SecondaryButton
            label={operations.exporting ? 'Exporting...' : 'Export JSON backup'}
            onPress={exportBackup}
            disabled={operations.exporting}
          />
          <SecondaryButton
            label={operations.importing ? 'Importing...' : 'Import JSON backup'}
            onPress={importBackup}
            disabled={operations.importing}
          />
        </ScreenCard>

        <ScreenCard tone="warm">
          <SectionTitle
            eyebrow="Danger zone"
            title="Reset planner data"
            subtitle="This clears the stored profile, active plan, plan history, and shopping checklist from this device and also clears the signed-in account workspace when cloud sync is active."
          />
          <PrimaryButton
            label={operations.resetting ? 'Resetting...' : 'Reset local data'}
            onPress={reset}
            disabled={operations.resetting}
            tone="warm"
          />
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
