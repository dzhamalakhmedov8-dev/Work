import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Pill, SecondaryButton } from '../components/ui';
import { colors } from '../theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View style={styles.container}>
        <Pill label="Route not found" tone="warm" />
        <Text style={styles.title}>That screen doesn&apos;t exist in this planner.</Text>
        <Text style={styles.description}>
          Go back to the planner home and continue from your current week, shopping list, or onboarding flow.
        </Text>
        <Link href="/" asChild>
          <SecondaryButton label="Go to planner home" onPress={() => undefined} />
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
    gap: 14,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: colors.ink,
    fontFamily: 'Georgia',
    fontSize: 28,
    lineHeight: 34,
    maxWidth: 320,
    textAlign: 'center',
  },
  description: {
    color: colors.inkMuted,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 320,
    textAlign: 'center',
  },
});
