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
    busy,
    currentPlan,
    error,
    exportBackupFile,
    importBackupFile,
    installationId,
    resetAllData,
    updateApiBaseUrl,
    validateCurrentPlan,
  } = useAppStore();
  const [draftApiUrl, setDraftApiUrl] = useState(apiBaseUrl);

  const saveApiUrl = async () => {
    await updateApiBaseUrl(draftApiUrl);
    Alert.alert('Saved', 'The API base URL was updated for future plan requests.');
  };

  const validate = async () => {
    if (!currentPlan) {
      Alert.alert('Nothing to validate', 'Generate a weekly plan first.');
      return;
    }

    const validation = await validateCurrentPlan();
    if (!validation) {
      return;
    }

    Alert.alert(
      validation.isValid ? 'Plan validated' : 'Validation issues found',
      validation.isValid
        ? 'The current weekly plan is within the app tolerances.'
        : validation.errors.slice(0, 3).join('\n'),
    );
  };

  const exportBackup = async () => {
    const fileUri = await exportBackupFile();
    if (fileUri) {
      Alert.alert('Backup ready', fileUri);
    }
  };

  const importBackup = async () => {
    const imported = await importBackupFile();
    if (imported) {
      Alert.alert('Import complete', 'Profile, current plan, and history were restored locally.');
    }
  };

  const reset = async () => {
    Alert.alert('Reset all local data', 'This will remove the profile, weekly plan, and history from this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          void resetAllData();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <HeroPanel
          eyebrow="Settings"
          title="Backup, validate, and control how this app connects."
          subtitle="Published web builds use the built-in API automatically. Override it only when you intentionally want to point the app somewhere else."
          tone="muted"
        />

        {error ? <InfoBanner message={error} tone="danger" /> : null}

        <ScreenCard>
          <SectionTitle
            eyebrow="Connection"
            title="API base URL"
            subtitle="Leave the hosted app on its default value. Use a LAN URL only for local testing."
          />
          <AppTextInput
            autoCapitalize="none"
            autoCorrect={false}
            value={draftApiUrl}
            onChangeText={setDraftApiUrl}
            placeholder="https://your-api.example.com"
          />
          <PrimaryButton label="Save API URL" onPress={saveApiUrl} disabled={busy} />
        </ScreenCard>

        <ScreenCard tone="muted">
          <SectionTitle
            eyebrow="Device"
            title="Installation identity"
            subtitle="Useful when debugging or comparing exports between devices."
          />
          <Text style={styles.mono}>{installationId}</Text>
        </ScreenCard>

        <ScreenCard>
          <SectionTitle
            eyebrow="Maintenance"
            title="Plan checks and backup"
            subtitle="Export and import keep the app local-first, while validation double-checks the current plan."
          />
          <SecondaryButton label="Validate current plan" onPress={validate} disabled={busy} />
          <SecondaryButton label="Export JSON backup" onPress={exportBackup} disabled={busy} />
          <SecondaryButton label="Import JSON backup" onPress={importBackup} disabled={busy} />
        </ScreenCard>

        <ScreenCard tone="warm">
          <SectionTitle
            eyebrow="Danger zone"
            title="Reset local data"
            subtitle="This removes the stored profile, the active weekly plan, and local history from the current device."
          />
          <PrimaryButton label="Reset local data" onPress={reset} disabled={busy} tone="warm" />
        </ScreenCard>
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
    paddingBottom: spacing.xxl + 52,
  },
  mono: {
    color: colors.ink,
    fontFamily: 'Courier',
    fontSize: 13,
    lineHeight: 19,
  },
});
