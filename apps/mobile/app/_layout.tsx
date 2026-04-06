import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppStoreProvider } from '../lib/app-store';
import { colors } from '../theme';

export default function RootLayout() {
  return (
    <AppStoreProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.ink,
          headerShadowVisible: false,
          headerTitleStyle: {
            fontWeight: '700',
          },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="day/[dayIndex]" options={{ title: 'Day Detail' }} />
        <Stack.Screen name="meal/[mealId]" options={{ title: 'Meal Detail' }} />
        <Stack.Screen
          name="modal"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
      </Stack>
    </AppStoreProvider>
  );
}
