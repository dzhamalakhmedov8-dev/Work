import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ReplanReason, ReplanScope } from '@nutrition-planner/shared';

import {
  AppTextInput,
  ChoiceChip,
  HeroPanel,
  InfoBanner,
  InlineFieldHint,
  Pill,
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

const scopeLabels: Record<ReplanScope, string> = {
  meal: 'Swap one meal',
  day: 'Regenerate one day',
  week: 'Refresh the whole week',
};

export default function ReplanModalScreen() {
  const params = useLocalSearchParams<{
    scope?: string;
    dayIndex?: string;
    mealSlotId?: string;
  }>();
  const { clearError, error, operations, replanCurrentPlan, showToast } = useAppStore();
  const [reason, setReason] = useState<ReplanReason>('refresh');
  const [blockedFoods, setBlockedFoods] = useState('');
  const [preferredCuisines, setPreferredCuisines] = useState('');
  const scope = (params.scope ?? 'week') as ReplanScope;
  const scopeCopy = useMemo(() => scopeLabels[scope], [scope]);

  const applyReplan = async () => {
    try {
      clearError();
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
      showToast(scope === 'meal' ? 'Meal replaced in the active plan.' : 'Plan updated.', 'success');
      router.back();
    } catch {
      // Error is already stored in the global app store and rendered inline below.
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.handle} />
        <HeroPanel
          eyebrow="Replan"
          title={scopeCopy}
          subtitle="Use a reason and optional guidance so the replacement feels more useful and less random."
          tone="accent"
        >
          <Pill label={`Scope: ${scope}`} tone="ink" />
        </HeroPanel>

        {error ? <InfoBanner message={error} tone="danger" /> : null}

        <ScreenCard>
          <SectionTitle
            eyebrow="Reason"
            title="Why are you changing it?"
            subtitle="The reason helps the planner choose a better replacement instead of a generic reroll."
          />
          <View style={styles.choiceWrap}>
            {reasons.map((option) => (
              <ChoiceChip
                key={option.value}
                label={option.label}
                active={option.value === reason}
                onPress={() => setReason(option.value)}
                accessibilityLabel={`Reason ${option.label}`}
              />
            ))}
          </View>
        </ScreenCard>

        <ScreenCard tone="base">
          <SectionTitle
            eyebrow="Optional guidance"
            title="Steer this replan"
            subtitle="These hints apply only to this replacement request."
          />

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Block foods for this replacement</Text>
            <InlineFieldHint>Use a short comma-separated list, like salmon or chickpeas.</InlineFieldHint>
            <AppTextInput
              value={blockedFoods}
              onChangeText={setBlockedFoods}
              placeholder="Salmon, chickpeas"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Bias toward a cuisine</Text>
            <InlineFieldHint>Good for when you want the new option to stay in the same food mood.</InlineFieldHint>
            <AppTextInput
              value={preferredCuisines}
              onChangeText={setPreferredCuisines}
              placeholder="Mediterranean, Asian-inspired"
            />
          </View>
        </ScreenCard>

        <View style={styles.actions}>
          <PrimaryButton
            label={operations.replanning ? 'Applying replan...' : 'Apply replan'}
            onPress={applyReplan}
            disabled={operations.replanning}
          />
          <SecondaryButton
            label="Cancel"
            onPress={() => router.back()}
            disabled={operations.replanning}
          />
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
  handle: {
    alignSelf: 'center',
    backgroundColor: colors.borderStrong,
    borderRadius: 999,
    height: 6,
    width: 56,
  },
  choiceWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  fieldLabel: {
    color: colors.inkSoft,
    fontSize: 13,
    fontWeight: '700',
  },
  actions: {
    gap: spacing.sm,
  },
});
