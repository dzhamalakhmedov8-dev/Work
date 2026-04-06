import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type {
  ActivityLevel,
  CookingTimePreference,
  Goal,
  Sex,
  UserProfile,
} from '@nutrition-planner/shared';

import { AppTextInput, FieldLabel, InfoBanner, Pill, PrimaryButton, ScreenCard, SectionTitle } from '../components/ui';
import { useAppStore } from '../lib/app-store';
import { colors, radii, spacing } from '../theme';

const parseList = (value: string): string[] =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const buildProfile = (input: {
  name: string;
  age: string;
  sex: Sex;
  heightCm: string;
  weightKg: string;
  restingHeartRate: string;
  targetWeightKg: string;
  goal: Goal;
  activityLevel: ActivityLevel;
  mealsPerDay: 3 | 4;
  allergies: string;
  forbiddenFoods: string;
  dislikedFoods: string;
  preferredCuisines: string;
  cookingTimePreference: CookingTimePreference;
}): UserProfile => {
  const now = new Date().toISOString();
  return {
    id: `profile-${Date.now().toString(36)}`,
    createdAt: now,
    updatedAt: now,
    name: input.name.trim() || undefined,
    age: Number(input.age),
    sex: input.sex,
    heightCm: Number(input.heightCm),
    weightKg: Number(input.weightKg),
    restingHeartRate: input.restingHeartRate ? Number(input.restingHeartRate) : undefined,
    targetWeightKg: input.targetWeightKg ? Number(input.targetWeightKg) : undefined,
    goal: input.goal,
    activityLevel: input.activityLevel,
    mealsPerDay: input.mealsPerDay,
    dietaryConstraints: {
      allergies: parseList(input.allergies),
      forbiddenFoods: parseList(input.forbiddenFoods),
      dislikedFoods: parseList(input.dislikedFoods),
      preferredCuisines: parseList(input.preferredCuisines),
      cookingTimePreference: input.cookingTimePreference,
    },
  };
};

