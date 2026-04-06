import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useAppStore } from '../lib/app-store';
import { colors } from '../theme';

export default function IndexScreen() {
  const { ready, profile } = useAppStore();

  if (!ready) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.title}>Preparing your nutrition workspace...</Text>
      </View>
    );
  }

  if (!profile) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)/week" />;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    gap: 14,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: colors.ink,
    fontFamily: 'Georgia',
    fontSize: 22,
    textAlign: 'center',
  },
});
