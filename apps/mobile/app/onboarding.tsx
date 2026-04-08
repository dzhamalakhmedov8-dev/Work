import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type {
  ActivityLevel,
  CookingTimePreference,
  Goal,
  Sex,
  UserProfile,
} from '@nutrition-planner/shared';
import { calculateNutritionTargets } from '@nutrition-planner/shared';

import {
  AppTextInput,
  ChipInput,
  ChoiceChip,
  CollapsibleSection,
  FieldErrorText,
  HeroPanel,
  InfoBanner,
  InlineFieldHint,
  MetricTile,
  Pill,
  PrimaryButton,
  ScreenCard,
  SecondaryButton,
  SectionTitle,
  SegmentedControl,
  StickyActionBar,
} from '../components/ui';
import { useAppStore } from '../lib/app-store';
import { useAuthStore } from '../lib/auth-store';
import { formatActivityLevel, formatGoal, formatList } from '../lib/format';
import { colors, spacing } from '../theme';

type OnboardingStep = 1 | 2 | 3 | 4;

type OnboardingDraft = {
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
  allergies: string[];
  forbiddenFoods: string[];
  dislikedFoods: string[];
  preferredCuisines: string[];
  cookingTimePreference: CookingTimePreference;
};

const clampStep = (value: number): OnboardingStep => {
  if (value <= 1) {
    return 1;
  }
  if (value >= 4) {
    return 4;
  }
  return value as OnboardingStep;
};

