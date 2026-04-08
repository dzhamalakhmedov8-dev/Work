import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AccountStateBanner,
  AppTextInput,
  HeroPanel,
  InfoBanner,
  InlineFieldHint,
  PrimaryButton,
  ScreenCard,
  SectionTitle,
  SecondaryButton,
  SocialButton,
} from '../components/ui';
import { useAppStore } from '../lib/app-store';
import { useAuthStore } from '../lib/auth-store';
import { colors, spacing } from '../theme';

type AuthStage = 'social' | 'sign-in' | 'sign-up' | 'check-email' | 'reconnect';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthScreen() {
  const {
    accountStatus,
    hasLegacyDeviceData,
    legacyDeviceDataSummary,
    pendingPlannerActionSummary,
    readOnlyMode,
  } = useAppStore();
  const { configured, error, operations, clearError, signIn, signUp, signInWithOAuth } =
    useAuthStore();
  const hasPendingPlannerAction = Boolean(pendingPlannerActionSummary);
  const [stage, setStage] = useState<AuthStage>(
    hasPendingPlannerAction ? 'social' : readOnlyMode ? 'reconnect' : 'social',
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{
    text: string;
    tone: 'success' | 'warm' | 'danger';
  } | null>(null);

  useEffect(() => {
    setStage(hasPendingPlannerAction ? 'social' : readOnlyMode ? 'reconnect' : 'social');
  }, [hasPendingPlannerAction, readOnlyMode]);

  const validationMessage = useMemo(() => {
    if (stage !== 'sign-in' && stage !== 'sign-up') {
      return null;
    }

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

    if (stage === 'sign-up' && confirmPassword !== password) {
      return 'Passwords must match to create the account.';
    }

    return null;
  }, [confirmPassword, email, password, stage]);

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
      if (stage === 'sign-in' || stage === 'reconnect') {
        await signIn(email, password);
        setMessage({
          text: 'Signed in on this device.',
          tone: 'success',
        });
        return;
      }

      const result = await signUp(email, password);

      if (result.needsEmailConfirmation) {
        setStage('check-email');
        setMessage({
          text: 'Account created. Check your email to confirm the address before signing in.',
          tone: 'warm',
        });
        return;
      }

      setMessage({
        text: 'Account created and signed in.',
        tone: 'success',
      });
    } catch {
      // The auth store already captures the user-safe message.
    }
  };

  const heroCopy = (() => {
    if (pendingPlannerActionSummary && stage !== 'check-email') {
      return {
        eyebrow: stage === 'reconnect' ? 'Reconnect' : 'Account',
        title: pendingPlannerActionSummary.title,
        subtitle: pendingPlannerActionSummary.message,
      };
    }

    if (stage === 'reconnect') {
      return {
        eyebrow: 'Reconnect',
        title: 'Sign in again to keep editing and syncing this workspace.',
        subtitle:
          'Your last local copy is still visible on this device, but writes and sync stay locked until you reconnect.',
      };
    }

    if (stage === 'check-email') {
      return {
        eyebrow: 'Check your email',
        title: 'Confirm the account before you sign in.',
        subtitle:
          'Email confirmation is enabled for password accounts, so the next step happens in your inbox.',
      };
    }

    return {
      eyebrow: 'Account',
      title: pendingPlannerActionSummary?.title ?? 'Sign in before you build and sync your nutrition week.',
      subtitle:
        pendingPlannerActionSummary?.message ??
        'Continue with Google, Apple, or email. Supabase Auth keeps one planner workspace tied to one account, while the app still keeps the active week locally for fast access.',
    };
  })();

  const showPasswordForm = stage === 'sign-in' || stage === 'sign-up' || stage === 'reconnect';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <HeroPanel
          eyebrow={heroCopy.eyebrow}
          title={heroCopy.title}
          subtitle={heroCopy.subtitle}
          tone={stage === 'check-email' ? 'warm' : 'accent'}
        />

        {!hasPendingPlannerAction && (stage === 'reconnect' || readOnlyMode) && (
          <AccountStateBanner
            title={accountStatus.title}
            message={accountStatus.message}
            tone={accountStatus.tone}
          />
        )}

        {!configured ? (
          <InfoBanner
            message="Supabase Auth is not configured in this build yet. Add the public Supabase env values and reload the app."
            tone="danger"
          />
        ) : null}

        {message ? <InfoBanner message={message.text} tone={message.tone} /> : null}
        {error ? <InfoBanner message={error} tone="danger" /> : null}

        {hasLegacyDeviceData && !hasPendingPlannerAction ? (
          <ScreenCard tone="warm">
            <SectionTitle
              eyebrow="Previous device data"
              title="Legacy local data was found"
              subtitle="It will not be attached to this account automatically. Import it manually from the signed-in workspace if you decide to keep it."
            />
            <Text style={styles.legacyMeta}>
              {legacyDeviceDataSummary?.profileName
                ? `Saved profile: ${legacyDeviceDataSummary.profileName}`
                : 'No named profile was found.'}
            </Text>
            <Text style={styles.legacyMeta}>
              {legacyDeviceDataSummary?.hasCurrentPlan ? 'A current plan is available.' : 'No current plan found.'}
              {' '}
              {legacyDeviceDataSummary ? `${legacyDeviceDataSummary.planHistoryCount} history item(s).` : ''}
            </Text>
          </ScreenCard>
        ) : null}

        {stage !== 'check-email' ? (
          <ScreenCard>
            <SectionTitle
              eyebrow="Fastest way"
              title={stage === 'reconnect' ? 'Reconnect with social sign-in' : 'Continue with social sign-in'}
              subtitle="Use your existing Google or Apple account and return straight to your planner."
            />

            <View style={styles.socialGroup}>
              <SocialButton
                label={
                  operations.socialProvider === 'google'
                    ? 'Opening Google...'
                    : 'Continue with Google'
                }
                provider="google"
                onPress={() => signInWithOAuth('google')}
                disabled={!configured || Boolean(operations.socialProvider)}
                accessibilityLabel="Continue with Google"
              />
              <SocialButton
                label={
                  operations.socialProvider === 'apple'
                    ? 'Opening Apple...'
                    : 'Continue with Apple'
                }
                provider="apple"
                onPress={() => signInWithOAuth('apple')}
                disabled={!configured || Boolean(operations.socialProvider)}
                accessibilityLabel="Continue with Apple"
              />
            </View>

            <InlineFieldHint>
              Google and Apple must be enabled for this Supabase project before these buttons can
              complete the sign-in.
            </InlineFieldHint>

            {stage === 'social' ? (
              <View style={styles.actionStack}>
                <SecondaryButton
                  label="Sign in with email instead"
                  onPress={() => {
                    setStage('sign-in');
                    setMessage(null);
                    clearError();
                  }}
                />
                <SecondaryButton
                  label="Create account with email"
                  onPress={() => {
                    setStage('sign-up');
                    setMessage(null);
                    clearError();
                  }}
                />
              </View>
            ) : null}
          </ScreenCard>
        ) : null}

        {showPasswordForm ? (
          <ScreenCard tone="base">
            <SectionTitle
              eyebrow={stage === 'sign-up' ? 'Create account' : 'Email access'}
              title={stage === 'sign-up' ? 'Create an account with email' : 'Sign in with email'}
              subtitle={
                stage === 'reconnect'
                  ? 'Use email and password if you prefer to reconnect without social sign-in.'
                  : 'Password access stays available as a fallback even when social sign-in exists.'
              }
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
                hasError={Boolean(validationMessage && validationMessage.toLowerCase().includes('email'))}
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
                hasError={Boolean(validationMessage && validationMessage.toLowerCase().includes('password'))}
              />
            </View>

            {stage === 'sign-up' ? (
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Confirm password</Text>
                <AppTextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Repeat the password"
                  hasError={Boolean(validationMessage && validationMessage.toLowerCase().includes('match'))}
                />
              </View>
            ) : null}

            <PrimaryButton
              label={
                stage === 'sign-up'
                  ? operations.signingUp
                    ? 'Creating account...'
                    : 'Create account'
                  : operations.signingIn
                    ? 'Signing in...'
                    : stage === 'reconnect'
                      ? 'Reconnect account'
                      : 'Sign in'
              }
              onPress={submit}
              disabled={!configured || Boolean(validationMessage) || operations.signingIn || operations.signingUp}
            />

            <View style={styles.actionStack}>
              {stage === 'sign-up' ? (
                <SecondaryButton
                  label="I already have an account"
                  onPress={() => {
                    setStage('sign-in');
                    setMessage(null);
                    clearError();
                  }}
                />
              ) : null}
              <SecondaryButton
                label="Back to social sign-in"
                onPress={() => {
                  setStage(readOnlyMode ? 'reconnect' : 'social');
                  setMessage(null);
                  clearError();
                }}
              />
            </View>
          </ScreenCard>
        ) : null}

        {stage === 'check-email' ? (
          <ScreenCard tone="accent">
            <SectionTitle
              eyebrow="Next step"
              title="Open your inbox"
              subtitle="After confirming the address, come back and sign in."
            />
            <View style={styles.actionStack}>
              <PrimaryButton
                label="Back to sign in"
                onPress={() => {
                  setStage('sign-in');
                  setMessage(null);
                  clearError();
                }}
              />
              <SecondaryButton
                label="Use social sign-in instead"
                onPress={() => {
                  setStage('social');
                  setMessage(null);
                  clearError();
                }}
              />
            </View>
          </ScreenCard>
        ) : null}
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
  socialGroup: {
    gap: spacing.sm,
  },
  actionStack: {
    gap: spacing.sm,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  label: {
    color: colors.inkSoft,
    fontSize: 13,
    fontWeight: '700',
  },
  legacyMeta: {
    color: colors.inkMuted,
    fontSize: 14,
    lineHeight: 20,
  },
});
