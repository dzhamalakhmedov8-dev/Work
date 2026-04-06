import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  CollapsibleSection,
  EmptyState,
  HeroPanel,
  InfoBanner,
  MetricTile,
  Pill,
  SectionTitle,
} from '../../components/ui';
import { useAppStore } from '../../lib/app-store';
import { formatShortDateTime } from '../../lib/format';
import { colors, radii, spacing } from '../../theme';

export default function ShoppingScreen() {
  const { currentPlan, error, isShoppingItemChecked, toggleShoppingItem } = useAppStore();

  if (!currentPlan) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyWrap}>
          <EmptyState
            title="No shopping list yet"
            description="Generate a weekly plan first and this tab will turn ingredients into one store-friendly checklist."
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
  const completedItems = currentPlan.shoppingList.items.filter((item) =>
    isShoppingItemChecked(item.ingredientId),
  ).length;
  const completionLabel = `${completedItems}/${currentPlan.shoppingList.items.length} done`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <HeroPanel
          eyebrow="Shopping"
          title="A grocery list you can use in motion."
          subtitle={`Built from your active plan on ${formatShortDateTime(currentPlan.shoppingList.generatedAt)}.`}
          tone="accent"
        >
          <View style={styles.metricRow}>
            <MetricTile label="Progress" value={completionLabel} tone="accent" />
            <MetricTile
              label="Remaining"
              value={String(currentPlan.shoppingList.items.length - completedItems)}
            />
          </View>
          <View style={styles.heroPills}>
            <Pill label={`${categories.length} categories`} tone="ink" />
            <Pill label={`${Math.round(totalGrams)} g total`} tone="ink" />
          </View>
        </HeroPanel>

        {error ? <InfoBanner message={error} tone="danger" /> : null}

        <SectionTitle
          eyebrow="Store mode"
          title="Check items as you go"
          subtitle="Category groups collapse automatically into progress clusters, but the grams remain visible as the nutrition source of truth."
        />

        {categories.map(([category, items]) => {
          const completedInCategory = items.filter((item) => isShoppingItemChecked(item.ingredientId)).length;

          return (
            <CollapsibleSection
              key={category}
              title={category}
              subtitle={`${completedInCategory}/${items.length} done`}
              defaultExpanded
              trailing={<Pill label={`${Math.round(items.reduce((sum, item) => sum + item.grams, 0))} g`} />}
            >
              <View style={styles.itemsList}>
                {items.map((item) => {
                  const checked = isShoppingItemChecked(item.ingredientId);

                  return (
                    <Pressable
                      key={item.ingredientId}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked }}
                      accessibilityLabel={`${item.name}, ${Math.round(item.grams)} grams`}
                      onPress={() => toggleShoppingItem(item.ingredientId)}
                      style={({ pressed }) => [
                        styles.itemRow,
                        checked ? styles.itemRowChecked : null,
                        pressed ? styles.itemRowPressed : null,
                      ]}
                    >
                      <View style={[styles.checkbox, checked ? styles.checkboxChecked : null]}>
                        {checked ? <View style={styles.checkboxInner} /> : null}
                      </View>
                      <View style={styles.itemCopy}>
                        <Text style={[styles.itemName, checked ? styles.itemNameChecked : null]}>
                          {item.name}
                        </Text>
                        <Text style={styles.itemMeta}>{Math.round(item.grams)} g</Text>
                      </View>
                      <Text style={styles.itemAction}>{checked ? 'Done' : 'Tap to check'}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </CollapsibleSection>
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
    paddingBottom: spacing.xxl + 36,
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
  heroPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  itemsList: {
    gap: spacing.sm,
  },
  itemRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  itemRowChecked: {
    backgroundColor: colors.successSoft,
    borderColor: '#b8d3c3',
  },
  itemRowPressed: {
    opacity: 0.94,
  },
  checkbox: {
    alignItems: 'center',
    borderColor: colors.borderStrong,
    borderRadius: 999,
    borderWidth: 2,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  checkboxChecked: {
    backgroundColor: colors.accentDeep,
    borderColor: colors.accentDeep,
  },
  checkboxInner: {
    backgroundColor: colors.white,
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  itemCopy: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  itemNameChecked: {
    color: colors.inkSoft,
  },
  itemMeta: {
    color: colors.inkMuted,
    fontSize: 13,
  },
  itemAction: {
    color: colors.accentStrong,
    fontSize: 12,
    fontWeight: '700',
  },
});