const parseNumber = (value: string): number | null => {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const validateRange = (
  value: string,
  min: number,
  max: number,
  label: string,
  optional = false,
): string | null => {
  const parsed = parseNumber(value);

  if (parsed === null) {
    return optional ? null : `${label} is required.`;
  }

  if (parsed < min || parsed > max) {
    return `${label} must be between ${min} and ${max}.`;
  }

  return null;
};

const createDraft = (profile?: UserProfile | null): OnboardingDraft => ({
  name: profile?.name ?? '',
  age: profile ? String(profile.age) : '',
  sex: profile?.sex ?? 'male',
  heightCm: profile ? String(profile.heightCm) : '',
  weightKg: profile ? String(profile.weightKg) : '',
  restingHeartRate: profile?.restingHeartRate ? String(profile.restingHeartRate) : '',
  targetWeightKg: profile?.targetWeightKg ? String(profile.targetWeightKg) : '',
  goal: profile?.goal ?? 'maintain',
  activityLevel: profile?.activityLevel ?? 'moderate',
  mealsPerDay: profile?.mealsPerDay ?? 4,
  allergies: profile?.dietaryConstraints.allergies ?? [],
  forbiddenFoods: profile?.dietaryConstraints.forbiddenFoods ?? [],
  dislikedFoods: profile?.dietaryConstraints.dislikedFoods ?? [],
  preferredCuisines: profile?.dietaryConstraints.preferredCuisines ?? [],
  cookingTimePreference: profile?.dietaryConstraints.cookingTimePreference ?? 'balanced',
});

const buildProfile = (draft: OnboardingDraft, existingProfile?: UserProfile | null): UserProfile => {
  const now = new Date().toISOString();

  return {
    id: existingProfile?.id ?? `profile-${Date.now().toString(36)}`,
    createdAt: existingProfile?.createdAt ?? now,
    updatedAt: now,
    name: draft.name.trim() || undefined,
    age: Number(draft.age),
    sex: draft.sex,
    heightCm: Number(draft.heightCm),
    weightKg: Number(draft.weightKg),
    restingHeartRate: draft.restingHeartRate ? Number(draft.restingHeartRate) : undefined,
    targetWeightKg: draft.targetWeightKg ? Number(draft.targetWeightKg) : undefined,
    goal: draft.goal,
    activityLevel: draft.activityLevel,
    mealsPerDay: draft.mealsPerDay,
    dietaryConstraints: {
      allergies: draft.allergies,
      forbiddenFoods: draft.forbiddenFoods,
      dislikedFoods: draft.dislikedFoods,
      preferredCuisines: draft.preferredCuisines,
      cookingTimePreference: draft.cookingTimePreference,
    },
  };
};

const stepCopy: Record<
  OnboardingStep,
  { eyebrow: string; title: string; subtitle: string }
> = {
  1: {
    eyebrow: 'Step 1 of 4',
    title: 'Body inputs that shape calories and portions.',
    subtitle: 'Start with the numbers that directly affect energy targets and protein floors.',
  },
  2: {
    eyebrow: 'Step 2 of 4',
    title: 'Planning rules that change the week structure.',
    subtitle: 'Pick the goal, activity, meal rhythm, and cooking pace you want the planner to respect.',
  },
  3: {
    eyebrow: 'Step 3 of 4',
    title: 'Hard food rules and taste direction.',
    subtitle: 'Allergies, forbidden foods, and dislikes are treated as hard constraints. Taste preferences are soft guidance.',
  },
  4: {
    eyebrow: 'Step 4 of 4',
    title: 'Review the setup before generating your week.',
    subtitle: 'Check the preview, confirm the hard rules, and then build a seven-day plan.',
  },
};

export default function OnboardingScreen() {
  const params = useLocalSearchParams<{ step?: string | string[] }>();
  const requestedStep = clampStep(
    Number(Array.isArray(params.step) ? params.step[0] : params.step ?? '1'),
  );
  const {
    busy,
    clearError,
    error,
    operations,
    profile,
    queueGenerateWeekAfterAuth,
    ready,
    saveProfile,
    generateWeek,
  } = useAppStore();
  const { user } = useAuthStore();

  const [draft, setDraft] = useState<OnboardingDraft>(() => createDraft(profile));
  const [step, setStep] = useState<OnboardingStep>(requestedStep);
  const [bootstrappedFromProfile, setBootstrappedFromProfile] = useState(Boolean(profile));

  useEffect(() => {
    setStep(requestedStep);
  }, [requestedStep]);

  useEffect(() => {
    if (!bootstrappedFromProfile && profile) {
      setDraft(createDraft(profile));
      setBootstrappedFromProfile(true);
    }
  }, [bootstrappedFromProfile, profile]);

  const bodyErrors = useMemo(
    () => ({
      age: validateRange(draft.age, 18, 99, 'Age'),
      heightCm: validateRange(draft.heightCm, 120, 250, 'Height'),
      weightKg: validateRange(draft.weightKg, 35, 300, 'Weight'),
      restingHeartRate: validateRange(
        draft.restingHeartRate,
        30,
        220,
        'Resting heart rate',
        true,
      ),
      targetWeightKg: validateRange(draft.targetWeightKg, 35, 300, 'Target weight', true),
    }),
    [draft.age, draft.heightCm, draft.restingHeartRate, draft.targetWeightKg, draft.weightKg],
  );

  const stepErrors: Record<OnboardingStep, string[]> = useMemo(
    () => ({
      1: Object.values(bodyErrors).filter((value): value is string => Boolean(value)),
      2: [],
      3: [],
      4: Object.values(bodyErrors).filter((value): value is string => Boolean(value)),
    }),
    [bodyErrors],
  );

  const previewProfile = useMemo(() => {
    if (stepErrors[4].length > 0) {
      return null;
    }

    try {
      return buildProfile(draft, profile);
    } catch {
      return null;
    }
  }, [draft, profile, stepErrors]);

  const previewTargets = useMemo(() => {
    if (!previewProfile) {
      return null;
    }

    try {
      return calculateNutritionTargets(previewProfile);
    } catch {
      return null;
    }
  }, [previewProfile]);

  const requiredInputsComplete = stepErrors[1].length === 0;

  const nextStep = () => {
    clearError();
    if (step < 4) {
      setStep((current) => clampStep(current + 1));
    }
  };

  const previousStep = () => {
    clearError();
    if (step > 1) {
      setStep((current) => clampStep(current - 1));
    }
  };

  const submit = async () => {
    if (!previewProfile) {
      return;
    }

    try {
      clearError();
      if (!user) {
        await queueGenerateWeekAfterAuth(previewProfile, '/(tabs)/profile');
        return;
      }

      await saveProfile(previewProfile);
      await generateWeek(previewProfile, { returnPath: '/(tabs)/profile' });
      router.replace('/(tabs)/profile');
    } catch {
      // Error is already stored in the app store and shown inline on this screen.
    }
  };

  if (!ready) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>Loading your onboarding workspace...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <HeroPanel
          eyebrow={stepCopy[step].eyebrow}
          title={stepCopy[step].title}
          subtitle={stepCopy[step].subtitle}
          tone={step === 4 ? 'accent' : 'warm'}
        >
          <View style={styles.progressRow}>
            {[1, 2, 3, 4].map((value) => (
              <View
                key={value}
                style={[styles.progressSegment, value <= step ? styles.progressSegmentActive : null]}
              />
            ))}
          </View>
          <View style={styles.heroPills}>
            <Pill label={draft.mealsPerDay === 4 ? '4 eating moments' : '3 eating moments'} tone="ink" />
            <Pill label={formatGoal(draft.goal)} tone="ink" />
            <Pill label={formatActivityLevel(draft.activityLevel)} tone="ink" />
          </View>
        </HeroPanel>

        {error ? <InfoBanner message={error} tone="danger" /> : null}
        {stepErrors[step].length > 0 ? (
          <InfoBanner message={stepErrors[step][0]} tone="warm" />
        ) : null}

        {step === 1 ? (
          <ScreenCard>
            <SectionTitle
              eyebrow="Body profile"
              title="Core measurements"
              subtitle="These are the required inputs for the nutrition math."
            />

            <FieldGroup>
              <LabeledInput
                label="Age"
                value={draft.age}
                onChangeText={(value) => setDraft((current) => ({ ...current, age: value }))}
                keyboardType="number-pad"
                hint="Use years. The planner supports adult profiles."
                error={bodyErrors.age}
              />
              <SegmentedControl
                label="Sex used for BMR"
                value={draft.sex}
                onChange={(value) => setDraft((current) => ({ ...current, sex: value }))}
                options={[
                  { label: 'Male', value: 'male' as const },
                  { label: 'Female', value: 'female' as const },
                ]}
              />
            </FieldGroup>

            <View style={styles.inputRow}>
              <LabeledInput
                label="Height (cm)"
                value={draft.heightCm}
                onChangeText={(value) => setDraft((current) => ({ ...current, heightCm: value }))}
                keyboardType="decimal-pad"
                style={styles.inputColumn}
                error={bodyErrors.heightCm}
              />
              <LabeledInput
                label="Weight (kg)"
                value={draft.weightKg}
                onChangeText={(value) => setDraft((current) => ({ ...current, weightKg: value }))}
                keyboardType="decimal-pad"
                style={styles.inputColumn}
                error={bodyErrors.weightKg}
              />
            </View>

            <CollapsibleSection
              title="Advanced inputs"
              subtitle="Optional values for a more personal profile record."
            >
              <LabeledInput
                label="Name"
                value={draft.name}
                onChangeText={(value) => setDraft((current) => ({ ...current, name: value }))}
                placeholder="Alex"
              />
              <View style={styles.inputRow}>
                <LabeledInput
                  label="Resting heart rate"
                  value={draft.restingHeartRate}
                  onChangeText={(value) =>
                    setDraft((current) => ({ ...current, restingHeartRate: value }))
                  }
                  keyboardType="number-pad"
                  placeholder="Optional"
                  style={styles.inputColumn}
                  error={bodyErrors.restingHeartRate}
                />
                <LabeledInput
                  label="Target weight"
                  value={draft.targetWeightKg}
                  onChangeText={(value) =>
                    setDraft((current) => ({ ...current, targetWeightKg: value }))
                  }
                  keyboardType="decimal-pad"
                  placeholder="Optional"
                  style={styles.inputColumn}
                  error={bodyErrors.targetWeightKg}
                />
              </View>
            </CollapsibleSection>
          </ScreenCard>
        ) : null}

        {step === 2 ? (
          <ScreenCard tone="base">
            <SectionTitle
              eyebrow="Week structure"
              title="Planning rules"
              subtitle="These choices change the target calories, the meal rhythm, and the kind of recipes the week will contain."
            />

            <SegmentedControl
              label="Goal"
              value={draft.goal}
              onChange={(value) => setDraft((current) => ({ ...current, goal: value }))}
              options={[
                { label: 'Lose', value: 'lose' as const },
                { label: 'Maintain', value: 'maintain' as const },
                { label: 'Gain', value: 'gain' as const },
              ]}
            />

            <FieldGroup>
              <Text style={styles.groupLabel}>Activity level</Text>
              <InlineFieldHint>
                Choose the rhythm that best matches a normal week, not your best day.
              </InlineFieldHint>
              <View style={styles.choiceWrap}>
                {(
                  [
                    ['sedentary', 'Sedentary'],
                    ['light', 'Light'],
                    ['moderate', 'Moderate'],
                    ['very', 'Very active'],
                    ['athlete', 'Athlete'],
                  ] as Array<[ActivityLevel, string]>
                ).map(([value, label]) => (
                  <ChoiceChip
                    key={value}
                    label={label}
                    active={draft.activityLevel === value}
                    onPress={() => setDraft((current) => ({ ...current, activityLevel: value }))}
                    accessibilityLabel={`Activity level ${label}`}
                  />
                ))}
              </View>
            </FieldGroup>

            <SegmentedControl
              label="Eating moments per day"
              value={draft.mealsPerDay}
              onChange={(value) => setDraft((current) => ({ ...current, mealsPerDay: value }))}
              options={[
                { label: '3 meals', value: 3 as const },
                { label: '4 meals', value: 4 as const },
              ]}
            />

            <SegmentedControl
              label="Cooking rhythm"
              value={draft.cookingTimePreference}
              onChange={(value) =>
                setDraft((current) => ({ ...current, cookingTimePreference: value }))
              }
              options={[
                { label: 'Quick', value: 'quick' as const },
                { label: 'Balanced', value: 'balanced' as const },
                { label: 'Flexible', value: 'flexible' as const },
              ]}
            />
          </ScreenCard>
        ) : null}

        {step === 3 ? (
          <ScreenCard>
            <SectionTitle
              eyebrow="Food rules"
              title="Constraints and taste"
              subtitle="Hard rules are enforced during generation and validation. Taste preferences help the week feel personal."
            />

            <ChipInput
              label="Allergies"
              values={draft.allergies}
              onChange={(nextValue) => setDraft((current) => ({ ...current, allergies: nextValue }))}
              placeholder="Peanut, shellfish"
              hint="Use one item at a time or paste a comma-separated list."
            />

            <ChipInput
              label="Forbidden foods"
              values={draft.forbiddenFoods}
              onChange={(nextValue) =>
                setDraft((current) => ({ ...current, forbiddenFoods: nextValue }))
              }
              placeholder="Pork, alcohol"
            />

            <ChipInput
              label="Disliked foods"
              values={draft.dislikedFoods}
              onChange={(nextValue) =>
                setDraft((current) => ({ ...current, dislikedFoods: nextValue }))
              }
              placeholder="Mushrooms, olives"
            />

            <ChipInput
              label="Preferred cuisines or food styles"
              values={draft.preferredCuisines}
              onChange={(nextValue) =>
                setDraft((current) => ({ ...current, preferredCuisines: nextValue }))
              }
              placeholder="Mediterranean, high-protein bowls"
              hint="These are soft preferences, so the planner uses them as guidance rather than hard exclusions."
            />
          </ScreenCard>
        ) : null}

        {step === 4 ? (
          <>
            <ScreenCard tone="accent">
              <SectionTitle
                eyebrow="Preview"
                title="What this profile will generate"
                subtitle="This is a live preview from your current answers."
              />

              {previewTargets ? (
                <>
                  <View style={styles.metricRow}>
                    <MetricTile
                      label="Calories target"
                      value={`${Math.round(previewTargets.calories)} kcal`}
                      tone="accent"
                    />
                    <MetricTile
                      label="Protein floor"
                      value={`${Math.round(previewTargets.proteinFloorGrams)} g`}
                      tone="accent"
                    />
                  </View>
                  <View style={styles.metricRow}>
                    <MetricTile label="Meals/day" value={String(draft.mealsPerDay)} />
                    <MetricTile label="Cooking" value={draft.cookingTimePreference} />
                  </View>
                </>
              ) : (
                <InfoBanner
                  message="Complete the required body inputs before the planner can show an accurate preview."
                  tone="warm"
                />
              )}
            </ScreenCard>

            <ScreenCard>
              <SectionTitle
                eyebrow="Readiness"
                title="Confirm the owner and required inputs"
                subtitle="The app only generates a plan from confirmed data now, not seeded placeholder numbers."
              />
              <SummaryRow
                label="Account owner"
                value={user?.email ?? 'Signed-in account required to save this workspace'}
              />
              <SummaryRow
                label="Required body data"
                value={
                  requiredInputsComplete
                    ? 'Complete and ready for generation'
                    : 'Some required body inputs still need attention'
                }
              />
              <SummaryRow label="Goal" value={formatGoal(draft.goal)} />
              <SummaryRow label="Activity level" value={formatActivityLevel(draft.activityLevel)} />
            </ScreenCard>

            <ScreenCard>
              <SectionTitle
                eyebrow="Review"
                title="Hard rules and taste summary"
                subtitle="Take one last glance at the exclusions before you generate the week."
              />

              <SummaryRow label="Allergies" value={formatList(draft.allergies)} />
              <SummaryRow label="Forbidden foods" value={formatList(draft.forbiddenFoods)} />
              <SummaryRow label="Disliked foods" value={formatList(draft.dislikedFoods)} />
              <SummaryRow
                label="Preferred cuisines"
                value={formatList(draft.preferredCuisines, 'No taste preference saved')}
              />
            </ScreenCard>
          </>
        ) : null}
      </ScrollView>

      <StickyActionBar>
        {step > 1 ? (
          <SecondaryButton label="Back" onPress={previousStep} disabled={busy} />
        ) : (
          <SecondaryButton label="Cancel" onPress={() => router.back()} disabled={busy} />
        )}
        {step < 4 ? (
          <PrimaryButton
            label="Continue"
            onPress={nextStep}
            disabled={stepErrors[step].length > 0 || busy}
          />
        ) : (
          <PrimaryButton
            label={
              operations.generating || operations.savingProfile
                ? 'Building your week...'
                : !user
                  ? 'Continue to account and generate week'
                  : profile
                  ? 'Save profile and regenerate week'
                  : 'Create profile and generate week'
            }
            onPress={submit}
            disabled={!previewProfile || stepErrors[4].length > 0 || busy}
            tone="warm"
          />
        )}
      </StickyActionBar>
    </SafeAreaView>
  );
}

