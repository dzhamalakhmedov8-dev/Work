import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { colors, radii, spacing } from '../theme';

export function ScreenCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function PrimaryButton({
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
        styles.primaryButton,
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

export function Pill({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'accent' | 'warm';
}) {
  return (
    <View
      style={[
        styles.pill,
        tone === 'accent' ? styles.pillAccent : null,
        tone === 'warm' ? styles.pillWarm : null,
      ]}
    >
      <Text
        style={[
          styles.pillText,
          tone === 'accent' ? styles.pillTextAccent : null,
          tone === 'warm' ? styles.pillTextWarm : null,
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
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metricTile}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
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
    <ScreenCard style={styles.emptyCard}>
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
      {...props}
      style={[styles.input, props.style]}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionHeader: {
    gap: 4,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Georgia',
  },
  sectionSubtitle: {
    color: colors.inkMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    transform: [{ scale: 0.99 }],
  },
  primaryButtonText: {
    color: '#fdf9f1',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  pillAccent: {
    backgroundColor: colors.accentSoft,
  },
  pillWarm: {
    backgroundColor: colors.warmSoft,
  },
  pillText: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  pillTextAccent: {
    color: colors.accentStrong,
  },
  pillTextWarm: {
    color: colors.warm,
  },
  metricTile: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.sm,
    flex: 1,
    gap: 4,
    minWidth: 120,
    padding: spacing.sm,
  },
  metricLabel: {
    color: colors.inkMuted,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  metricValue: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '700',
  },
  banner: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.sm,
    padding: spacing.sm,
  },
  bannerDanger: {
    backgroundColor: '#f6dfd7',
  },
  bannerSuccess: {
    backgroundColor: '#dceadf',
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
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyDescription: {
    color: colors.inkMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  fieldLabel: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#fffdf8',
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
