import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ReplanReason, ReplanScope } from '@nutrition-planner/shared';

import {
  AppTextInput,
  ChoiceChip,
  HeroPanel,
  PrimaryButton,
  ScreenCard,
  SecondaryButton,
  SectionTitle,
} from '../components/ui';
import { useAppStore } from '../lib/app-store';
import { colors, spacing } from '../theme';

const reasons: Array<{ label: string; value: ReplanReason }> = [
  { label: 'Refresh', value: 'refresh' },
  { label: 'Skipped it', value: 'skip' },
  { label: 'Disliked it', value: 'dislike' },
  { label: 'Missing ingredient', value: 'ingredient_unavailable' },
];

export default function ReplanModalScreen() {
  const params = useLocalSearchParams<{
    scope?: string;
    dayIndex?: string;
    mealSlotId?: string;
  }>();
  const { busy, replanCurrentPlan } = useAppStore();
  const [reason, setReason] = useState<ReplanReason>('refresh');
  const [blockedFoods, setBlockedFoods] = useState('');
  const [preferredCuisines, setPreferredCuisines] = useState('');
  const scope = (params.scope ?? 'week') as ReplanScope;

  const applyReplan = async () => {
    try {
      await replanCurrentPlan({
        scope,
        reason,
        dayIndex: params.dayIndex ? Number(params.dayIndex) : undefined,
        mealSlotId: params.mealSlotId,
        blockedFoods: blockedFoods
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        preferredCuisines: preferredCuisines
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      });
      router.back();
    } catch (error) {
      Alert.alert(
        'Could not replan',
        error instanceof Error ? error.message : 'Please try again.',
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <HeroPanel
          eyebrow="Replan"
          title="Swap or regenerate without losing the rest of the week."
          subtitle="Use this flow to replace one meal, rebuild a single day, or refresh the whole schedule while keeping your constraints intact."
          tone="accent"
        />

        <ScreenCard>
          <SectionTitle
            eyebrow="Why change it?"
            title={`Scope: ${scope}`}
            subtitle="The reason helps the planner produce a more useful replacement."
          />

          <View style={styles.choiceWrap}>
            {reasons.map((option) => (
              <ChoiceChip
                key={option.value}
                label={option.label}
                active={option.value === reason}
                onPress={() => setReason(option.value)}
              />
            ))}
          </View>
        </ScreenCard>

        <ScreenCard tone="muted">
          <SectionTitle
            eyebrow="Optional guidance"
            title="Shape this one replan"
            subtitle="These extra hints apply only to the current replacement request."
          />

          <AppTextInput
            value={blockedFoods}
            onChangeText={setBlockedFoods}
            placeholder="Block foods: salmon, chickpeas"
          />
          <AppTextInput
            value={preferredCuisines}
            onChangeText={setPreferredCuisines}
            placeholder="Bias toward: Mediterranean, Asian-inspired"
          />
        </ScreenCard>

        <View style={styles.actions}>
          <PrimaryButton
            label={busy ? 'Updating...' : 'Apply replan'}
            onPress={applyReplan}
            disabled={busy}
          />
          <SecondaryButton label="Cancel" onPress={() => router.back()} disabled={busy} />
        </View>
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
  choiceWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actions: {
    gap: spacing.sm,
  },
});
