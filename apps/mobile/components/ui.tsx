import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { colors, radii, shadows, spacing } from '../theme';

type CardTone = 'neutral' | 'muted' | 'accent' | 'warm';
type PillTone = 'neutral' | 'accent' | 'warm' | 'ink';

export function ScreenCard({
  children,
  style,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: CardTone;
}) {
  return (
    <View
      style={[
        styles.card,
        tone === 'muted' ? styles.cardMuted : null,
        tone === 'accent' ? styles.cardAccent : null,
        tone === 'warm' ? styles.cardWarm : null,
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
  tone = 'neutral',
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

export function PrimaryButton({
  label,
  onPress,
  disabled,
  tone = 'accent',
}: {
  label: string;
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  tone?: 'accent' | 'warm';
}) {
  return (
    <Pressable
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
}: {
  label: string;
  onPress: () => void | Promise<void>;
  disabled?: boolean;
}) {
  return (
    <Pressable
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

export function ChoiceChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
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
      ]}
    >
      <Text
        style={[
          styles.pillText,
          tone === 'accent' ? styles.pillTextAccent : null,
          tone === 'warm' ? styles.pillTextWarm : null,
          tone === 'ink' ? styles.pillTextInk : null,
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
  tone = 'neutral',
}: {
  label: string;
  value: string;
  caption?: string;
  tone?: 'neutral' | 'accent' | 'warm';
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
  tone?: 'neutral' | 'danger' | 'success';
}) {
  return (
    <View
      style={[
        styles.banner,
        tone === 'danger' ? styles.bannerDanger : null,
        tone === 'success' ? styles.bannerSuccess : null,
      ]}
    >
      <Text
        style={[
          styles.bannerText,
          tone === 'danger' ? styles.bannerTextDanger : null,
          tone === 'success' ? styles.bannerTextSuccess : null,
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
}: {
  title: string;
  description: string;
}) {
  return (
    <ScreenCard style={styles.emptyCard} tone="muted">
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
    </ScreenCard>
  );
}

export function FieldLabel({ label }: { label: string }) {
  return <Text style={styles.fieldLabel}>{label}</Text>;
}

export function AppTextInput(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.inkMuted}
      selectionColor={colors.accent}
      {...props}
      style={[styles.input, props.style]}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    padding: spacing.md,
    ...shadows.card,
  },
  cardMuted: {
    backgroundColor: colors.surface,
  },
  cardAccent: {
    backgroundColor: colors.accentSoft,
    borderColor: '#bad6c2',
  },
  cardWarm: {
    backgroundColor: colors.warmSoft,
    borderColor: '#e7bea6',
  },
  heroPanel: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  heroEyebrow: {
    color: colors.accentStrong,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroCopy: {
    gap: 8,
  },
  heroTitle: {
    color: colors.ink,
    fontFamily: 'Georgia',
    fontSize: 31,
    lineHeight: 38,
  },
  heroSubtitle: {
    color: colors.inkSoft,
    fontSize: 15,
    lineHeight: 23,
  },
  sectionHeader: {
    gap: 6,
  },
  sectionEyebrow: {
    color: colors.accentStrong,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: 'Georgia',
    fontSize: 24,
    lineHeight: 29,
  },
  sectionSubtitle: {
    color: colors.inkMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    minHeight: 54,
    justifyContent: 'center',
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
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    minHeight: 54,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonPressed: {
    transform: [{ scale: 0.985 }],
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  secondaryButtonText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  choiceChip: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  choiceChipActive: {
    backgroundColor: colors.accentDeep,
    borderColor: colors.accentDeep,
  },
  choiceChipText: {
    color: colors.inkSoft,
    fontSize: 14,
    fontWeight: '700',
  },
  choiceChipTextActive: {
    color: colors.white,
  },
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
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
  pillText: {
    color: colors.inkSoft,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  pillTextAccent: {
    color: colors.white,
  },
  pillTextWarm: {
    color: colors.white,
  },
  pillTextInk: {
    color: colors.white,
  },
  metricTile: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    flex: 1,
    gap: 6,
    minWidth: 120,
    padding: spacing.sm,
  },
  metricTileAccent: {
    backgroundColor: colors.accentSoft,
    borderColor: '#bad6c2',
  },
  metricTileWarm: {
    backgroundColor: colors.warmSoft,
    borderColor: '#e7bea6',
  },
  metricLabel: {
    color: colors.inkMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  metricLabelAccent: {
    color: colors.accentStrong,
  },
  metricValue: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '800',
  },
  metricCaption: {
    color: colors.inkMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  detailRow: {
    gap: 4,
  },
  detailLabel: {
    color: colors.inkMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  detailValue: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 22,
  },
  banner: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  bannerDanger: {
    backgroundColor: '#f8e1d8',
    borderColor: '#e9b9aa',
  },
  bannerSuccess: {
    backgroundColor: '#dceadf',
    borderColor: '#b6d0bd',
  },
  bannerText: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 20,
  },
  bannerTextDanger: {
    color: colors.danger,
  },
  bannerTextSuccess: {
    color: colors.success,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    color: colors.ink,
    fontFamily: 'Georgia',
    fontSize: 24,
    lineHeight: 29,
    textAlign: 'center',
  },
  emptyDescription: {
    color: colors.inkMuted,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  fieldLabel: {
    color: colors.inkSoft,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 15,
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
});
