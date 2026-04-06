import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, HeroPanel, Pill, PrimaryButton, ScreenCard, SectionTitle } from '../../components/ui';
import { useAppStore } from '../../lib/app-store';
import { formatMealSlot, formatNutritionLine } from '../../lib/format';
import { colors, radii, spacing } from '../../theme';

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
            description="Return to the week screen and open a meal card from the current plan."
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <HeroPanel
          eyebrow={formatMealSlot(meal.slotType)}
          title={meal.recipe.title}
          subtitle={formatNutritionLine(meal.recipe.nutrition)}
          tone="warm"
        >
          <View style={styles.heroPills}>
            <Pill label={meal.recipe.cuisine} tone="ink" />
            <Pill label={`${meal.recipe.prepMinutes} min prep`} tone="ink" />
            <Pill label={`${meal.recipe.ingredients.length} ingredients`} tone="ink" />
          </View>
          <PrimaryButton
            label="Swap this meal"
            onPress={() =>
              router.push(
                `/modal?scope=meal&dayIndex=${day.dayIndex}&mealSlotId=${meal.id}&slot=${meal.slotType}`,
              )
            }
          />
        </HeroPanel>

        <ScreenCard>
          <SectionTitle
            eyebrow="Ingredients"
            title="Exact quantities"
            subtitle="These grams are the source of truth for calories, macros, and the shopping list."
          />
          <View style={styles.list}>
            {meal.recipe.ingredients.map((ingredient) => (
              <View key={ingredient.ingredientId} style={styles.row}>
                <View style={styles.rowCopy}>
                  <Text style={styles.ingredientName}>{ingredient.name}</Text>
                  <Text style={styles.ingredientBody}>
                    {Math.round(ingredient.nutrition.calories)} kcal | P{' '}
                    {Math.round(ingredient.nutrition.proteinGrams)}g
                  </Text>
                </View>
                <View style={styles.amountBadge}>
                  <Text style={styles.ingredientAmount}>{Math.round(ingredient.grams)} g</Text>
                </View>
              </View>
            ))}
          </View>
        </ScreenCard>

        <ScreenCard tone="muted">
          <SectionTitle
            eyebrow="Method"
            title="Simple prep flow"
            subtitle="Short, realistic steps for the current recipe."
          />
          <View style={styles.stepsList}>
            {meal.recipe.steps.map((step, index) => (
              <View key={`${meal.id}-${index}`} style={styles.stepRow}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepIndex}>{index + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
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
    paddingBottom: spacing.xxl,
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
  list: {
    gap: spacing.sm,
  },
  row: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
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
    lineHeight: 18,
  },
  amountBadge: {
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: radii.xs,
    justifyContent: 'center',
    minWidth: 70,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  ingredientAmount: {
    color: colors.accentStrong,
    fontSize: 13,
    fontWeight: '800',
  },
  stepsList: {
    gap: spacing.sm,
  },
  stepRow: {
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  stepBadge: {
    alignItems: 'center',
    backgroundColor: colors.warmSoft,
    borderRadius: 999,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  stepIndex: {
    color: colors.warmStrong,
    fontSize: 13,
    fontWeight: '800',
  },
  stepText: {
    color: colors.ink,
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
});
