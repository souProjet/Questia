import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { DA } from '@questia/ui';

// Clerk v3 — require to bypass signal-based types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { useSignIn, useSignUp, useSSO } = require('@clerk/expo') as any;

// Required for OAuth redirect handling in Expo Go / standalone builds
WebBrowser.maybeCompleteAuthSession();

type AuthMode = 'sign-in' | 'sign-up';

export default function AuthScreen() {
  const router = useRouter();

  const { signIn, isLoaded: signInLoaded, setActive } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const { startSSOFlow } = useSSO();

  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [error, setError] = useState('');

  // ─── Google OAuth ────────────────────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    setLoadingGoogle(true);
    setError('');
    try {
      const redirectUrl = Linking.createURL('/app');
      const { createdSessionId, setActive: setActiveSSO } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl,
      });
      if (createdSessionId) {
        await (setActiveSSO ?? setActive)({ session: createdSessionId });
        router.replace('/app');
      }
    } catch (e: unknown) {
      const err = e as { errors?: { message: string }[] };
      setError(err.errors?.[0]?.message ?? 'Erreur Google');
    } finally {
      setLoadingGoogle(false);
    }
  };

  // ─── Email / Password ────────────────────────────────────────────────────────
  const handleSignIn = async () => {
    if (!signInLoaded) return;
    setLoading(true);
    setError('');
    try {
      const result = await signIn.create({ identifier: email, password });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/app');
      }
    } catch (e: unknown) {
      const err = e as { errors?: { message: string }[] };
      setError(err.errors?.[0]?.message ?? 'Email ou mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!signUpLoaded) return;
    setLoading(true);
    setError('');
    try {
      await signUp.create({ emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (e: unknown) {
      const err = e as { errors?: { message: string }[] };
      setError(err.errors?.[0]?.message ?? "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!signUpLoaded) return;
    setLoading(true);
    setError('');
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/app');
      }
    } catch (e: unknown) {
      const err = e as { errors?: { message: string }[] };
      setError(err.errors?.[0]?.message ?? 'Code invalide');
    } finally {
      setLoading(false);
    }
  };

  // ─── Verification screen ─────────────────────────────────────────────────────
  if (pendingVerification) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.inner}>
          <Text style={styles.title}>Vérifie ton email</Text>
          <Text style={styles.subtitle}>
            Code envoyé à <Text style={styles.emailHighlight}>{email}</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Code à 6 chiffres"
            placeholderTextColor={DA.muted}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoFocus
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Pressable style={styles.primaryButton} onPress={handleVerify} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryButtonText}>Confirmer le code</Text>
            }
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ─── Main auth screen ────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoSection}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoIconText}>D</Text>
          </View>
          <Text style={styles.appTitle}>QUESTIA</Text>
          <Text style={styles.appTagline}>
            {mode === 'sign-in' ? 'Bienvenue de retour' : "Lance l'aventure"}
          </Text>
        </View>

        <View style={styles.form}>
          {/* Google Button */}
          <Pressable
            style={({ pressed }) => [styles.googleButton, pressed && styles.buttonPressed]}
            onPress={handleGoogleSignIn}
            disabled={loadingGoogle}
          >
            {loadingGoogle ? (
              <ActivityIndicator color={DA.muted} size="small" />
            ) : (
              <>
                <Text style={styles.googleIcon}>G</Text>
                <Text style={styles.googleButtonText}>Continuer avec Google</Text>
              </>
            )}
          </Pressable>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email + password */}
          <TextInput
            style={styles.input}
            placeholder="Adresse email"
            placeholderTextColor={DA.muted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Mot de passe"
            placeholderTextColor={DA.muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
            onPress={mode === 'sign-in' ? handleSignIn : handleSignUp}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryButtonText}>
                  {mode === 'sign-in' ? 'Se connecter' : 'Créer mon compte'}
                </Text>
            }
          </Pressable>

          <Pressable
            onPress={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); setError(''); }}
          >
            <Text style={styles.switchText}>
              {mode === 'sign-in' ? "Pas de compte ? S'inscrire" : 'Déjà inscrit ? Se connecter'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DA.bg,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    paddingBottom: 48,
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    width: '100%',
    gap: 12,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  logoIconText: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: DA.text,
    letterSpacing: 5,
    marginBottom: 8,
  },
  appTagline: {
    fontSize: 15,
    color: DA.muted,
  },
  form: {
    width: '100%',
    maxWidth: 400,
    gap: 12,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: DA.card,
    borderWidth: 1,
    borderColor: DA.border,
    paddingVertical: 16,
    borderRadius: 14,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: '900',
    color: DA.text,
    lineHeight: 22,
  },
  googleButtonText: {
    color: DA.text,
    fontSize: 15,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.75,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: DA.divider,
  },
  dividerText: {
    color: DA.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  input: {
    backgroundColor: DA.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DA.border,
    paddingHorizontal: 18,
    paddingVertical: 16,
    color: DA.text,
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: '#f97316',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    marginTop: 4,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  switchText: {
    color: '#22d3ee',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 8,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    textAlign: 'center',
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: DA.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: DA.muted,
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 8,
  },
  emailHighlight: {
    color: '#22d3ee',
    fontWeight: '600',
  },
});