export default function OnboardingScreen() {
  const { busy, error, saveProfile, generateWeek, clearError } = useAppStore();
  const [name, setName] = useState('');
  const [age, setAge] = useState('30');
  const [sex, setSex] = useState<Sex>('male');
  const [heightCm, setHeightCm] = useState('178');
  const [weightKg, setWeightKg] = useState('78');
  const [restingHeartRate, setRestingHeartRate] = useState('');
  const [targetWeightKg, setTargetWeightKg] = useState('');
  const [goal, setGoal] = useState<Goal>('maintain');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [mealsPerDay, setMealsPerDay] = useState<3 | 4>(4);
  const [allergies, setAllergies] = useState('');
  const [forbiddenFoods, setForbiddenFoods] = useState('');
  const [dislikedFoods, setDislikedFoods] = useState('');
  const [preferredCuisines, setPreferredCuisines] = useState('Mediterranean, balanced bowls');
  const [cookingTimePreference, setCookingTimePreference] =
    useState<CookingTimePreference>('balanced');

  const submit = async () => {
    try {
      clearError();
      const profile = buildProfile({
        name,
        age,
        sex,
        heightCm,
        weightKg,
        restingHeartRate,
        targetWeightKg,
        goal,
        activityLevel,
        mealsPerDay,
        allergies,
        forbiddenFoods,
        dislikedFoods,
        preferredCuisines,
        cookingTimePreference,
      });
      await saveProfile(profile);
      await generateWeek(profile);
      router.replace('/(tabs)/week');
    } catch (submitError) {
      Alert.alert(
        'Could not finish setup',
        submitError instanceof Error ? submitError.message : 'Please review your values and try again.',
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Pill label="Nutrition Planner MVP" tone="accent" />
          <Text style={styles.title}>Build a weekly menu from real constraints, not guesswork.</Text>
          <Text style={styles.subtitle}>
            We use your profile, goal, activity, exclusions, and preferred food style to assemble a seven-day plan plus shopping list.
          </Text>
        </View>

        {error ? <InfoBanner message={error} tone="danger" /> : null}

        <ScreenCard>
          <SectionTitle
            title="Physical profile"
            subtitle="These numbers drive calories, macro floors, and meal sizing."
          />
          <FieldLabel label="Name (optional)" />
          <AppTextInput value={name} onChangeText={setName} placeholder="Alex" />

          <View style={styles.row}>
            <View style={styles.column}>
              <FieldLabel label="Age" />
              <AppTextInput value={age} onChangeText={setAge} keyboardType="number-pad" />
            </View>
            <View style={styles.column}>
              <FieldLabel label="Sex for BMR" />
              <ChoiceRow
                value={sex}
                options={[
                  { label: 'Male', value: 'male' },
                  { label: 'Female', value: 'female' },
                ]}
                onChange={(value) => setSex(value as Sex)}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.column}>
              <FieldLabel label="Height (cm)" />
              <AppTextInput
                value={heightCm}
                onChangeText={setHeightCm}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.column}>
              <FieldLabel label="Weight (kg)" />
              <AppTextInput
                value={weightKg}
                onChangeText={setWeightKg}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.column}>
              <FieldLabel label="Resting heart rate" />
              <AppTextInput
                value={restingHeartRate}
                onChangeText={setRestingHeartRate}
                keyboardType="number-pad"
                placeholder="Optional"
              />
            </View>
            <View style={styles.column}>
              <FieldLabel label="Target weight" />
              <AppTextInput
                value={targetWeightKg}
                onChangeText={setTargetWeightKg}
                keyboardType="decimal-pad"
                placeholder="Optional"
              />
            </View>
          </View>
        </ScreenCard>

        <ScreenCard>
          <SectionTitle
            title="Planning rules"
            subtitle="This shapes the weekly calorie target, meal count, and style of recipes."
          />

          <FieldLabel label="Goal" />
          <ChoiceRow
            value={goal}
            options={[
              { label: 'Lose', value: 'lose' },
              { label: 'Maintain', value: 'maintain' },
              { label: 'Gain', value: 'gain' },
            ]}
            onChange={(value) => setGoal(value as Goal)}
          />

          <FieldLabel label="Activity level" />
          <ChoiceRow
            value={activityLevel}
            options={[
              { label: 'Sedentary', value: 'sedentary' },
              { label: 'Light', value: 'light' },
              { label: 'Moderate', value: 'moderate' },
              { label: 'Very', value: 'very' },
              { label: 'Athlete', value: 'athlete' },
            ]}
            onChange={(value) => setActivityLevel(value as ActivityLevel)}
          />

          <FieldLabel label="Meals per day" />
          <ChoiceRow
            value={String(mealsPerDay)}
            options={[
              { label: '3 meals', value: '3' },
              { label: '4 meals', value: '4' },
            ]}
            onChange={(value) => setMealsPerDay(value === '3' ? 3 : 4)}
          />

          <FieldLabel label="Cooking time preference" />
          <ChoiceRow
            value={cookingTimePreference}
            options={[
              { label: 'Quick', value: 'quick' },
              { label: 'Balanced', value: 'balanced' },
              { label: 'Flexible', value: 'flexible' },
            ]}
            onChange={(value) => setCookingTimePreference(value as CookingTimePreference)}
          />
        </ScreenCard>

        <ScreenCard>
          <SectionTitle
            title="Constraints and taste"
            subtitle="Use comma-separated lists. Allergies, forbidden foods, and dislikes are treated as hard constraints."
          />

          <FieldLabel label="Allergies" />
          <AppTextInput
            value={allergies}
            onChangeText={setAllergies}
            placeholder="Peanut, shellfish"
          />

          <FieldLabel label="Forbidden foods" />
          <AppTextInput
            value={forbiddenFoods}
            onChangeText={setForbiddenFoods}
            placeholder="Pork, alcohol"
          />

          <FieldLabel label="Disliked foods" />
          <AppTextInput
            value={dislikedFoods}
            onChangeText={setDislikedFoods}
            placeholder="Mushrooms, olives"
          />

          <FieldLabel label="Preferred cuisines or food style" />
          <AppTextInput
            value={preferredCuisines}
            onChangeText={setPreferredCuisines}
            placeholder="Mediterranean, high-protein, warm bowls"
          />
        </ScreenCard>

        <PrimaryButton
          label={busy ? 'Building your week...' : 'Create profile and generate week'}
          onPress={submit}
          disabled={busy}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function ChoiceRow({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.choiceRow}>
      {options.map((option) => {
        const active = option.value === value;

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.choice, active ? styles.choiceActive : null]}
          >
            <Text style={[styles.choiceText, active ? styles.choiceTextActive : null]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
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
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  title: {
    color: colors.ink,
    fontFamily: 'Georgia',
    fontSize: 31,
    lineHeight: 37,
  },
  subtitle: {
    color: colors.inkMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  column: {
    flex: 1,
    gap: spacing.sm,
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
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  choiceActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  choiceText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '600',
  },
  choiceTextActive: {
    color: colors.accentStrong,
  },
});
