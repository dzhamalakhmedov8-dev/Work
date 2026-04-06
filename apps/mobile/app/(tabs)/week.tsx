import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  EmptyState,
  HeroPanel,
  InfoBanner,
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
  formatMealSlot,
  formatNutritionLine,
} from '../../lib/format';
import { colors, radii, spacing } from '../../theme';

export default function WeekScreen() {
  const { busy, clearError, currentPlan, error, generateWeek, profile } = useAppStore();

  if (!profile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyWrap}>
          <EmptyState
            title="No profile yet"
            description="Start with onboarding so the planner understands your goal, meal rhythm, and hard food constraints."
          />
          <PrimaryButton label="Open onboarding" onPress={() => router.replace('/onboarding')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <HeroPanel
          eyebrow="This week"
          title={
            currentPlan ? 'A seven-day plan you can actually follow.' : 'Generate your first week.'
          }
          subtitle={
            currentPlan
              ? 'Open any day for recipe details, swap meals when life changes, and keep the shopping list synchronized.'
              : 'Your profile is ready. Generate a realistic menu with exact ingredient grams and a full grocery list.'
          }
          tone={currentPlan?.validation.isValid ? 'accent' : 'warm'}
        >
          <View style={styles.heroPills}>
            <Pill label={formatGoal(profile.goal)} tone="ink" />
            <Pill label={`${profile.mealsPerDay} moments/day`} tone="ink" />
            <Pill label={formatActivityLevel(profile.activityLevel)} tone="ink" />
          </View>
          <View style={styles.metricRow}>
            <MetricTile label="Target" value={currentPlan ? `${Math.round(currentPlan.targets.calories)} kcal` : '--'} />
            <MetricTile
              label="Protein floor"
              value={currentPlan ? `${Math.round(currentPlan.targets.proteinFloorGrams)} g` : '--'}
            />
          </View>
        </HeroPanel>

        {error ? <InfoBanner message={error} tone="danger" /> : null}

        <View style={styles.actionGroup}>
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
              label="Replan the whole week"
              onPress={() => router.push('/modal?scope=week')}
              disabled={busy}
            />
          ) : null}
        </View>

        {!currentPlan ? (
          <EmptyState
            title="Your control center starts here"
            description="Once a week is generated, this screen becomes the daily planner with day cards, recipe drill-down, and one-tap replanning."
          />
        ) : (
          <>
            <SectionTitle
              eyebrow="Schedule"
              title="Seven-day rhythm"
              subtitle={`${currentPlan.validation.isValid ? 'Validated and ready to use.' : 'Plan generated with open validation notes.'} Tap a day to open recipes and swaps.`}
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
                style={({ pressed }) => [pressed ? styles.dayCardPressed : null]}
              >
                <ScreenCard style={styles.dayCard}>
                  <View style={styles.dayHeader}>
                    <View style={styles.dayHeaderCopy}>
                      <Text style={styles.dayLabel}>{day.label}</Text>
                      <Text style={styles.dayTotals}>{formatNutritionLine(day.totals)}</Text>
                    </View>
                    <Pill label={`${day.meals.length} meals`} tone="accent" />
                  </View>

                  <View style={styles.dayMetaRow}>
                    <Text style={styles.dayMetaText}>
                      {Math.round(day.totals.calories / day.meals.length)} avg kcal per meal
                    </Text>
                    <Text style={styles.dayMetaArrow}>Open</Text>
                  </View>

                  <View style={styles.mealList}>
                    {day.meals.map((meal) => (
                      <View key={meal.id} style={styles.mealRow}>
                        <View style={styles.mealSlotBadge}>
                          <Text style={styles.mealSlotText}>{formatMealSlot(meal.slotType)}</Text>
                        </View>
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
    paddingBottom: spacing.xxl + 52,
  },
  emptyWrap: {
    flex: 1,
    gap: spacing.md,
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
  actionGroup: {
    gap: spacing.sm,
  },
  dayCardPressed: {
    opacity: 0.93,
  },
  dayCard: {
    gap: spacing.md,
  },
  dayHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayHeaderCopy: {
    flex: 1,
    gap: 4,
    paddingRight: spacing.sm,
  },
  dayLabel: {
    color: colors.ink,
    fontFamily: 'Georgia',
    fontSize: 26,
    lineHeight: 31,
  },
  dayTotals: {
    color: colors.inkMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  dayMetaRow: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  dayMetaText: {
    color: colors.inkSoft,
    fontSize: 13,
    fontWeight: '600',
  },
  dayMetaArrow: {
    color: colors.accentStrong,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  mealList: {
    gap: spacing.sm,
  },
  mealRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  mealSlotBadge: {
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: radii.xs,
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: 10,
    width: 88,
  },
  mealSlotText: {
    color: colors.accentStrong,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
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
