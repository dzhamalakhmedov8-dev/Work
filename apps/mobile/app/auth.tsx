import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AppTextInput,
  HeroPanel,
  InfoBanner,
  InlineFieldHint,
  PrimaryButton,
  ScreenCard,
  SectionTitle,
  SegmentedControl,
  SecondaryButton,
} from '../components/ui';
import { useAuthStore } from '../lib/auth-store';
import { colors, spacing } from '../theme';

type AuthMode = 'sign-in' | 'sign-up';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthScreen() {
  const { configured, error, operations, clearError, signIn, signUp } = useAuthStore();
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{
    text: string;
    tone: 'success' | 'warm' | 'danger';
  } | null>(null);

  const validationMessage = useMemo(() => {
    if (!email.trim()) {
      return 'Email is required.';
    }

    if (!emailPattern.test(email.trim())) {
      return 'Enter a valid email address.';
    }

    if (!password) {
      return 'Password is required.';
    }

    if (password.length < 6) {
      return 'Password must be at least 6 characters.';
    }

    if (mode === 'sign-up' && confirmPassword !== password) {
      return 'Passwords must match to create the account.';
    }

    return null;
  }, [confirmPassword, email, mode, password]);

  const submit = async () => {
    setMessage(null);
    clearError();

    if (validationMessage) {
      setMessage({
        text: validationMessage,
        tone: 'warm',
      });
      return;
    }

    try {
      if (mode === 'sign-in') {
        await signIn(email, password);
        setMessage({
          text: 'Signed in on this device.',
          tone: 'success',
        });
        return;
      }

      const result = await signUp(email, password);
      setMessage({
        text: result.needsEmailConfirmation
          ? 'Account created. Check your email to confirm the address before signing in.'
          : 'Account created and signed in.',
        tone: result.needsEmailConfirmation ? 'warm' : 'success',
      });
    } catch {
      // The auth store already captures the message.
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <HeroPanel
          eyebrow="Account"
          title="Sign in before you build and sync your nutrition week."
          subtitle="Supabase Auth keeps one planner workspace tied to one account, while the app still stores the active week locally for fast access."
          tone="accent"
        />

        {!configured ? (
          <InfoBanner
            message="Supabase Auth is not configured in this build yet. Add the public Supabase env values and reload the app."
            tone="danger"
          />
        ) : null}

        {message ? <InfoBanner message={message.text} tone={message.tone} /> : null}
        {error ? <InfoBanner message={error} tone="danger" /> : null}

        <ScreenCard>
          <SectionTitle
            eyebrow="Welcome"
            title="Email and password"
            subtitle="Use an existing account or create a new one for this planner workspace."
          />

          <SegmentedControl
            label="Mode"
            value={mode}
            onChange={(nextMode) => {
              setMode(nextMode);
              setMessage(null);
              clearError();
            }}
            options={[
              { label: 'Sign in', value: 'sign-in' as const },
              { label: 'Create account', value: 'sign-up' as const },
            ]}
          />

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <AppTextInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <AppTextInput
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
            />
            <InlineFieldHint>
              Password auth is the fastest path for this build. Social login can come later.
            </InlineFieldHint>
          </View>

          {mode === 'sign-up' ? (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Confirm password</Text>
              <AppTextInput
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repeat the password"
              />
            </View>
          ) : null}

          <PrimaryButton
            label={
              mode === 'sign-in'
                ? operations.signingIn
                  ? 'Signing in...'
                  : 'Sign in'
                : operations.signingUp
                  ? 'Creating account...'
                  : 'Create account'
            }
            onPress={submit}
            disabled={!configured || Boolean(validationMessage) || operations.signingIn || operations.signingUp}
          />

          {mode === 'sign-up' ? (
            <SecondaryButton
              label="I already have an account"
              onPress={() => {
                setMode('sign-in');
                setMessage(null);
                clearError();
              }}
            />
          ) : null}
        </ScreenCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: spacing.xxl + 36,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  label: {
    color: colors.inkSoft,
    fontSize: 13,
    fontWeight: '700',
  },
});
