import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AccountStateBanner,
  EmptyState,
  HeroPanel,
  InfoBanner,
  MetricTile,
  Pill,
  PrimaryButton,
  ScreenCard,
  SecondaryButton,
  SectionTitle,
  ValidationStatusCard,
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
  const { accountStatus, clearError, currentPlan, error, generateWeek, operations, profile, readOnlyMode } = useAppStore();

  if (!profile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyWrap}>
          <EmptyState
            title="No profile yet"
            description="Start with onboarding so the planner understands your body, goal, meal rhythm, and hard food rules."
            action={<PrimaryButton label="Open onboarding" onPress={() => router.replace('/onboarding')} />}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <HeroPanel
          eyebrow="This week"
          title={currentPlan ? 'A compact weekly view you can scan fast.' : 'Generate your first week.'}
          subtitle={
            currentPlan
              ? 'Open a day for recipes and swaps, or rebuild the whole schedule without leaving the planner flow.'
              : 'Your profile is ready. Build a realistic seven-day menu with grams, recipes, and a shopping list.'
          }
          tone={currentPlan ? 'accent' : 'warm'}
        >
          <View style={styles.heroPills}>
            <Pill label={formatGoal(profile.goal)} tone="ink" />
            <Pill label={formatActivityLevel(profile.activityLevel)} tone="ink" />
            <Pill label={`${profile.mealsPerDay} eating moments`} tone="ink" />
          </View>
          <View style={styles.metricRow}>
            <MetricTile
              label="Calories target"
              value={currentPlan ? `${Math.round(currentPlan.targets.calories)} kcal` : '--'}
              tone="accent"
            />
            <MetricTile
              label="Protein floor"
              value={currentPlan ? `${Math.round(currentPlan.targets.proteinFloorGrams)} g` : '--'}
            />
          </View>
        </HeroPanel>

        <AccountStateBanner
          title={accountStatus.title}
          message={accountStatus.message}
          tone={accountStatus.tone}
        />

        {error ? <InfoBanner message={error} tone="danger" /> : null}

        {currentPlan ? <ValidationStatusCard validation={currentPlan.validation} /> : null}

        <View style={styles.actionRow}>
          <PrimaryButton
            label={
              operations.generating
                ? 'Generating week...'
                : currentPlan
                  ? 'Generate fresh week'
                  : 'Generate week'
            }
            onPress={() => {
              clearError();
              return generateWeek();
            }}
            disabled={operations.generating || readOnlyMode}
          />
          {currentPlan ? (
            <SecondaryButton
              label="Replan week"
              onPress={() => router.push('/modal?scope=week')}
              disabled={operations.generating || operations.replanning || readOnlyMode}
            />
          ) : null}
        </View>

        {!currentPlan ? (
          <EmptyState
            title="Your planner hub starts here"
            description="Once a week exists, this screen becomes the fast overview for totals, plan status, and day-by-day drill-down."
          />
        ) : (
          <>
            <SectionTitle
              eyebrow="Seven-day rhythm"
              title="Day cards built for quick scanning"
              subtitle="Each card shows the nutrition total plus one lead meal. Open the day for the full meal list and swaps."
            />

            {currentPlan.days.map((day) => {
              const leadMeal =
                day.meals.find((meal) => meal.slotType === 'dinner') ?? day.meals[0];
              const otherMeals = day.meals.length - 1;

              return (
                <Pressable
                  key={day.id}
                  accessibilityLabel={`${day.label}. ${Math.round(day.totals.calories)} calories. Lead meal ${leadMeal.recipe.title}. Open day plan.`}
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({
                      pathname: '/day/[dayIndex]',
                      params: { dayIndex: String(day.dayIndex) },
                    })
                  }
                  style={({ pressed }) => [styles.dayPressable, pressed ? styles.dayCardPressed : null]}
                >
                  <ScreenCard style={styles.dayCard} tone="elevated">
                    <View style={styles.dayHeader}>
                      <View style={styles.dayHeaderCopy}>
                        <Text style={styles.dayLabel}>{day.label}</Text>
                        <Text style={styles.dayTotals}>{formatNutritionLine(day.totals)}</Text>
                      </View>
                      <Pill label={`${day.meals.length} meals`} tone="accent" />
                    </View>

                    <View style={styles.leadMealCard}>
                      <View style={styles.leadMealCopy}>
                        <Text style={styles.leadMealEyebrow}>{formatMealSlot(leadMeal.slotType)}</Text>
                        <Text style={styles.leadMealTitle}>{leadMeal.recipe.title}</Text>
                        <Text style={styles.leadMealMeta}>
                          {Math.round(leadMeal.recipe.nutrition.calories)} kcal
                          {' | '}
                          {leadMeal.recipe.cuisine}
                        </Text>
                      </View>
                      <Text style={styles.openHint}>Open day</Text>
                    </View>

                    <View style={styles.dayFooter}>
                      <Text style={styles.dayFooterText}>
                        {otherMeals > 0
                          ? `${otherMeals} more ${otherMeals === 1 ? 'meal' : 'meals'} inside`
                          : 'Single-meal view'}
                      </Text>
                      <Text style={styles.dayFooterText}>
                        {Math.round(day.totals.calories / day.meals.length)} avg kcal/meal
                      </Text>
                    </View>
                  </ScreenCard>
                </Pressable>
              );
            })}
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
  actionRow: {
    gap: spacing.sm,
  },
  dayPressable: {
    borderRadius: radii.md,
  },
  dayCardPressed: {
    opacity: 0.94,
  },
  dayCard: {
    gap: spacing.sm,
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
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
  },
  dayTotals: {
    color: colors.inkMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  leadMealCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.sm,
  },
  leadMealCopy: {
    flex: 1,
    gap: 2,
    paddingRight: spacing.sm,
  },
  leadMealEyebrow: {
    color: colors.accentStrong,
    fontSize: 12,
    fontWeight: '700',
  },
  leadMealTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  leadMealMeta: {
    color: colors.inkMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  openHint: {
    color: colors.accentStrong,
    fontSize: 13,
    fontWeight: '700',
  },
  dayFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayFooterText: {
    color: colors.inkMuted,
    fontSize: 12,
    lineHeight: 18,
  },
});
