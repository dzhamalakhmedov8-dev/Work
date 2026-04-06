import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';

import { colors, radii, shadows } from '../../theme';

const tabIcon =
  (name: ComponentProps<typeof Ionicons>['name']) =>
  ({ color, size, focused }: { color: string; size: number; focused: boolean }) =>
    (
      <Ionicons
        name={
          focused && name.endsWith('-outline')
            ? (name.slice(0, -8) as ComponentProps<typeof Ionicons>['name'])
            : name
        }
        color={color}
        size={size}
      />
    );

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.accentDeep,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
          marginBottom: 4,
        },
        tabBarItemStyle: {
          borderRadius: radii.md,
          marginHorizontal: 4,
          marginVertical: 4,
        },
        tabBarActiveBackgroundColor: colors.surfaceRaised,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          borderRadius: radii.lg,
          height: 74,
          marginBottom: 12,
          marginHorizontal: 12,
          paddingBottom: 6,
          paddingTop: 8,
          position: 'absolute',
          ...shadows.card,
        },
      }}
    >
      <Tabs.Screen
        name="week"
        options={{
          title: 'Week',
          tabBarIcon: tabIcon('calendar-outline'),
        }}
      />
      <Tabs.Screen
        name="shopping"
        options={{
          title: 'Shop',
          tabBarIcon: tabIcon('basket-outline'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: tabIcon('body-outline'),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: tabIcon('options-outline'),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
