import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, InfoBanner, Pill, ScreenCard, SectionTitle } from '../../components/ui';
import { useAppStore } from '../../lib/app-store';
import { colors, spacing } from '../../theme';

export default function ShoppingScreen() {
  const { currentPlan, error } = useAppStore();

  if (!currentPlan) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyWrap}>
          <EmptyState
            title="No shopping list yet"
            description="Generate a weekly plan first and this tab will collapse all ingredients into one list with exact gram totals."
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionTitle
          title="Shopping list"
          subtitle={`Generated ${new Date(currentPlan.shoppingList.generatedAt).toLocaleString()}`}
        />
        {error ? <InfoBanner message={error} tone="danger" /> : null}
        {Object.entries(grouped).map(([category, items]) => (
          <ScreenCard key={category}>
            <View style={styles.cardHeader}>
              <Text style={styles.categoryTitle}>{category}</Text>
              <Pill label={`${items.length} items`} tone="accent" />
            </View>
            {items.map((item) => (
              <View key={item.ingredientId} style={styles.row}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemValue}>{Math.round(item.grams)} g</Text>
              </View>
            ))}
          </ScreenCard>
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
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryTitle: {
    color: colors.ink,
    fontFamily: 'Georgia',
    fontSize: 24,
  },
  row: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  itemName: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '600',
  },
  itemValue: {
    color: colors.inkMuted,
    fontSize: 15,
  },
});
