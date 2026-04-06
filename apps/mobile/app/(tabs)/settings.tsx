import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppTextInput, InfoBanner, PrimaryButton, ScreenCard, SecondaryButton, SectionTitle } from '../../components/ui';
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
        <SectionTitle
          title="Settings and backup"
          subtitle="v1 is local-first. Use this tab to point the app at your API and move data between devices."
        />

        {error ? <InfoBanner message={error} tone="danger" /> : null}

        <ScreenCard>
          <Text style={styles.label}>API base URL</Text>
          <AppTextInput
            autoCapitalize="none"
            autoCorrect={false}
            value={draftApiUrl}
            onChangeText={setDraftApiUrl}
            placeholder="http://127.0.0.1:4000"
          />
          <Text style={styles.helper}>
            Use a LAN IP instead of `127.0.0.1` when testing from a physical phone.
          </Text>
          <PrimaryButton label="Save API URL" onPress={saveApiUrl} disabled={busy} />
        </ScreenCard>

        <ScreenCard>
          <Text style={styles.label}>Installation ID</Text>
          <Text style={styles.mono}>{installationId}</Text>
        </ScreenCard>

        <ScreenCard>
          <Text style={styles.label}>Plan maintenance</Text>
          <SecondaryButton label="Validate current plan" onPress={validate} disabled={busy} />
          <SecondaryButton label="Export JSON backup" onPress={exportBackup} disabled={busy} />
          <SecondaryButton label="Import JSON backup" onPress={importBackup} disabled={busy} />
        </ScreenCard>

        <ScreenCard>
          <Text style={styles.label}>Danger zone</Text>
          <Text style={styles.helper}>
            Reset removes the local profile, current plan, and stored history from SQLite.
          </Text>
          <SecondaryButton label="Reset local data" onPress={reset} disabled={busy} />
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
    paddingBottom: spacing.xl,
  },
  label: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  helper: {
    color: colors.inkMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  mono: {
    color: colors.ink,
    fontSize: 14,
    fontFamily: 'Courier',
  },
});
