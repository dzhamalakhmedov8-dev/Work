import React, { useEffect, useMemo, useState } from 'react';
import { AntDesign } from '@expo/vector-icons';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type AccessibilityState,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import type { PlanValidation } from '@nutrition-planner/shared';

import { colors, radii, shadows, spacing } from '../theme';

type CardTone =
  | 'base'
  | 'elevated'
  | 'accent'
  | 'warm'
  | 'danger'
  | 'success'
  | 'muted'
  | 'neutral';
type PillTone = 'neutral' | 'accent' | 'warm' | 'ink' | 'success' | 'danger';
type BannerTone = 'neutral' | 'danger' | 'success' | 'warm';
type ToastTone = 'neutral' | 'danger' | 'success';
type AccountBannerTone = 'neutral' | 'success' | 'warm' | 'danger';

const resolveCardTone = (tone: CardTone): CardTone =>
  tone === 'neutral' ? 'elevated' : tone === 'muted' ? 'base' : tone;

export function ScreenCard({
  children,
  style,
  tone = 'elevated',
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: CardTone;
}) {
  const resolvedTone = resolveCardTone(tone);

  return (
    <View
      style={[
        styles.card,
        resolvedTone === 'base' ? styles.cardBase : null,
        resolvedTone === 'elevated' ? styles.cardElevated : null,
        resolvedTone === 'accent' ? styles.cardAccent : null,
        resolvedTone === 'warm' ? styles.cardWarm : null,
        resolvedTone === 'danger' ? styles.cardDanger : null,
        resolvedTone === 'success' ? styles.cardSuccess : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function HeroPanel({
  eyebrow,
  title,
  subtitle,
  children,
  style,
  tone = 'elevated',
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: CardTone;
}) {
  return (
    <ScreenCard style={[styles.heroPanel, style]} tone={tone}>
      {eyebrow ? <Text style={styles.heroEyebrow}>{eyebrow}</Text> : null}
      <View style={styles.heroCopy}>
        <Text style={styles.heroTitle}>{title}</Text>
        {subtitle ? <Text style={styles.heroSubtitle}>{subtitle}</Text> : null}
      </View>
      {children}
    </ScreenCard>
  );
}

export function SectionTitle({
  title,
  subtitle,
  eyebrow,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      {eyebrow ? <Text style={styles.sectionEyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  accessibilityLabel?: string;
};

export function PrimaryButton({
  label,
  onPress,
  disabled,
  tone = 'accent',
  accessibilityLabel,
}: ButtonProps & {
  tone?: 'accent' | 'warm';
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      onPress={() => {
        void onPress();
      }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.primaryButton,
        tone === 'warm' ? styles.primaryButtonWarm : null,
        disabled ? styles.buttonDisabled : null,
        pressed && !disabled ? styles.buttonPressed : null,
      ]}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  disabled,
  accessibilityLabel,
}: ButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      onPress={() => {
        void onPress();
      }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.secondaryButton,
        disabled ? styles.buttonDisabled : null,
        pressed && !disabled ? styles.buttonPressed : null,
      ]}
    >
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

export function SocialButton({
  label,
  provider,
  onPress,
  disabled,
  accessibilityLabel,
}: ButtonProps & { provider: 'google' | 'apple' }) {
  const isApple = provider === 'apple';

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      onPress={() => {
        void onPress();
      }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.socialButton,
        isApple ? styles.socialButtonApple : null,
        disabled ? styles.buttonDisabled : null,
        pressed && !disabled ? styles.buttonPressed : null,
      ]}
    >
      <View
        style={[
          styles.socialButtonIconWrap,
          isApple ? styles.socialButtonIconWrapApple : null,
        ]}
      >
        <AntDesign
          color={isApple ? colors.white : colors.ink}
          name={isApple ? 'apple' : 'google'}
          size={18}
        />
      </View>
      <Text
        style={[
          styles.socialButtonText,
          isApple ? styles.socialButtonTextApple : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function SmallButton({
  label,
  onPress,
  disabled,
  tone = 'secondary',
  accessibilityLabel,
}: ButtonProps & { tone?: 'secondary' | 'accent' }) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      onPress={() => {
        void onPress();
      }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.smallButton,
        tone === 'accent' ? styles.smallButtonAccent : null,
        disabled ? styles.buttonDisabled : null,
        pressed && !disabled ? styles.buttonPressed : null,
      ]}
    >
      <Text style={[styles.smallButtonText, tone === 'accent' ? styles.smallButtonTextAccent : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function ChoiceChip({
  label,
  active,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const accessibilityState: AccessibilityState = useMemo(
    () => ({
      selected: active,
    }),
    [active],
  );

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choiceChip,
        active ? styles.choiceChipActive : null,
        pressed ? styles.buttonPressed : null,
      ]}
    >
      <Text style={[styles.choiceChipText, active ? styles.choiceChipTextActive : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function SegmentedControl<T extends string | number>({
  label,
  value,
  onChange,
  options,
}: {
  label?: string;
  value: T;
  onChange: (nextValue: T) => void;
  options: Array<{ label: string; value: T }>;
}) {
  return (
    <View style={styles.segmentedWrap}>
      {label ? <FieldLabel label={label} /> : null}
      <View style={styles.segmentedControl}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <Pressable
              key={String(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.segmentedOption,
                active ? styles.segmentedOptionActive : null,
                pressed ? styles.buttonPressed : null,
              ]}
            >
              <Text
                style={[
                  styles.segmentedOptionText,
                  active ? styles.segmentedOptionTextActive : null,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Pill({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: PillTone;
}) {
  return (
    <View
      style={[
        styles.pill,
        tone === 'accent' ? styles.pillAccent : null,
        tone === 'warm' ? styles.pillWarm : null,
        tone === 'ink' ? styles.pillInk : null,
        tone === 'success' ? styles.pillSuccess : null,
        tone === 'danger' ? styles.pillDanger : null,
      ]}
    >
      <Text
        style={[
          styles.pillText,
          tone === 'accent' || tone === 'warm' || tone === 'ink' || tone === 'danger'
            ? styles.pillTextLight
            : null,
          tone === 'success' ? styles.pillTextSuccess : null,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export function MetricTile({
  label,
  value,
  caption,
  tone = 'base',
}: {
  label: string;
  value: string;
  caption?: string;
  tone?: 'base' | 'accent' | 'warm';
}) {
  return (
    <View
      style={[
        styles.metricTile,
        tone === 'accent' ? styles.metricTileAccent : null,
        tone === 'warm' ? styles.metricTileWarm : null,
      ]}
    >
      <Text style={[styles.metricLabel, tone === 'accent' ? styles.metricLabelAccent : null]}>
        {label}
      </Text>
      <Text style={styles.metricValue}>{value}</Text>
      {caption ? <Text style={styles.metricCaption}>{caption}</Text> : null}
    </View>
  );
}

export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export function InfoBanner({
  message,
  tone = 'neutral',
}: {
  message: string;
  tone?: BannerTone;
}) {
  return (
    <View
      style={[
        styles.banner,
        tone === 'danger' ? styles.bannerDanger : null,
        tone === 'success' ? styles.bannerSuccess : null,
        tone === 'warm' ? styles.bannerWarm : null,
      ]}
    >
      <Text
        style={[
          styles.bannerText,
          tone === 'danger' ? styles.bannerTextDanger : null,
          tone === 'success' ? styles.bannerTextSuccess : null,
          tone === 'warm' ? styles.bannerTextWarm : null,
        ]}
      >
        {message}
      </Text>
    </View>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <ScreenCard style={styles.emptyCard} tone="base">
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
      {action}
    </ScreenCard>
  );
}

export function FieldLabel({ label }: { label: string }) {
  return <Text style={styles.fieldLabel}>{label}</Text>;
}

export function InlineFieldHint({ children }: { children: React.ReactNode }) {
  return <Text style={styles.fieldHint}>{children}</Text>;
}

export function FieldErrorText({ children }: { children: React.ReactNode }) {
  return <Text style={styles.fieldError}>{children}</Text>;
}

export function AppTextInput(
  props: TextInputProps & {
    hasError?: boolean;
  },
) {
  return (
    <TextInput
      placeholderTextColor={colors.inkMuted}
      selectionColor={colors.accent}
      {...props}
      style={[styles.input, props.hasError ? styles.inputError : null, props.style]}
    />
  );
}

export function ChipInput({
  label,
  values,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  values: string[];
  onChange: (nextValue: string[]) => void;
  placeholder?: string;
  hint?: string;
}) {
  const [draftValue, setDraftValue] = useState('');

  const addDraft = () => {
    const nextItems = draftValue
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    if (nextItems.length === 0) {
      return;
    }

    const nextValues = [...values];
    for (const item of nextItems) {
      if (!nextValues.some((value) => value.toLowerCase() === item.toLowerCase())) {
        nextValues.push(item);
      }
    }

    onChange(nextValues);
    setDraftValue('');
  };

  const removeValue = (valueToRemove: string) => {
    onChange(values.filter((value) => value !== valueToRemove));
  };

  return (
    <View style={styles.fieldGroup}>
      <FieldLabel label={label} />
      {hint ? <InlineFieldHint>{hint}</InlineFieldHint> : null}
      {values.length > 0 ? (
        <View style={styles.chipInputList}>
          {values.map((value) => (
            <Pressable
              key={value}
              accessibilityLabel={`Remove ${value}`}
              accessibilityRole="button"
              onPress={() => removeValue(value)}
              style={({ pressed }) => [
                styles.removableChip,
                pressed ? styles.buttonPressed : null,
              ]}
            >
              <Text style={styles.removableChipText}>{value}</Text>
              <Text style={styles.removableChipRemove}>x</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <View style={styles.chipInputRow}>
        <AppTextInput
          value={draftValue}
          onChangeText={setDraftValue}
          placeholder={placeholder}
          style={styles.chipInputField}
          onSubmitEditing={addDraft}
          returnKeyType="done"
        />
        <SmallButton label="Add" onPress={addDraft} tone="accent" />
      </View>
    </View>
  );
}

export function StickyActionBar({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <View pointerEvents="box-none" style={styles.stickyBarWrap}>
      <View style={styles.stickyBar}>{children}</View>
    </View>
  );
}

export function CollapsibleSection({
  title,
  subtitle,
  trailing,
  defaultExpanded = false,
  children,
}: {
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <View style={styles.collapsibleSection}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((current) => !current)}
        style={({ pressed }) => [
          styles.collapsibleHeader,
          pressed ? styles.buttonPressed : null,
        ]}
      >
        <View style={styles.collapsibleCopy}>
          <Text style={styles.collapsibleTitle}>{title}</Text>
          {subtitle ? <Text style={styles.collapsibleSubtitle}>{subtitle}</Text> : null}
        </View>
        <View style={styles.collapsibleRight}>
          {trailing}
          <Text style={styles.collapsibleToggle}>{expanded ? 'Hide' : 'Show'}</Text>
        </View>
      </Pressable>
      {expanded ? <View style={styles.collapsibleBody}>{children}</View> : null}
    </View>
  );
}

export function ValidationStatusCard({
  validation,
}: {
  validation: PlanValidation;
}) {
  const tone: CardTone = validation.isValid
    ? 'success'
    : validation.errors.length > 0
      ? 'danger'
      : 'warm';
  const title = validation.isValid
    ? 'Plan validated'
    : validation.errors.length > 0
      ? 'Plan needs attention'
      : 'Plan has warnings';
  const summary = validation.isValid
    ? 'Calories, macros, and exclusions are within the app tolerances.'
    : validation.errors.length > 0
      ? `${validation.errors.length} issue(s) need attention before you trust this week fully.`
      : `${validation.warnings.length} warning(s) were found, but the plan is still usable.`;
  const lines = validation.isValid
    ? validation.dayResults
        .filter((item) => item.warnings.length > 0)
        .slice(0, 2)
        .map((item) => `${item.label}: ${item.warnings[0]}`)
    : [...validation.errors, ...validation.warnings].slice(0, 3);

  return (
    <ScreenCard tone={tone}>
      <View style={styles.validationHeader}>
        <View style={styles.validationCopy}>
          <Text style={styles.validationTitle}>{title}</Text>
          <Text style={styles.validationSummary}>{summary}</Text>
        </View>
        <Pill
          label={validation.isValid ? 'Ready' : validation.errors.length > 0 ? 'Review' : 'Warnings'}
          tone={validation.isValid ? 'success' : validation.errors.length > 0 ? 'danger' : 'warm'}
        />
      </View>
      {lines.length > 0 ? (
        <View style={styles.validationList}>
          {lines.map((line) => (
            <Text key={line} style={styles.validationLine}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}
    </ScreenCard>
  );
}

export function AccountStateBanner({
  title,
  message,
  tone = 'neutral',
}: {
  title: string;
  message: string;
  tone?: AccountBannerTone;
}) {
  return (
    <ScreenCard
      tone={
        tone === 'success'
          ? 'success'
          : tone === 'danger'
            ? 'danger'
            : tone === 'warm'
              ? 'warm'
              : 'base'
      }
    >
      <View style={styles.accountBannerHeader}>
        <Text style={styles.accountBannerTitle}>{title}</Text>
        <Pill
          label={tone === 'success' ? 'Synced' : tone === 'danger' ? 'Needs review' : tone === 'warm' ? 'Attention' : 'Working'}
          tone={tone === 'success' ? 'success' : tone === 'danger' ? 'danger' : tone === 'warm' ? 'warm' : 'accent'}
        />
      </View>
      <Text style={styles.accountBannerBody}>{message}</Text>
    </ScreenCard>
  );
}

export function Snackbar({
  message,
  tone = 'neutral',
  onDismiss,
}: {
  message: string;
  tone?: ToastTone;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timeoutId = setTimeout(onDismiss, 3200);
    return () => clearTimeout(timeoutId);
  }, [message, onDismiss]);

  return (
    <View pointerEvents="box-none" style={styles.snackbarWrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss notification"
        onPress={onDismiss}
        style={[
          styles.snackbar,
          tone === 'success' ? styles.snackbarSuccess : null,
          tone === 'danger' ? styles.snackbarDanger : null,
        ]}
      >
        <Text style={styles.snackbarText}>{message}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  cardBase: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  cardElevated: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardAccent: {
    backgroundColor: colors.surfaceAccent,
    borderColor: '#b5d1c0',
  },
  cardWarm: {
    backgroundColor: colors.surfaceWarm,
    borderColor: '#e6baa3',
  },
  cardDanger: {
    backgroundColor: colors.dangerSoft,
    borderColor: '#e5b1a7',
  },
  cardSuccess: {
    backgroundColor: colors.successSoft,
    borderColor: '#b8d4c2',
  },
  heroPanel: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  heroEyebrow: {
    color: colors.accentStrong,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  heroCopy: {
    gap: spacing.xs,
  },
  heroTitle: {
    color: colors.ink,
    fontFamily: 'Georgia',
    fontSize: 31,
    lineHeight: 38,
  },
  heroSubtitle: {
    color: colors.inkSoft,
    fontSize: 16,
    lineHeight: 24,
  },
  sectionHeader: {
    gap: 4,
  },
  sectionEyebrow: {
    color: colors.accentStrong,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
  },
  sectionSubtitle: {
    color: colors.inkMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    ...shadows.soft,
  },
  primaryButtonWarm: {
    backgroundColor: colors.warm,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.borderStrong,
    borderRadius: radii.sm,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  socialButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.borderStrong,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  socialButtonApple: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  socialButtonIconWrap: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  socialButtonIconWrapApple: {
    backgroundColor: '#2f3d35',
  },
  smallButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.borderStrong,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 42,
    minWidth: 68,
    paddingHorizontal: 14,
  },
  smallButtonAccent: {
    backgroundColor: colors.accentDeep,
    borderColor: colors.accentDeep,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonPressed: {
    transform: [{ scale: 0.985 }],
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  socialButtonText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  socialButtonTextApple: {
    color: colors.white,
  },
  smallButtonText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  smallButtonTextAccent: {
    color: colors.white,
  },
  choiceChip: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  choiceChipActive: {
    backgroundColor: colors.accentDeep,
    borderColor: colors.accentDeep,
  },
  choiceChipText: {
    color: colors.inkSoft,
    fontSize: 15,
    fontWeight: '600',
  },
  choiceChipTextActive: {
    color: colors.white,
  },
  segmentedWrap: {
    gap: spacing.sm,
  },
  segmentedControl: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 4,
  },
  segmentedOption: {
    alignItems: 'center',
    borderRadius: radii.xs,
    flex: 1,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  segmentedOptionActive: {
    backgroundColor: colors.surfaceRaised,
    ...shadows.soft,
  },
  segmentedOptionText: {
    color: colors.inkSoft,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  segmentedOptionTextActive: {
    color: colors.ink,
    fontWeight: '700',
  },
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pillAccent: {
    backgroundColor: colors.accentDeep,
  },
  pillWarm: {
    backgroundColor: colors.warmStrong,
  },
  pillInk: {
    backgroundColor: colors.ink,
  },
  pillSuccess: {
    backgroundColor: colors.successSoft,
  },
  pillDanger: {
    backgroundColor: colors.danger,
  },
  pillText: {
    color: colors.inkSoft,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  pillTextLight: {
    color: colors.white,
  },
  pillTextSuccess: {
    color: colors.success,
  },
  metricTile: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    minWidth: 120,
    padding: spacing.sm,
  },
  metricTileAccent: {
    backgroundColor: colors.accentSoft,
    borderColor: '#bad4c2',
  },
  metricTileWarm: {
    backgroundColor: colors.warmSoft,
    borderColor: '#e6baa3',
  },
  metricLabel: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  metricLabelAccent: {
    color: colors.accentStrong,
  },
  metricValue: {
    color: colors.ink,
    fontSize: 25,
    fontWeight: '700',
    lineHeight: 30,
  },
  metricCaption: {
    color: colors.inkMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  detailRow: {
    gap: 6,
  },
  detailLabel: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  detailValue: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 22,
  },
  banner: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    padding: spacing.sm,
  },
  bannerDanger: {
    backgroundColor: colors.dangerSoft,
    borderColor: '#e4b0a5',
  },
  bannerSuccess: {
    backgroundColor: colors.successSoft,
    borderColor: '#b6d3c1',
  },
  bannerWarm: {
    backgroundColor: colors.warmSoft,
    borderColor: '#e5b6a3',
  },
  bannerText: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 21,
  },
  bannerTextDanger: {
    color: colors.danger,
  },
  bannerTextSuccess: {
    color: colors.success,
  },
  bannerTextWarm: {
    color: colors.warmStrong,
  },
  emptyCard: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
    textAlign: 'center',
  },
  emptyDescription: {
    color: colors.inkMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  fieldLabel: {
    color: colors.inkSoft,
    fontSize: 13,
    fontWeight: '700',
  },
  fieldHint: {
    color: colors.inkMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  fieldError: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  input: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  inputError: {
    borderColor: colors.danger,
  },
  chipInputList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  removableChip: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  removableChipText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '600',
  },
  removableChipRemove: {
    color: colors.accentStrong,
    fontSize: 14,
    fontWeight: '700',
  },
  chipInputRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chipInputField: {
    flex: 1,
  },
  stickyBarWrap: {
    bottom: 0,
    left: 0,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    position: 'absolute',
    right: 0,
  },
  stickyBar: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
    ...shadows.card,
  },
  collapsibleSection: {
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    overflow: 'hidden',
  },
  collapsibleHeader: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  collapsibleCopy: {
    flex: 1,
    gap: 2,
    paddingRight: spacing.sm,
  },
  collapsibleTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  collapsibleSubtitle: {
    color: colors.inkMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  collapsibleRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  collapsibleToggle: {
    color: colors.accentStrong,
    fontSize: 13,
    fontWeight: '700',
  },
  collapsibleBody: {
    backgroundColor: colors.surfaceRaised,
    gap: spacing.sm,
    padding: spacing.sm,
  },
  validationHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  validationCopy: {
    flex: 1,
    gap: 4,
    paddingRight: spacing.sm,
  },
  validationTitle: {
    color: colors.ink,
    fontSize: 19,
    fontWeight: '700',
    lineHeight: 24,
  },
  validationSummary: {
    color: colors.inkSoft,
    fontSize: 14,
    lineHeight: 20,
  },
  validationList: {
    gap: 6,
  },
  validationLine: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 20,
  },
  accountBannerHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  accountBannerTitle: {
    color: colors.ink,
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 23,
    paddingRight: spacing.sm,
  },
  accountBannerBody: {
    color: colors.inkMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  snackbarWrap: {
    bottom: 92,
    left: 0,
    paddingHorizontal: spacing.md,
    pointerEvents: 'box-none',
    position: 'absolute',
    right: 0,
  },
  snackbar: {
    backgroundColor: colors.ink,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...shadows.card,
  },
  snackbarSuccess: {
    backgroundColor: colors.accentDeep,
  },
  snackbarDanger: {
    backgroundColor: colors.danger,
  },
  snackbarText: {
    color: colors.white,
    fontSize: 14,
    lineHeight: 20,
  },
});

export type { ToastTone };
