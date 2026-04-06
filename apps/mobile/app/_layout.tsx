import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppStoreProvider } from '../lib/app-store';
import { colors, radii } from '../theme';

export default function RootLayout() {
  return (
    <AppStoreProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerStyle: { backgroundColor: colors.surfaceRaised },
          headerTintColor: colors.ink,
          headerShadowVisible: false,
          headerTitleStyle: {
            fontFamily: 'Georgia',
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
            title: 'Day Plan',
            headerStyle: {
              backgroundColor: colors.surfaceRaised,
            },
          }}
        />
        <Stack.Screen
          name="meal/[mealId]"
          options={{
            title: 'Recipe',
            headerStyle: {
              backgroundColor: colors.surfaceRaised,
            },
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
    </AppStoreProvider>
  );
}
