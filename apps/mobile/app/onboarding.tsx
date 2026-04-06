import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type {
  ActivityLevel,
  CookingTimePreference,
  Goal,
  Sex,
  UserProfile,
} from '@nutrition-planner/shared';

import {
  AppTextInput,
  ChoiceChip,
  FieldLabel,
  HeroPanel,
  InfoBanner,
  Pill,
  PrimaryButton,
  ScreenCard,
  SectionTitle,
} from '../components/ui';
import { useAppStore } from '../lib/app-store';
import { colors, spacing } from '../theme';

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
        <HeroPanel
          eyebrow="Mobile meal planning"
          title="Build a realistic week around your body, appetite, and non-negotiables."
          subtitle="You answer a few fast questions once. The app turns them into a seven-day menu, exact ingredient grams, and a shopping list you can actually use."
          tone="warm"
        >
          <View style={styles.heroPills}>
            <Pill label="7-day plan" tone="ink" />
            <Pill label="Recipes in grams" tone="ink" />
            <Pill label="Auto shopping list" tone="ink" />
          </View>
        </HeroPanel>

        {error ? <InfoBanner message={error} tone="danger" /> : null}

        <ScreenCard>
          <SectionTitle
            eyebrow="Step 1"
            title="Body profile"
            subtitle="These numbers power calories, protein floors, and portion sizing."
          />

          <FieldLabel label="Name (optional)" />
          <AppTextInput value={name} onChangeText={setName} placeholder="Alex" />

          <View style={styles.inputRow}>
            <View style={styles.inputColumn}>
              <FieldLabel label="Age" />
              <AppTextInput value={age} onChangeText={setAge} keyboardType="number-pad" />
            </View>
            <View style={styles.inputColumn}>
              <FieldLabel label="Sex for BMR" />
              <ChoiceWrap>
                <ChoiceChip label="Male" active={sex === 'male'} onPress={() => setSex('male')} />
                <ChoiceChip
                  label="Female"
                  active={sex === 'female'}
                  onPress={() => setSex('female')}
                />
              </ChoiceWrap>
            </View>
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputColumn}>
              <FieldLabel label="Height (cm)" />
              <AppTextInput
                value={heightCm}
                onChangeText={setHeightCm}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.inputColumn}>
              <FieldLabel label="Weight (kg)" />
              <AppTextInput
                value={weightKg}
                onChangeText={setWeightKg}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputColumn}>
              <FieldLabel label="Resting heart rate" />
              <AppTextInput
                value={restingHeartRate}
                onChangeText={setRestingHeartRate}
                keyboardType="number-pad"
                placeholder="Optional"
              />
            </View>
            <View style={styles.inputColumn}>
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

        <ScreenCard tone="muted">
          <SectionTitle
            eyebrow="Step 2"
            title="Planning rules"
            subtitle="This is where the week becomes personal instead of generic."
          />

          <FieldLabel label="Goal" />
          <ChoiceWrap>
            <ChoiceChip label="Lose" active={goal === 'lose'} onPress={() => setGoal('lose')} />
            <ChoiceChip
              label="Maintain"
              active={goal === 'maintain'}
              onPress={() => setGoal('maintain')}
            />
            <ChoiceChip label="Gain" active={goal === 'gain'} onPress={() => setGoal('gain')} />
          </ChoiceWrap>

          <FieldLabel label="Activity level" />
          <ChoiceWrap>
            <ChoiceChip
              label="Sedentary"
              active={activityLevel === 'sedentary'}
              onPress={() => setActivityLevel('sedentary')}
            />
            <ChoiceChip
              label="Light"
              active={activityLevel === 'light'}
              onPress={() => setActivityLevel('light')}
            />
            <ChoiceChip
              label="Moderate"
              active={activityLevel === 'moderate'}
              onPress={() => setActivityLevel('moderate')}
            />
            <ChoiceChip
              label="Very active"
              active={activityLevel === 'very'}
              onPress={() => setActivityLevel('very')}
            />
            <ChoiceChip
              label="Athlete"
              active={activityLevel === 'athlete'}
              onPress={() => setActivityLevel('athlete')}
            />
          </ChoiceWrap>

          <FieldLabel label="Eating moments per day" />
          <ChoiceWrap>
            <ChoiceChip
              label="3 meals"
              active={mealsPerDay === 3}
              onPress={() => setMealsPerDay(3)}
            />
            <ChoiceChip
              label="4 meals"
              active={mealsPerDay === 4}
              onPress={() => setMealsPerDay(4)}
            />
          </ChoiceWrap>

          <FieldLabel label="Cooking rhythm" />
          <ChoiceWrap>
            <ChoiceChip
              label="Quick"
              active={cookingTimePreference === 'quick'}
              onPress={() => setCookingTimePreference('quick')}
            />
            <ChoiceChip
              label="Balanced"
              active={cookingTimePreference === 'balanced'}
              onPress={() => setCookingTimePreference('balanced')}
            />
            <ChoiceChip
              label="Flexible"
              active={cookingTimePreference === 'flexible'}
              onPress={() => setCookingTimePreference('flexible')}
            />
          </ChoiceWrap>
        </ScreenCard>

        <ScreenCard>
          <SectionTitle
            eyebrow="Step 3"
            title="Constraints and taste"
            subtitle="Comma-separated lists are enough. Allergies, forbidden foods, and dislikes are treated as hard rules."
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
            placeholder="Mediterranean, warm bowls, high-protein"
          />
        </ScreenCard>

        <ScreenCard tone="accent" style={styles.ctaCard}>
          <View style={styles.ctaCopy}>
            <Text style={styles.ctaTitle}>Ready to generate your first week?</Text>
            <Text style={styles.ctaText}>
              We&apos;ll build {mealsPerDay} eating moments per day around your {goal} goal and keep the hard food rules intact.
            </Text>
          </View>
          <PrimaryButton
            label={busy ? 'Building your week...' : 'Create profile and generate week'}
            onPress={submit}
            disabled={busy}
            tone="warm"
          />
        </ScreenCard>
      </ScrollView>
    </SafeAreaView>
  );
}

function ChoiceWrap({ children }: { children: React.ReactNode }) {
  return <View style={styles.choiceWrap}>{children}</View>;
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: spacing.xxl + 24,
  },
  heroPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inputColumn: {
    flex: 1,
    gap: spacing.sm,
  },
  choiceWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  ctaCard: {
    gap: spacing.md,
  },
  ctaCopy: {
    gap: 6,
  },
  ctaTitle: {
    color: colors.accentDeep,
    fontFamily: 'Georgia',
    fontSize: 24,
    lineHeight: 29,
  },
  ctaText: {
    color: colors.inkSoft,
    fontSize: 14,
    lineHeight: 21,
  },
});
