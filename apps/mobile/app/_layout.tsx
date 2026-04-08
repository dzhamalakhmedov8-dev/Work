import { Redirect, Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Snackbar } from '../components/ui';
import { AppStoreProvider, useAppStore } from '../lib/app-store';
import { AuthStoreProvider, useAuthStore } from '../lib/auth-store';
import { colors, radii } from '../theme';

export default function RootLayout() {
  return (
    <AuthStoreProvider>
      <AppStoreProvider>
        <AppShell />
      </AppStoreProvider>
    </AuthStoreProvider>
  );
}

function AppShell() {
  const segments = useSegments();
  const {
    clearToast,
    operations,
    pendingPlannerAction,
    pendingPlannerActionSummary,
    readOnlyMode,
    ready,
    profile,
    toast,
  } = useAppStore();
  const { configured, ready: authReady, session } = useAuthStore();
  const inAuthFlow = String(segments[0] ?? '') === 'auth';
  const inWriteOnlyFlow =
    String(segments[0] ?? '') === 'onboarding' || String(segments[0] ?? '') === 'modal';

  if (!authReady || !ready) {
    return (
      <View style={styles.loadingShell}>
        <StatusBar style="dark" />
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.loadingTitle}>Preparing your nutrition workspace...</Text>
      </View>
    );
  }

  if (configured && !session && readOnlyMode && inWriteOnlyFlow) {
    return <Redirect href={'/auth' as never} />;
  }

  if (
    configured &&
    session &&
    inAuthFlow &&
    (operations.hydratingRemote || operations.resumingPendingAction || Boolean(pendingPlannerAction))
  ) {
    return (
      <View style={styles.loadingShell}>
        <StatusBar style="dark" />
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.loadingTitle}>
          {pendingPlannerActionSummary?.title ?? 'Finishing account sync...'}
        </Text>
        {pendingPlannerActionSummary ? (
          <Text style={styles.loadingCaption}>{pendingPlannerActionSummary.message}</Text>
        ) : null}
      </View>
    );
  }

  if (configured && session && inAuthFlow) {
    return <Redirect href={profile ? '/(tabs)/profile' : '/onboarding'} />;
  }

  return (
    <View style={styles.shell}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerStyle: { backgroundColor: colors.surfaceRaised },
          headerTintColor: colors.ink,
          headerShadowVisible: false,
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: '700',
          },
          headerLargeTitleShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="day/[dayIndex]"
          options={{
            title: 'Day plan',
            headerBackTitle: 'Week',
          }}
        />
        <Stack.Screen
          name="meal/[mealId]"
          options={{
            title: 'Recipe',
            headerBackTitle: 'Day',
          }}
        />
        <Stack.Screen
          name="modal"
          options={{
            presentation: 'modal',
            headerShown: false,
            contentStyle: {
              backgroundColor: colors.background,
              borderTopLeftRadius: radii.lg,
              borderTopRightRadius: radii.lg,
            },
          }}
        />
      </Stack>
      {toast ? (
        <Snackbar message={toast.message} tone={toast.tone} onDismiss={clearToast} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: colors.background,
    flex: 1,
  },
  loadingShell: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    padding: 24,
  },
  loadingTitle: {
    color: colors.inkSoft,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  loadingCaption: {
    color: colors.inkMuted,
    fontSize: 13,
    lineHeight: 19,
    maxWidth: 320,
    textAlign: 'center',
  },
});
