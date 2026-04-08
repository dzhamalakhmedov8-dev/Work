import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Pill } from '../components/ui';
import { useAppStore } from '../lib/app-store';
import { useAuthStore } from '../lib/auth-store';
import { colors, spacing } from '../theme';

export default function IndexScreen() {
  const { operations, pendingPlannerAction, readOnlyMode, ready, profile } = useAppStore();
  const { configured, ready: authReady, session } = useAuthStore();

  if (!authReady || !ready) {
    return (
      <View style={styles.container}>
        <Pill label="Nutrition Planner" tone="accent" />
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.title}>Preparing your weekly nutrition workspace...</Text>
        <Text style={styles.subtitle}>
          Loading your profile, current plan, and the controls that keep meals and shopping in sync.
        </Text>
      </View>
    );
  }

  if (
    configured &&
    session &&
    (operations.hydratingRemote || operations.resumingPendingAction || Boolean(pendingPlannerAction)) &&
    !profile
  ) {
    return (
      <View style={styles.container}>
        <Pill label="Nutrition Planner" tone="accent" />
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.title}>Finishing account sync...</Text>
        <Text style={styles.subtitle}>
          Loading your cloud profile, current plan, and shopping progress before we choose the next screen.
        </Text>
      </View>
    );
  }

  if (!profile) {
    return <Redirect href={readOnlyMode ? ('/auth' as never) : ('/onboarding' as never)} />;
  }

  return <Redirect href="/(tabs)/profile" />;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: colors.ink,
    fontFamily: 'Georgia',
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.inkMuted,
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 320,
    textAlign: 'center',
  },
});
