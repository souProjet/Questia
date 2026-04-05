import React, { useState, useEffect, useCallback } from 'react';
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
  Image,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as ClerkExpo from '@clerk/expo';
import { DA } from '@questia/ui';

const { useSignIn, useSignUp, useSSO } = ClerkExpo as any;

WebBrowser.maybeCompleteAuthSession();

type AuthMode = 'sign-in' | 'sign-up';

function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS === 'android') {
      void WebBrowser.warmUpAsync().catch(() => {});
      return () => {
        void WebBrowser.coolDownAsync().catch(() => {});
      };
    }
  }, []);
}

export default function AuthScreen() {
  useWarmUpBrowser();

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

  const handleGoogleSignIn = useCallback(async () => {
    setLoadingGoogle(true);
    setError('');
    try {
      const redirectUrl = Linking.createURL('/(auth)');
      const { createdSessionId, setActive: setActiveSSO } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl,
        redirectCompletedUrl: redirectUrl,
      });
      if (createdSessionId) {
        await (setActiveSSO ?? setActive)({ session: createdSessionId });
      }
    } catch (e: unknown) {
      const err = e as { errors?: { message: string }[] };
      setError(err.errors?.[0]?.message ?? 'Erreur Google');
    } finally {
      setLoadingGoogle(false);
    }
  }, [startSSOFlow, setActive]);

  const handleSignIn = useCallback(async () => {
    if (!signInLoaded) return;
    setLoading(true);
    setError('');
    try {
      const result = await signIn.create({ identifier: email, password });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
      }
    } catch (e: unknown) {
      const err = e as { errors?: { message: string }[] };
      setError(err.errors?.[0]?.message ?? 'Email ou mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  }, [signInLoaded, signIn, email, password, setActive]);

  const handleSignUp = useCallback(async () => {
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
  }, [signUpLoaded, signUp, email, password]);

  const handleVerify = useCallback(async () => {
    if (!signUpLoaded) return;
    setLoading(true);
    setError('');
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
      }
    } catch (e: unknown) {
      const err = e as { errors?: { message: string }[] };
      setError(err.errors?.[0]?.message ?? 'Code invalide');
    } finally {
      setLoading(false);
    }
  }, [signUpLoaded, signUp, code, setActive]);

  if (pendingVerification) {
    return (
      <KeyboardAvoidingView
        style={s.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={s.verifyInner}>
          <View style={s.verifyIconBox}>
            <Text style={s.verifyIconText}>📧</Text>
          </View>
          <Text style={s.verifyTitle}>Vérifie ton email</Text>
          <Text style={s.verifySubtitle}>
            Code envoyé à <Text style={s.emailHighlight}>{email}</Text>
          </Text>
          <TextInput
            style={s.input}
            placeholder="Code à 6 chiffres"
            placeholderTextColor="#94a3b8"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoFocus
          />
          {error ? <Text style={s.errorText}>{error}</Text> : null}
          <Pressable
            style={({ pressed }) => [s.primaryButton, pressed && s.buttonPressed]}
            onPress={handleVerify}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.primaryButtonText}>Confirmer le code</Text>
            }
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={s.logoSection}>
          <View style={s.logoIcon}>
            <Image
              source={require('../../assets/icon.png')}
              style={s.logoIconImage}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          </View>
          <Text style={s.appTitle}>QUESTIA</Text>
          <View style={s.badgeRow}>
            <Text style={s.badgeText}>
              {mode === 'sign-in' ? '🧭 Reprendre ta progression' : '🚀 Débloquer ta première quête'}
            </Text>
          </View>
          <Text style={s.appTagline}>
            {mode === 'sign-in'
              ? 'Connecte-toi pour retrouver ta quête du jour.'
              : 'Inscris-toi — ta première quête t\'attend.'}
          </Text>
        </View>

        {/* Form card */}
        <View style={s.formCard}>
          <Pressable
            style={({ pressed }) => [s.googleButton, pressed && s.buttonPressed]}
            onPress={handleGoogleSignIn}
            disabled={loadingGoogle}
          >
            {loadingGoogle ? (
              <ActivityIndicator color="#64748b" size="small" />
            ) : (
              <>
                <Text style={s.googleIcon}>G</Text>
                <Text style={s.googleButtonText}>Continuer avec Google</Text>
              </>
            )}
          </Pressable>

          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>OU</Text>
            <View style={s.dividerLine} />
          </View>

          <TextInput
            style={s.input}
            placeholder="Adresse email"
            placeholderTextColor="#94a3b8"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={s.input}
            placeholder="Mot de passe"
            placeholderTextColor="#94a3b8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {error ? <Text style={s.errorText}>{error}</Text> : null}

          <Pressable
            style={({ pressed }) => [s.primaryButton, pressed && s.buttonPressed]}
            onPress={mode === 'sign-in' ? handleSignIn : handleSignUp}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.primaryButtonText}>
                  {mode === 'sign-in' ? 'Se connecter' : 'Créer mon compte'}
                </Text>
            }
          </Pressable>
        </View>

        <Pressable
          onPress={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); setError(''); }}
          style={s.switchBtn}
        >
          <Text style={s.switchText}>
            {mode === 'sign-in' ? 'Pas de compte ? ' : 'Déjà inscrit ? '}
            <Text style={s.switchHighlight}>
              {mode === 'sign-in' ? "S'inscrire" : 'Se connecter'}
            </Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
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

  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoIcon: {
    width: 76,
    height: 76,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    padding: 8,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 6,
  },
  logoIconImage: { width: '100%', height: '100%' },
  appTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: DA.text,
    letterSpacing: 3,
    marginBottom: 12,
  },
  badgeRow: {
    backgroundColor: 'rgba(34,211,238,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(14,116,144,0.2)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0e7490',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  appTagline: {
    fontSize: 14,
    color: DA.muted,
    textAlign: 'center',
    lineHeight: 20,
  },

  formCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(19,33,45,0.08)',
    padding: 20,
    gap: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },

  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 16,
    borderRadius: 16,
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
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 18,
    paddingVertical: 16,
    color: DA.text,
    fontSize: 16,
    fontWeight: '500',
  },

  primaryButton: {
    overflow: 'hidden',
    backgroundColor: '#f97316',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
    marginTop: 4,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  switchBtn: {
    paddingVertical: 16,
    marginTop: 8,
  },
  switchText: {
    color: DA.muted,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
  switchHighlight: {
    color: '#0e7490',
    fontWeight: '800',
  },

  errorText: {
    color: '#dc2626',
    fontSize: 13,
    textAlign: 'center',
    backgroundColor: 'rgba(239,68,68,0.06)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.15)',
    fontWeight: '600',
    overflow: 'hidden',
  },

  verifyInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    width: '100%',
    gap: 14,
  },
  verifyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(34,211,238,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(14,116,144,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  verifyIconText: {
    fontSize: 28,
  },
  verifyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: DA.text,
    textAlign: 'center',
  },
  verifySubtitle: {
    color: DA.muted,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  emailHighlight: {
    color: '#0e7490',
    fontWeight: '700',
  },
});
