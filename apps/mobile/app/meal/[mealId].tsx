import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, Pill, PrimaryButton, ScreenCard, SectionTitle } from '../../components/ui';
import { useAppStore } from '../../lib/app-store';
import { formatNutritionLine } from '../../lib/format';
import { colors, spacing } from '../../theme';

export default function MealDetailScreen() {
  const params = useLocalSearchParams<{ mealId: string; dayIndex: string }>();
  const { currentPlan } = useAppStore();
  const dayIndex = Number(params.dayIndex);
  const day = currentPlan?.days.find((item) => item.dayIndex === dayIndex);
  const meal = day?.meals.find((item) => item.id === params.mealId);

  if (!day || !meal) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyWrap}>
          <EmptyState
            title="Meal not found"
            description="Return to the week view and open a meal card from the active plan."
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionTitle title={meal.recipe.title} subtitle={formatNutritionLine(meal.recipe.nutrition)} />

        <ScreenCard>
          <Pill label={meal.slotType} tone="accent" />
          <Text style={styles.helper}>Cuisine: {meal.recipe.cuisine}</Text>
          <Text style={styles.helper}>Prep time: {meal.recipe.prepMinutes} minutes</Text>
          <PrimaryButton
            label="Swap this meal"
            onPress={() =>
              router.push(
                `/modal?scope=meal&dayIndex=${day.dayIndex}&mealSlotId=${meal.id}&slot=${meal.slotType}`,
              )
            }
          />
        </ScreenCard>

        <ScreenCard>
          <SectionTitle title="Ingredients" subtitle="Exact grams are what drive nutrition totals and the shopping list." />
          {meal.recipe.ingredients.map((ingredient) => (
            <View key={ingredient.ingredientId} style={styles.row}>
              <View style={styles.rowCopy}>
                <Text style={styles.ingredientName}>{ingredient.name}</Text>
                <Text style={styles.ingredientBody}>
                  {Math.round(ingredient.nutrition.calories)} kcal • P {Math.round(ingredient.nutrition.proteinGrams)}g
                </Text>
              </View>
              <Text style={styles.ingredientAmount}>{Math.round(ingredient.grams)} g</Text>
            </View>
          ))}
        </ScreenCard>

        <ScreenCard>
          <SectionTitle title="Steps" subtitle="Simple, realistic prep instructions for the current recipe." />
          {meal.recipe.steps.map((step, index) => (
            <View key={`${meal.id}-${index}`} style={styles.stepRow}>
              <Text style={styles.stepIndex}>{index + 1}</Text>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
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
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  helper: {
    color: colors.inkMuted,
    fontSize: 14,
  },
  row: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  rowCopy: {
    flex: 1,
    gap: 4,
    paddingRight: spacing.sm,
  },
  ingredientName: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  ingredientBody: {
    color: colors.inkMuted,
    fontSize: 13,
  },
  ingredientAmount: {
    color: colors.accentStrong,
    fontSize: 14,
    fontWeight: '700',
  },
  stepRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stepIndex: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '800',
    width: 18,
  },
  stepText: {
    color: colors.ink,
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
});
