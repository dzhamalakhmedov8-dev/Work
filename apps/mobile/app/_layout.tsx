import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';

import { Snackbar } from '../components/ui';
import { AppStoreProvider, useAppStore } from '../lib/app-store';
import { colors, radii } from '../theme';

export default function RootLayout() {
  return (
    <AppStoreProvider>
      <AppShell />
    </AppStoreProvider>
  );
}

function AppShell() {
  const { clearToast, toast } = useAppStore();

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
});