function FieldGroup({ children }: { children: React.ReactNode }) {
  return <View style={styles.fieldGroup}>{children}</View>;
}

function LabeledInput({
  label,
  hint,
  error,
  style,
  ...props
}: React.ComponentProps<typeof AppTextInput> & {
  label: string;
  hint?: string;
  error?: string | null;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.fieldGroup, style]}>
      <Text style={styles.groupLabel}>{label}</Text>
      {hint ? <InlineFieldHint>{hint}</InlineFieldHint> : null}
      <AppTextInput {...props} hasError={Boolean(error)} />
      {error ? <FieldErrorText>{error}</FieldErrorText> : null}
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  loadingWrap: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  loadingText: {
    color: colors.inkSoft,
    fontSize: 16,
  },
  content: {
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: 140,
  },
  progressRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  progressSegment: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    flex: 1,
    height: 8,
  },
  progressSegmentActive: {
    backgroundColor: colors.accentDeep,
  },
  heroPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inputColumn: {
    flex: 1,
  },
  choiceWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  groupLabel: {
    color: colors.inkSoft,
    fontSize: 13,
    fontWeight: '700',
  },
  metricRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  summaryRow: {
    gap: 6,
  },
  summaryLabel: {
    color: colors.inkMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  summaryValue: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 22,
  },
});
