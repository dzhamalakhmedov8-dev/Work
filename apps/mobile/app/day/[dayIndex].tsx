import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  EmptyState,
  HeroPanel,
  InfoBanner,
  Pill,
  PrimaryButton,
  ScreenCard,
} from '../../components/ui';
import { useAppStore } from '../../lib/app-store';
import { formatMealSlot, formatNutritionLine } from '../../lib/format';
import { colors, radii, spacing } from '../../theme';

export default function DayDetailScreen() {
  const params = useLocalSearchParams<{ dayIndex: string }>();
  const { currentPlan, error } = useAppStore();
  const dayIndex = Number(params.dayIndex);
  const day = currentPlan?.days.find((item) => item.dayIndex === dayIndex);

  if (!day) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyWrap}>
          <EmptyState
            title="Day not found"
            description="Go back to the week tab and open one of the generated day cards from your active plan."
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <HeroPanel
          eyebrow="Day plan"
          title={day.label}
          subtitle={formatNutritionLine(day.totals)}
          tone="accent"
        >
          <View style={styles.heroMeta}>
            <Pill label={`${day.meals.length} meals`} tone="ink" />
            <Pill
              label={`${Math.round(day.totals.calories / day.meals.length)} avg kcal/meal`}
              tone="ink"
            />
          </View>
          <PrimaryButton
            label="Regenerate this day"
            onPress={() => router.push(`/modal?scope=day&dayIndex=${day.dayIndex}`)}
          />
        </HeroPanel>

        {error ? <InfoBanner message={error} tone="danger" /> : null}

        {day.meals.map((meal) => (
          <Pressable
            key={meal.id}
            onPress={() =>
              router.push({
                pathname: '/meal/[mealId]',
                params: {
                  mealId: meal.id,
                  dayIndex: String(day.dayIndex),
                },
              })
            }
            style={({ pressed }) => [pressed ? styles.cardPressed : null]}
          >
            <ScreenCard style={styles.mealCard}>
              <View style={styles.mealHeader}>
                <View style={styles.mealHeaderCopy}>
                  <Pill label={formatMealSlot(meal.slotType)} tone="accent" />
                  <Text style={styles.mealTitle}>{meal.recipe.title}</Text>
                </View>
                <Text style={styles.calorieText}>{Math.round(meal.recipe.nutrition.calories)} kcal</Text>
              </View>
              <Text style={styles.mealBody}>{meal.recipe.cuisine}</Text>
              <Text style={styles.mealBody}>{formatNutritionLine(meal.recipe.nutrition)}</Text>

              <View style={styles.mealFooter}>
                <Text style={styles.footerHint}>{meal.recipe.ingredients.length} ingredients</Text>
                <Text style={styles.footerAction}>Open recipe</Text>
              </View>
            </ScreenCard>
          </Pressable>
        ))}
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
    paddingBottom: spacing.xxl,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  heroMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cardPressed: {
    opacity: 0.94,
  },
  mealCard: {
    gap: spacing.sm,
  },
  mealHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mealHeaderCopy: {
    flex: 1,
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  mealTitle: {
    color: colors.ink,
    fontFamily: 'Georgia',
    fontSize: 23,
    lineHeight: 28,
  },
  calorieText: {
    color: colors.accentStrong,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  mealBody: {
    color: colors.inkMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  mealFooter: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  footerHint: {
    color: colors.inkSoft,
    fontSize: 13,
    fontWeight: '600',
  },
  footerAction: {
    color: colors.accentStrong,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
});
