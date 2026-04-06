import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AppTextInput,
  HeroPanel,
  InfoBanner,
  PrimaryButton,
  ScreenCard,
  SecondaryButton,
  SectionTitle,
} from '../../components/ui';
import { useAppStore } from '../../lib/app-store';
import { colors, spacing } from '../../theme';

export default function SettingsScreen() {
  const {
    apiBaseUrl,
    currentPlan,
    error,
    exportBackupFile,
    importBackupFile,
    installationId,
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
      showToast('Backup imported into local storage.', 'success');
    }
  };

  const reset = async () => {
    Alert.alert('Reset all local data', 'This will remove the profile, weekly plan, history, and shopping checklist from this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          void resetAllData().then(() => {
            showToast('Local planner data was reset on this device.', 'success');
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
          subtitle="Everything here is local-first. Use this screen to validate the active week, move data between devices, or debug a development build."
          tone="base"
        />

        {error ? <InfoBanner message={error} tone="danger" /> : null}
        {validationMessage ? (
          <InfoBanner message={validationMessage.message} tone={validationMessage.tone} />
        ) : null}

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
            title="Reset local planner data"
            subtitle="This clears the stored profile, active plan, plan history, and shopping checklist from this device."
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
});
