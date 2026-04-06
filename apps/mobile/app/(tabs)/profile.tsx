import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  DetailRow,
  EmptyState,
  HeroPanel,
  MetricTile,
  Pill,
  PrimaryButton,
  ScreenCard,
  SecondaryButton,
  SectionTitle,
} from '../../components/ui';
import { useAppStore } from '../../lib/app-store';
import {
  formatActivityLevel,
  formatGoal,
  formatList,
  formatShortDateTime,
  formatWeight,
} from '../../lib/format';
import { colors, spacing } from '../../theme';

export default function ProfileScreen() {
  const { busy, currentPlan, generateWeek, profile } = useAppStore();

  if (!profile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyWrap}>
          <EmptyState
            title="No profile loaded"
            description="Run onboarding first so the planner has enough data to calculate targets and build a usable weekly plan."
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
          subtitle="These values stay local on the device and shape every generated week, replan, and shopping list."
          tone="accent"
        >
          <View style={styles.heroPills}>
            <Pill label={formatGoal(profile.goal)} tone="ink" />
            <Pill label={formatActivityLevel(profile.activityLevel)} tone="ink" />
            <Pill label={`${profile.mealsPerDay} meals/day`} tone="ink" />
          </View>
        </HeroPanel>

        <ScreenCard>
          <SectionTitle
            eyebrow="Snapshot"
            title="Body and routine"
            subtitle="Core inputs used by the nutrition engine."
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
        </ScreenCard>

        {currentPlan ? (
          <ScreenCard tone="muted">
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
            title="Dietary constraints"
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
        </ScreenCard>

        <ScreenCard tone="warm">
          <SectionTitle
            eyebrow="Taste profile"
            title="Preferred direction"
            subtitle="These are soft preferences that help the planner feel more like your food."
          />
          <View style={styles.heroPills}>
            {preferencePills.length > 0 ? (
              preferencePills.map((value) => <Pill key={value} label={value} tone="warm" />)
            ) : (
              <Pill label="No taste preferences saved" />
            )}
          </View>
        </ScreenCard>

        <PrimaryButton
          label={busy ? 'Generating...' : 'Generate fresh week'}
          onPress={() => generateWeek()}
          disabled={busy}
        />
        <SecondaryButton
          label="Edit onboarding answers"
          onPress={() => router.push('/onboarding')}
        />
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
});
