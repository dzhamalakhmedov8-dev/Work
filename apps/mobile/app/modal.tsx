import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ReplanReason, ReplanScope } from '@nutrition-planner/shared';

import { AppTextInput, Pill, PrimaryButton, ScreenCard, SectionTitle, SecondaryButton } from '../components/ui';
import { useAppStore } from '../lib/app-store';
import { colors, spacing } from '../theme';

const reasons: Array<{ label: string; value: ReplanReason }> = [
  { label: 'Refresh', value: 'refresh' },
  { label: 'Skipped it', value: 'skip' },
  { label: 'Disliked it', value: 'dislike' },
  { label: 'Ingredient missing', value: 'ingredient_unavailable' },
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
        <ScreenCard style={styles.hero}>
          <Pill label={`Scope: ${scope}`} tone="accent" />
          <SectionTitle
            title="Swap or regenerate"
            subtitle="Use this flow to replace one meal, rebuild a single day, or refresh the whole week while keeping constraints intact."
          />
        </ScreenCard>

        <ScreenCard>
          <Text style={styles.label}>Reason</Text>
          <View style={styles.choiceRow}>
            {reasons.map((option) => {
              const active = option.value === reason;
              return (
                <Text
                  key={option.value}
                  onPress={() => setReason(option.value)}
                  style={[styles.choice, active ? styles.choiceActive : null]}
                >
                  {option.label}
                </Text>
              );
            })}
          </View>

          <Text style={styles.label}>Block foods for this replan only</Text>
          <AppTextInput
            value={blockedFoods}
            onChangeText={setBlockedFoods}
            placeholder="Salmon, chickpeas"
          />

          <Text style={styles.label}>Bias toward cuisines</Text>
          <AppTextInput
            value={preferredCuisines}
            onChangeText={setPreferredCuisines}
            placeholder="Mediterranean, Asian-inspired"
          />

          <PrimaryButton
            label={busy ? 'Updating...' : 'Apply replan'}
            onPress={applyReplan}
            disabled={busy}
          />
          <SecondaryButton label="Cancel" onPress={() => router.back()} disabled={busy} />
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
  hero: {
    gap: spacing.md,
  },
  label: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  choice: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    color: colors.ink,
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  choiceActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
    color: colors.accentStrong,
  },
});
