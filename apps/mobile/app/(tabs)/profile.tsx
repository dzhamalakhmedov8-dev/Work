import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AccountStateBanner,
  DetailRow,
  EmptyState,
  HeroPanel,
  MetricTile,
  Pill,
  PrimaryButton,
  ScreenCard,
  SecondaryButton,
  SectionTitle,
  ValidationStatusCard,
} from '../../components/ui';
import { useAppStore } from '../../lib/app-store';
import { useAuthStore } from '../../lib/auth-store';
import {
  formatActivityLevel,
  formatGoal,
  formatList,
  formatShortDateTime,
  formatWeight,
} from '../../lib/format';
import { colors, spacing } from '../../theme';

export default function ProfileScreen() {
  const {
    accountStatus,
    cloudSyncEnabled,
    currentPlan,
    generateWeek,
    hasLegacyDeviceData,
    importLegacyDeviceData,
    legacyDeviceDataSummary,
    lastCloudInstallationId,
    operations,
    profile,
    readOnlyMode,
  } = useAppStore();
  const { operations: authOperations, signOut, user } = useAuthStore();

  if (!profile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyWrap}>
          <EmptyState
            title="No profile loaded"
            description="Run onboarding first so the planner has enough information to calculate targets and build a realistic week."
          />
        </View>
      </SafeAreaView>
    );
  }

  const preferencePills = [
    ...profile.dietaryConstraints.preferredCuisines,
    ...(profile.dietaryConstraints.cookingTimePreference
      ? [profile.dietaryConstraints.cookingTimePreference]
      : []),
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <HeroPanel
          eyebrow="Profile"
          title={profile.name ? `${profile.name}'s planning profile` : 'Your planning profile'}
          subtitle="Edit the body inputs, hard rules, or taste direction whenever life changes. The week regenerates from this source of truth."
          tone="accent"
        >
          <View style={styles.heroPills}>
            <Pill label={formatGoal(profile.goal)} tone="ink" />
            <Pill label={formatActivityLevel(profile.activityLevel)} tone="ink" />
            <Pill label={`${profile.mealsPerDay} eating moments`} tone="ink" />
          </View>
        </HeroPanel>

        <AccountStateBanner
          title={accountStatus.title}
          message={accountStatus.message}
          tone={accountStatus.tone}
        />

        {currentPlan ? <ValidationStatusCard validation={currentPlan.validation} /> : null}

        {hasLegacyDeviceData ? (
          <ScreenCard tone="warm">
            <SectionTitle
              eyebrow="Previous device data"
              title="Import older local data only if it belongs to this account"
              subtitle="The app no longer auto-attaches legacy device data to newly signed-in users."
            />
            <DetailRow
              label="Saved profile"
              value={legacyDeviceDataSummary?.profileName ?? 'Unnamed legacy profile'}
            />
            <DetailRow
              label="Legacy content"
              value={`${legacyDeviceDataSummary?.hasCurrentPlan ? 'Current plan available' : 'No current plan'} | ${legacyDeviceDataSummary?.planHistoryCount ?? 0} history item(s)`}
            />
            <View style={styles.actionStack}>
              <SecondaryButton
                label={operations.importing ? 'Importing...' : 'Import to this device only'}
                onPress={() => {
                  void importLegacyDeviceData('local-only');
                }}
                disabled={operations.importing || readOnlyMode}
              />
              <PrimaryButton
                label={operations.importing ? 'Importing...' : 'Import and sync to account'}
                onPress={() => {
                  void importLegacyDeviceData('local-and-cloud');
                }}
                disabled={operations.importing || readOnlyMode}
              />
            </View>
          </ScreenCard>
        ) : null}

        <ScreenCard tone="base">
          <SectionTitle
            eyebrow="Account"
            title={user?.email ?? 'Device workspace'}
            subtitle={
              readOnlyMode
                ? 'This is a read-only device copy. Reconnect the account to edit, regenerate, or sync.'
                : 'This account uses Supabase Auth, while the nutrition profile and active plan sync through the shared database.'
            }
          />
          <View style={styles.heroPills}>
            <Pill
              label={readOnlyMode ? 'Reconnect required' : cloudSyncEnabled ? 'Cloud sync active' : 'Local-only mode'}
              tone={readOnlyMode ? 'warm' : cloudSyncEnabled ? 'success' : 'warm'}
            />
            {operations.hydratingRemote ? <Pill label="Syncing account..." tone="warm" /> : null}
            {lastCloudInstallationId ? <Pill label="Cloud workspace linked" tone="accent" /> : null}
          </View>
          <View style={styles.actionStack}>
            {readOnlyMode ? (
              <SecondaryButton
                label="Reconnect account"
                onPress={() => router.push('/auth' as never)}
              />
            ) : (
              <SecondaryButton
                label={authOperations.signingOut ? 'Signing out...' : 'Sign out'}
                onPress={() => signOut()}
                disabled={authOperations.signingOut}
              />
            )}
          </View>
        </ScreenCard>

        <ScreenCard>
          <SectionTitle
            eyebrow="Snapshot"
            title="Body and routine"
            subtitle="These values directly shape calories, protein floors, and meal sizes."
          />
          <View style={styles.metricRow}>
            <MetricTile label="Age" value={String(profile.age)} />
            <MetricTile label="Height" value={`${profile.heightCm} cm`} />
          </View>
          <View style={styles.metricRow}>
            <MetricTile label="Weight" value={`${profile.weightKg} kg`} />
            <MetricTile label="Target weight" value={formatWeight(profile.targetWeightKg)} />
          </View>
          <View style={styles.metricRow}>
            <MetricTile label="Meals/day" value={String(profile.mealsPerDay)} />
            <MetricTile
              label="Resting HR"
              value={profile.restingHeartRate ? `${profile.restingHeartRate} bpm` : 'Not set'}
            />
          </View>
          <View style={styles.actionStack}>
            <SecondaryButton
              label="Edit body inputs"
              onPress={() => router.push('/onboarding?step=1')}
              disabled={readOnlyMode}
            />
            <SecondaryButton
              label="Edit planning rules"
              onPress={() => router.push('/onboarding?step=2')}
              disabled={readOnlyMode}
            />
          </View>
        </ScreenCard>

        {currentPlan ? (
          <ScreenCard tone="base">
            <SectionTitle
              eyebrow="Targets"
              title="Calculated nutrition targets"
              subtitle={`Current plan updated ${formatShortDateTime(currentPlan.updatedAt)}.`}
            />
            <View style={styles.metricRow}>
              <MetricTile
                label="Calories"
                value={`${Math.round(currentPlan.targets.calories)} kcal`}
                tone="accent"
              />
              <MetricTile
                label="Protein floor"
                value={`${Math.round(currentPlan.targets.proteinFloorGrams)} g`}
                tone="accent"
              />
            </View>
            <View style={styles.metricRow}>
              <MetricTile
                label="Fat floor"
                value={`${Math.round(currentPlan.targets.fatFloorGrams)} g`}
              />
              <MetricTile
                label="Carb target"
                value={`${Math.round(currentPlan.targets.carbGrams)} g`}
              />
            </View>
          </ScreenCard>
        ) : null}

        <ScreenCard>
          <SectionTitle
            eyebrow="Hard rules"
            title="Dietary exclusions"
            subtitle="These exclusions are enforced during both generation and validation."
          />
          <DetailRow label="Allergies" value={formatList(profile.dietaryConstraints.allergies)} />
          <DetailRow
            label="Forbidden foods"
            value={formatList(profile.dietaryConstraints.forbiddenFoods)}
          />
          <DetailRow
            label="Disliked foods"
            value={formatList(profile.dietaryConstraints.dislikedFoods)}
          />
          <SecondaryButton
            label="Edit hard rules"
            onPress={() => router.push('/onboarding?step=3')}
            disabled={readOnlyMode}
          />
        </ScreenCard>

        <ScreenCard tone="warm">
          <SectionTitle
            eyebrow="Taste direction"
            title="Preferred cuisines and rhythm"
            subtitle="These are soft preferences that steer the planner without overriding hard exclusions."
          />
          <View style={styles.heroPills}>
            {preferencePills.length > 0 ? (
              preferencePills.map((value) => <Pill key={value} label={value} tone="warm" />)
            ) : (
              <Pill label="No taste preferences saved" />
            )}
          </View>
          <SecondaryButton
            label="Edit taste profile"
            onPress={() => router.push('/onboarding?step=3')}
            disabled={readOnlyMode}
          />
        </ScreenCard>

        <ScreenCard tone="base">
          <SectionTitle
            eyebrow="App controls"
            title="Plan and maintenance actions"
            subtitle="Open app settings for backup, validation, and advanced connection controls."
          />
          <View style={styles.actionStack}>
            <PrimaryButton
              label={operations.generating ? 'Generating week...' : 'Generate fresh week'}
              onPress={() => generateWeek(undefined, { returnPath: '/(tabs)/profile' })}
              disabled={operations.generating}
            />
            <SecondaryButton label="Open app settings" onPress={() => router.push('/settings')} />
          </View>
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
    paddingBottom: spacing.xxl + 36,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  heroPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metricRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionStack: {
    gap: spacing.sm,
  },
});
