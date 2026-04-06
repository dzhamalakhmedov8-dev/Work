import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, MetricTile, Pill, PrimaryButton, ScreenCard, SectionTitle, SecondaryButton } from '../../components/ui';
import { useAppStore } from '../../lib/app-store';
import { formatList, formatWeight } from '../../lib/format';
import { colors, spacing } from '../../theme';

export default function ProfileScreen() {
  const { busy, currentPlan, generateWeek, profile } = useAppStore();

  if (!profile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyWrap}>
          <EmptyState
            title="No profile loaded"
            description="Run onboarding first so the planner has enough data to calculate your nutrition targets."
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionTitle
          title={profile.name ? `${profile.name}'s profile` : 'Profile summary'}
          subtitle="These settings stay local on the device and drive every weekly generation or replan request."
        />

        <ScreenCard>
          <Pill label={profile.goal} tone="accent" />
          <View style={styles.metricRow}>
            <MetricTile label="Age" value={String(profile.age)} />
            <MetricTile label="Height" value={`${profile.heightCm} cm`} />
          </View>
          <View style={styles.metricRow}>
            <MetricTile label="Weight" value={`${profile.weightKg} kg`} />
            <MetricTile label="Meals/day" value={String(profile.mealsPerDay)} />
          </View>
          <View style={styles.metricRow}>
            <MetricTile label="Activity" value={profile.activityLevel} />
            <MetricTile label="Target weight" value={formatWeight(profile.targetWeightKg)} />
          </View>
        </ScreenCard>

        {currentPlan ? (
          <ScreenCard>
            <SectionTitle
              title="Calculated targets"
              subtitle="These are deterministic outputs from the nutrition engine, not free-form AI estimates."
            />
            <View style={styles.metricRow}>
              <MetricTile
                label="Calories"
                value={`${Math.round(currentPlan.targets.calories)} kcal`}
              />
              <MetricTile
                label="Protein floor"
                value={`${Math.round(currentPlan.targets.proteinFloorGrams)} g`}
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
          <SectionTitle title="Dietary rules" subtitle="Hard filters are enforced during generation and validation." />
          <LabelValue label="Allergies" value={formatList(profile.dietaryConstraints.allergies)} />
          <LabelValue
            label="Forbidden foods"
            value={formatList(profile.dietaryConstraints.forbiddenFoods)}
          />
          <LabelValue
            label="Disliked foods"
            value={formatList(profile.dietaryConstraints.dislikedFoods)}
          />
          <LabelValue
            label="Preferred cuisines"
            value={formatList(profile.dietaryConstraints.preferredCuisines)}
          />
          <LabelValue
            label="Cooking time"
            value={profile.dietaryConstraints.cookingTimePreference ?? 'Balanced'}
          />
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

function LabelValue({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.labelValueRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
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
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  metricRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  labelValueRow: {
    gap: 4,
  },
  label: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  value: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 22,
  },
});
