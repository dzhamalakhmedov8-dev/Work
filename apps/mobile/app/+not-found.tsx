import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View style={styles.container}>
        <Text style={styles.title}>This route does not exist.</Text>
        <Text style={styles.description}>
          Head back to the planner home and continue from the active weekly plan.
        </Text>
        <Link href="/" style={styles.link}>
          Go to planner home
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: colors.ink,
    fontFamily: 'Georgia',
    fontSize: 28,
    textAlign: 'center',
  },
  description: {
    color: colors.inkMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  link: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '700',
  },
});
