import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  EmptyState,
  InfoBanner,
  MetricTile,
  Pill,
  PrimaryButton,
  ScreenCard,
  SecondaryButton,
  SectionTitle,
} from '../../components/ui';
import { useAppStore } from '../../lib/app-store';
import { formatNutritionLine } from '../../lib/format';
import { colors, radii, spacing } from '../../theme';

export default function WeekScreen() {
  const { busy, clearError, currentPlan, error, generateWeek, profile } = useAppStore();

  if (!profile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyWrap}>
          <EmptyState
            title="No profile yet"
            description="Start with onboarding so the planner knows your goals, activity, and hard food constraints."
          />
          <PrimaryButton label="Open onboarding" onPress={() => router.replace('/onboarding')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenCard style={styles.hero}>
          <Pill
            label={currentPlan?.validation.isValid ? 'Plan validated' : 'Needs generation'}
            tone={currentPlan?.validation.isValid ? 'accent' : 'warm'}
          />
          <Text style={styles.heroTitle}>
            {currentPlan ? 'Current week at a glance' : 'Generate your first seven-day plan'}
          </Text>
          <Text style={styles.heroSubtitle}>
            {currentPlan
              ? 'Tap a day to inspect recipes, swap meals, and keep the shopping list in sync.'
              : 'Your profile is ready. The API will build a week of meals and a consolidated shopping list.'}
          </Text>

          <View style={styles.metricRow}>
            <MetricTile label="Goal" value={profile.goal} />
            <MetricTile label="Meals" value={`${profile.mealsPerDay}/day`} />
          </View>

          {currentPlan ? (
            <View style={styles.metricRow}>
              <MetricTile
                label="Daily target"
                value={`${Math.round(currentPlan.targets.calories)} kcal`}
              />
              <MetricTile
                label="Protein floor"
                value={`${Math.round(currentPlan.targets.proteinFloorGrams)}g`}
              />
            </View>
          ) : null}
        </ScreenCard>

        {error ? <InfoBanner message={error} tone="danger" /> : null}

        <View style={styles.buttonRow}>
          <PrimaryButton
            label={busy ? 'Working...' : currentPlan ? 'Generate fresh week' : 'Generate week'}
            onPress={() => {
              clearError();
              return generateWeek();
            }}
            disabled={busy}
          />
          {currentPlan ? (
            <SecondaryButton
              label="Replan week"
              onPress={() => router.push('/modal?scope=week')}
              disabled={busy}
            />
          ) : null}
        </View>

        {!currentPlan ? (
          <EmptyState
            title="Ready when you are"
            description="Once you generate a week, this tab becomes the control center for day details, meal swaps, and validation."
          />
        ) : (
          <>
            <SectionTitle
              title="Seven-day schedule"
              subtitle={`Source: ${currentPlan.source}. ${currentPlan.validation.errors.length} validation issues currently tracked.`}
            />
            {currentPlan.days.map((day) => (
              <Pressable
                key={day.id}
                onPress={() =>
                  router.push({
                    pathname: '/day/[dayIndex]',
                    params: { dayIndex: String(day.dayIndex) },
                  })
                }
              >
                <ScreenCard style={styles.dayCard}>
                  <View style={styles.dayHeader}>
                    <View style={styles.dayHeaderText}>
                      <Text style={styles.dayLabel}>{day.label}</Text>
                      <Text style={styles.dayTotals}>{formatNutritionLine(day.totals)}</Text>
                    </View>
                    <Pill label={`${day.meals.length} meals`} tone="accent" />
                  </View>

                  <View style={styles.mealList}>
                    {day.meals.map((meal) => (
                      <View key={meal.id} style={styles.mealRow}>
                        <Text style={styles.mealSlot}>{meal.slotType.toUpperCase()}</Text>
                        <View style={styles.mealCopy}>
                          <Text style={styles.mealTitle}>{meal.recipe.title}</Text>
                          <Text style={styles.mealNutrition}>
                            {Math.round(meal.recipe.nutrition.calories)} kcal | {meal.recipe.cuisine}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </ScreenCard>
              </Pressable>
            ))}
          </>
        )}
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
  emptyWrap: {
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing.md,
  },
  hero: {
    gap: spacing.md,
  },
  heroTitle: {
    color: colors.ink,
    fontFamily: 'Georgia',
    fontSize: 30,
    lineHeight: 35,
  },
  heroSubtitle: {
    color: colors.inkMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  metricRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  buttonRow: {
    gap: spacing.sm,
  },
  dayCard: {
    gap: spacing.md,
  },
  dayHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayHeaderText: {
    flex: 1,
    gap: 4,
    paddingRight: spacing.sm,
  },
  dayLabel: {
    color: colors.ink,
    fontFamily: 'Georgia',
    fontSize: 24,
  },
  dayTotals: {
    color: colors.inkMuted,
    fontSize: 14,
  },
  mealList: {
    gap: spacing.sm,
  },
  mealRow: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  mealSlot: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 2,
    width: 72,
  },
  mealCopy: {
    flex: 1,
    gap: 2,
  },
  mealTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  mealNutrition: {
    color: colors.inkMuted,
    fontSize: 13,
  },
});
