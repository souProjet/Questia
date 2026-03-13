import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useSignIn, useSignUp, useClerk } from '@clerk/expo';
import { useRouter } from 'expo-router';

type AuthMode = 'sign-in' | 'sign-up';

export default function AuthScreen() {
  const router = useRouter();
  // Core 3: cast to access the pre-Core-3 API at runtime (v2.19 still supports it)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { signIn, isLoaded: signInLoaded } = useSignIn() as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { signUp, isLoaded: signUpLoaded } = useSignUp() as any;
  const { setActive } = useClerk();

  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async () => {
    if (!signInLoaded) return;
    setLoading(true);
    setError('');
    try {
      const result = await signIn.create({ identifier: email, password });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/dashboard');
      }
    } catch (e: unknown) {
      const err = e as { errors?: { message: string }[] };
      setError(err.errors?.[0]?.message ?? 'Erreur de connexion');
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
        router.replace('/dashboard');
      }
    } catch (e: unknown) {
      const err = e as { errors?: { message: string }[] };
      setError(err.errors?.[0]?.message ?? 'Code invalide');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.logo}>
        <Text style={styles.logoEmoji}>⚔️</Text>
        <Text style={styles.appTitle}>DOPAMODE</Text>
        <Text style={styles.appTagline}>
          {pendingVerification
            ? 'Vérifie ton email'
            : mode === 'sign-in' ? 'Bienvenue de retour' : "Commence l'aventure"}
        </Text>
      </View>

      <View style={styles.form}>
        {pendingVerification ? (
          <>
            <Text style={styles.verifyHint}>
              Code envoyé à <Text style={styles.emailHighlight}>{email}</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Code de vérification"
              placeholderTextColor="#3d3d52"
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
          </>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="Adresse email"
              placeholderTextColor="#3d3d52"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              style={styles.input}
              placeholder="Mot de passe"
              placeholderTextColor="#3d3d52"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Pressable
              style={styles.primaryButton}
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
            <Pressable onPress={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); setError(''); }}>
              <Text style={styles.switchText}>
                {mode === 'sign-in' ? "Pas de compte ? S'inscrire" : 'Déjà inscrit ? Se connecter'}
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logo: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoEmoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  appTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#f0f0f8',
    letterSpacing: 4,
    marginBottom: 8,
  },
  appTagline: {
    fontSize: 15,
    color: '#6b6b82',
  },
  form: {
    width: '100%',
    maxWidth: 400,
    gap: 12,
  },
  input: {
    backgroundColor: '#111118',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e1e2e',
    paddingHorizontal: 18,
    paddingVertical: 16,
    color: '#f0f0f8',
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: '#7c3aed',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#7c3aed',
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
    color: '#a855f7',
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
  verifyHint: {
    color: '#6b6b82',
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 8,
  },
  emailHighlight: {
    color: '#a855f7',
    fontWeight: '600',
  },
});
