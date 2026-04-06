import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  EmptyState,
  HeroPanel,
  InfoBanner,
  MetricTile,
  Pill,
  ScreenCard,
  SectionTitle,
} from '../../components/ui';
import { useAppStore } from '../../lib/app-store';
import { formatShortDateTime } from '../../lib/format';
import { colors, radii, spacing } from '../../theme';

export default function ShoppingScreen() {
  const { currentPlan, error } = useAppStore();

  if (!currentPlan) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyWrap}>
          <EmptyState
            title="No shopping list yet"
            description="Generate a weekly plan first and this tab will merge ingredients into one clean grocery list with exact gram totals."
          />
        </View>
      </SafeAreaView>
    );
  }

  const grouped = currentPlan.shoppingList.items.reduce<Record<string, typeof currentPlan.shoppingList.items>>(
    (accumulator, item) => {
      accumulator[item.category] ??= [];
      accumulator[item.category].push(item);
      return accumulator;
    },
    {},
  );

  const categories = Object.entries(grouped).sort(([left], [right]) => left.localeCompare(right));
  const totalGrams = currentPlan.shoppingList.items.reduce((sum, item) => sum + item.grams, 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <HeroPanel
          eyebrow="Shopping"
          title="One list for the whole week."
          subtitle={`Generated ${formatShortDateTime(currentPlan.shoppingList.generatedAt)} from your active plan.`}
          tone="accent"
        >
          <View style={styles.metricRow}>
            <MetricTile label="Items" value={String(currentPlan.shoppingList.items.length)} />
            <MetricTile label="Categories" value={String(categories.length)} />
          </View>
          <Pill label={`Total weight ${Math.round(totalGrams)} g`} tone="ink" />
        </HeroPanel>

        {error ? <InfoBanner message={error} tone="danger" /> : null}

        <SectionTitle
          eyebrow="By category"
          title="Store-friendly grouping"
          subtitle="Ingredient totals update automatically whenever a meal or a full day is regenerated."
        />

        {categories.map(([category, items]) => {
          const categoryGrams = items.reduce((sum, item) => sum + item.grams, 0);

          return (
            <ScreenCard key={category}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderCopy}>
                  <Text style={styles.categoryTitle}>{category}</Text>
                  <Text style={styles.categoryMeta}>{Math.round(categoryGrams)} g total</Text>
                </View>
                <Pill label={`${items.length} items`} tone="accent" />
              </View>
              <View style={styles.itemsList}>
                {items.map((item) => (
                  <View key={item.ingredientId} style={styles.row}>
                    <View style={styles.itemNameWrap}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemMeta}>{item.category}</Text>
                    </View>
                    <Text style={styles.itemValue}>{Math.round(item.grams)} g</Text>
                  </View>
                ))}
              </View>
            </ScreenCard>
          );
        })}
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
  metricRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardHeaderCopy: {
    flex: 1,
    gap: 4,
    paddingRight: spacing.sm,
  },
  categoryTitle: {
    color: colors.ink,
    fontFamily: 'Georgia',
    fontSize: 24,
    lineHeight: 29,
  },
  categoryMeta: {
    color: colors.inkMuted,
    fontSize: 13,
  },
  itemsList: {
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
  itemNameWrap: {
    flex: 1,
    gap: 2,
    paddingRight: spacing.sm,
  },
  itemName: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  itemMeta: {
    color: colors.inkMuted,
    fontSize: 12,
  },
  itemValue: {
    color: colors.accentStrong,
    fontSize: 15,
    fontWeight: '800',
  },
});
