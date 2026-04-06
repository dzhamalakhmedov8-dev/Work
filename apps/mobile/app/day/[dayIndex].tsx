import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, InfoBanner, Pill, PrimaryButton, ScreenCard, SectionTitle } from '../../components/ui';
import { useAppStore } from '../../lib/app-store';
import { formatNutritionLine } from '../../lib/format';
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
            description="Go back to the week tab and pick a generated day from the current plan."
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionTitle title={day.label} subtitle={formatNutritionLine(day.totals)} />
        {error ? <InfoBanner message={error} tone="danger" /> : null}

        <ScreenCard>
          <Pill label={`${day.meals.length} meals`} tone="accent" />
          <Text style={styles.cardTitle}>Daily plan</Text>
          <Text style={styles.cardBody}>
            Open any meal for ingredients, exact grams, and a one-tap swap flow.
          </Text>
          <PrimaryButton
            label="Regenerate this day"
            onPress={() => router.push(`/modal?scope=day&dayIndex=${day.dayIndex}`)}
          />
        </ScreenCard>

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
          >
            <ScreenCard style={styles.mealCard}>
              <View style={styles.mealHeader}>
                <Text style={styles.mealSlot}>{meal.slotType.toUpperCase()}</Text>
                <Pill label={`${Math.round(meal.recipe.nutrition.calories)} kcal`} tone="warm" />
              </View>
              <Text style={styles.mealTitle}>{meal.recipe.title}</Text>
              <Text style={styles.mealBody}>{meal.recipe.cuisine}</Text>
              <Text style={styles.mealBody}>{formatNutritionLine(meal.recipe.nutrition)}</Text>
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
    paddingBottom: spacing.xl,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  cardTitle: {
    color: colors.ink,
    fontFamily: 'Georgia',
    fontSize: 22,
  },
  cardBody: {
    color: colors.inkMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  mealCard: {
    gap: spacing.sm,
  },
  mealHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mealSlot: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  mealTitle: {
    color: colors.ink,
    fontSize: 19,
    fontWeight: '700',
  },
  mealBody: {
    color: colors.inkMuted,
    fontSize: 14,
  },
});
