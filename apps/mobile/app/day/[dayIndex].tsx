import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  EmptyState,
  HeroPanel,
  InfoBanner,
  Pill,
  ScreenCard,
  SmallButton,
  StickyActionBar,
} from '../../components/ui';
import { useAppStore } from '../../lib/app-store';
import { formatMealSlot, formatNutritionLine } from '../../lib/format';
import { colors, radii, spacing } from '../../theme';

export default function DayDetailScreen() {
  const params = useLocalSearchParams<{ dayIndex: string }>();
  const { currentPlan, error, operations } = useAppStore();
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
            <Pill label={`${Math.round(day.totals.calories / day.meals.length)} avg kcal/meal`} tone="ink" />
          </View>
        </HeroPanel>

        {error ? <InfoBanner message={error} tone="danger" /> : null}

        {day.meals.map((meal) => (
          <ScreenCard key={meal.id} style={styles.mealCard}>
            <View style={styles.mealHeader}>
              <View style={styles.mealHeaderCopy}>
                <Pill label={formatMealSlot(meal.slotType)} tone="accent" />
                <Text style={styles.mealTitle}>{meal.recipe.title}</Text>
                <Text style={styles.mealMeta}>
                  {Math.round(meal.recipe.nutrition.calories)} kcal
                  {' | '}
                  {meal.recipe.cuisine}
                </Text>
              </View>
              <SmallButton
                label="Swap"
                onPress={() =>
                  router.push(
                    `/modal?scope=meal&dayIndex=${day.dayIndex}&mealSlotId=${meal.id}&slot=${meal.slotType}`,
                  )
                }
                tone="accent"
                accessibilityLabel={`Swap ${meal.recipe.title}`}
              />
            </View>

            <Pressable
              accessibilityLabel={`Open ${meal.recipe.title} recipe`}
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: '/meal/[mealId]',
                  params: {
                    mealId: meal.id,
                    dayIndex: String(day.dayIndex),
                  },
                })
              }
              style={({ pressed }) => [
                styles.recipeCard,
                pressed ? styles.recipeCardPressed : null,
              ]}
            >
              <View style={styles.recipeMeta}>
                <Text style={styles.recipeHint}>
                  {meal.recipe.ingredients.length} ingredients
                  {' | '}
                  {meal.recipe.prepMinutes} min prep
                </Text>
                <Text style={styles.recipeAction}>Open recipe</Text>
              </View>
            </Pressable>
          </ScreenCard>
        ))}
      </ScrollView>

      <StickyActionBar>
        <SmallButton label="Back to week" onPress={() => router.back()} />
        <View style={styles.stickyPrimaryWrap}>
          <Pressable
            accessibilityLabel={`Regenerate ${day.label}`}
            accessibilityRole="button"
            onPress={() => router.push(`/modal?scope=day&dayIndex=${day.dayIndex}`)}
            style={({ pressed }) => [
              styles.stickyPrimary,
              (pressed || operations.replanning) ? styles.stickyPrimaryPressed : null,
            ]}
          >
            <Text style={styles.stickyPrimaryText}>
              {operations.replanning ? 'Updating day...' : 'Regenerate this day'}
            </Text>
          </Pressable>
        </View>
      </StickyActionBar>
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
    paddingBottom: 140,
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
    gap: spacing.xs,
    paddingRight: spacing.sm,
  },
  mealTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
  mealMeta: {
    color: colors.inkMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  recipeCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    padding: spacing.sm,
  },
  recipeCardPressed: {
    opacity: 0.94,
  },
  recipeMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  recipeHint: {
    color: colors.inkSoft,
    fontSize: 13,
    fontWeight: '600',
  },
  recipeAction: {
    color: colors.accentStrong,
    fontSize: 13,
    fontWeight: '700',
  },
  stickyPrimaryWrap: {
    flex: 1,
  },
  stickyPrimary: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: spacing.md,
  },
  stickyPrimaryPressed: {
    opacity: 0.92,
  },
  stickyPrimaryText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
