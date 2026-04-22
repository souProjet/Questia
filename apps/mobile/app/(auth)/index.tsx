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
import * as Linking from 'expo-linking';
import * as ClerkExpo from '@clerk/expo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { DA, UiLucideIcon } from '@questia/ui';
import { hasOnboardingAnswers } from '../../lib/onboardingGate';

const { useSignIn, useSignUp, useSSO } = ClerkExpo as any;

type AuthMode = 'sign-in' | 'sign-up';

function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let cancelled = false;
    let wb: typeof import('expo-web-browser') | null = null;
    void import('expo-web-browser').then((m) => {
      if (cancelled) return;
      wb = m;
      void m.warmUpAsync().catch(() => {});
    });
    return () => {
      cancelled = true;
      if (wb) void wb.coolDownAsync().catch(() => {});
    };
  }, []);
}

export default function AuthScreen() {
  useWarmUpBrowser();
  const router = useRouter();
  const { flow: flowParam } = useLocalSearchParams<{ flow?: string | string[] }>();

  useEffect(() => {
    void import('expo-web-browser')
      .then((m) => m.maybeCompleteAuthSession())
      .catch(() => {});
  }, []);

  const { signIn, isLoaded: signInLoaded, setActive } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const { startSSOFlow } = useSSO();

  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  /**
   * Clerk Client Trust (avril 2026) : après `signIn.create()` depuis un nouvel
   * appareil, Clerk peut renvoyer `status: 'needs_client_trust'`. Il faut alors
   * challenger un second facteur (ici : code email) avant `setActive`.
   *
   * Quand ce flag est vrai, on affiche un écran de saisie du code identique au
   * sign-up mais branché sur `signIn.attemptFirstFactor`.
   */
  const [pendingClientTrust, setPendingClientTrust] = useState(false);
  /** Email vers lequel le code client trust a été envoyé (affiché dans l'écran de saisie). */
  const [clientTrustDestination, setClientTrustDestination] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [onboardingReady, setOnboardingReady] = useState<boolean | null>(null);

  const resetAuthUi = useCallback(() => {
    setPendingVerification(false);
    setPendingClientTrust(false);
    setClientTrustDestination(null);
    setCode('');
    setError('');
  }, []);

  useEffect(() => {
    void hasOnboardingAnswers().then(setOnboardingReady);
  }, []);

  useEffect(() => {
    const f = Array.isArray(flowParam) ? flowParam[0] : flowParam;
    if (f === 'signup') setMode('sign-up');
    else if (f === 'signin') setMode('sign-in');
  }, [flowParam]);

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
      } else {
        // Avec Client Trust, Clerk peut exiger une vérification dans le navigateur
        // hébergé ; si on revient ici sans session, c'est soit un abandon, soit
        // un état en attente. On donne un retour explicite plutôt qu'un écran figé.
        setError('Connexion Google non finalisée. Réessaie ou utilise ton email.');
      }
    } catch (e: unknown) {
      const err = e as { errors?: { message: string }[] };
      setError(err.errors?.[0]?.message ?? 'Erreur Google');
    } finally {
      setLoadingGoogle(false);
    }
  }, [startSSOFlow, setActive]);

  /**
   * Envoie / renvoie le code email exigé par Clerk Client Trust.
   * Appelé après un `signIn.create()` qui renvoie `needs_client_trust`, et
   * depuis le bouton « Renvoyer le code » de l'écran de saisie.
   */
  const prepareClientTrustChallenge = useCallback(async (): Promise<boolean> => {
    if (!signInLoaded || !signIn) return false;
    const factors: Array<{
      strategy?: string;
      emailAddressId?: string;
      safeIdentifier?: string;
    }> = signIn.supportedFirstFactors ?? [];
    const emailFactor = factors.find((f) => f.strategy === 'email_code');
    if (!emailFactor?.emailAddressId) {
      setError(
        "On n'arrive pas à préparer la vérification par email. Contacte le support si le problème persiste.",
      );
      return false;
    }
    await signIn.prepareFirstFactor({
      strategy: 'email_code',
      emailAddressId: emailFactor.emailAddressId,
    });
    setClientTrustDestination(emailFactor.safeIdentifier ?? email);
    return true;
  }, [signInLoaded, signIn, email]);

  const handleSignIn = useCallback(async () => {
    if (!signInLoaded) return;
    setLoading(true);
    setError('');
    try {
      const result = await signIn.create({ identifier: email, password });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        return;
      }
      if (result.status === 'needs_client_trust') {
        const ok = await prepareClientTrustChallenge();
        if (ok) {
          setCode('');
          setPendingClientTrust(true);
        }
        return;
      }
      if (result.status === 'needs_first_factor' || result.status === 'needs_second_factor') {
        // Cas rare : MFA configuré. Même traitement que client trust.
        const ok = await prepareClientTrustChallenge();
        if (ok) {
          setCode('');
          setPendingClientTrust(true);
        }
        return;
      }
      setError(`Étape de connexion non prise en charge (${String(result.status)}).`);
    } catch (e: unknown) {
      const err = e as { errors?: { message: string }[] };
      setError(err.errors?.[0]?.message ?? 'Email ou mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  }, [signInLoaded, signIn, email, password, setActive, prepareClientTrustChallenge]);

  /** Soumet le code reçu par email pour valider un nouveau client (Client Trust). */
  const handleVerifyClientTrust = useCallback(async () => {
    if (!signInLoaded) return;
    setLoading(true);
    setError('');
    try {
      const result = await signIn.attemptFirstFactor({ strategy: 'email_code', code });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        return;
      }
      setError(`Vérification incomplète (${String(result.status)}). Réessaie ou redemande un code.`);
    } catch (e: unknown) {
      const err = e as { errors?: { message: string }[] };
      setError(err.errors?.[0]?.message ?? 'Code invalide ou expiré.');
    } finally {
      setLoading(false);
    }
  }, [signInLoaded, signIn, code, setActive]);

  const handleResendClientTrust = useCallback(async () => {
    setResending(true);
    setError('');
    try {
      await prepareClientTrustChallenge();
    } catch (e: unknown) {
      const err = e as { errors?: { message: string }[] };
      setError(err.errors?.[0]?.message ?? "Impossible d'envoyer un nouveau code.");
    } finally {
      setResending(false);
    }
  }, [prepareClientTrustChallenge]);

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
        return;
      }
      // Au cas où Clerk ajouterait un statut transitoire après vérification,
      // on informe clairement l'utilisateur plutôt que de laisser l'écran figé.
      setError(`Inscription incomplète (${String(result.status)}). Réessaie.`);
    } catch (e: unknown) {
      const err = e as { errors?: { message: string }[] };
      setError(err.errors?.[0]?.message ?? 'Code invalide');
    } finally {
      setLoading(false);
    }
  }, [signUpLoaded, signUp, code, setActive]);

  if (pendingClientTrust) {
    return (
      <KeyboardAvoidingView
        style={s.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={s.verifyInner}>
          <View style={s.verifyIconBox}>
            <UiLucideIcon name="Shield" size={30} color="#0e7490" strokeWidth={1.8} />
          </View>
          <Text style={s.verifyTitle}>Confirmer cet appareil</Text>
          <Text style={s.verifySubtitle}>
            On ne te reconnaît pas sur ce téléphone. Un code a été envoyé à{' '}
            <Text style={s.emailHighlight}>{clientTrustDestination ?? email}</Text>.
          </Text>
          <TextInput
            style={s.input}
            placeholder="Code à 6 chiffres"
            placeholderTextColor="#94a3b8"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoFocus
            accessibilityLabel="Code de vérification reçu par email"
          />
          {error ? <Text style={s.errorText}>{error}</Text> : null}
          <Pressable
            style={({ pressed }) => [s.primaryButton, pressed && s.buttonPressed]}
            onPress={handleVerifyClientTrust}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Valider le code et terminer la connexion"
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.primaryButtonText}>Confirmer le code</Text>
            }
          </Pressable>
          <Pressable
            onPress={handleResendClientTrust}
            disabled={resending}
            style={s.linkBtn}
            accessibilityRole="button"
            accessibilityLabel="Renvoyer un code"
          >
            <Text style={s.linkText}>
              {resending ? 'Envoi…' : 'Renvoyer un code'}
            </Text>
          </Pressable>
          <Pressable
            onPress={resetAuthUi}
            style={s.linkBtn}
            accessibilityRole="button"
            accessibilityLabel="Revenir à l'écran de connexion"
          >
            <Text style={s.linkTextMuted}>Revenir en arrière</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  if (pendingVerification) {
    return (
      <KeyboardAvoidingView
        style={s.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={s.verifyInner}>
          <View style={s.verifyIconBox}>
            <UiLucideIcon name="Mail" size={30} color="#0e7490" strokeWidth={1.8} />
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
            <View style={s.logoIconInset}>
              <Image
                source={require('../../assets/icon.png')}
                style={s.logoIconImage}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />
            </View>
          </View>
          <Text style={s.appTitle}>QUESTIA</Text>
          <View style={s.badgeRow}>
            <UiLucideIcon
              name={mode === 'sign-in' ? 'Compass' : 'Rocket'}
              size={14}
              color="#0e7490"
              strokeWidth={2.2}
            />
            <Text style={s.badgeText}>
              {mode === 'sign-in' ? 'Reprendre ta progression' : 'Débloquer ta première quête'}
            </Text>
          </View>
          <Text style={s.appTagline}>
            {mode === 'sign-in'
              ? 'Connecte-toi pour retrouver ta quête du jour.'
              : 'Inscris-toi — ta première quête t\'attend.'}
          </Text>
        </View>

        {mode === 'sign-up' && onboardingReady === false ? (
          <View style={s.onboardingHint}>
            <Text style={s.onboardingHintTitle}>2 petites questions ?</Text>
            <Text style={s.onboardingHintBody}>
              Sur l'accueil — pour des quêtes à ton goût. Rapide et optionnel si tu préfères zapper.
            </Text>
            <Pressable
              style={({ pressed }) => [s.onboardingHintBtn, pressed && s.buttonPressed]}
              onPress={() => router.replace('/onboarding' as never)}
              accessibilityRole="button"
              accessibilityLabel="Retour au questionnaire d'accueil"
            >
              <Text style={s.onboardingHintBtnText}>Faire les 2 questions</Text>
            </Pressable>
          </View>
        ) : null}

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
          onPress={() => {
            setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
            resetAuthUi();
          }}
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
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 6,
  },
  /** Cadre interne : évite que l’Image ignore le padding et dépasse du cadre blanc (RN). */
  logoIconInset: {
    ...StyleSheet.absoluteFillObject,
    top: 11,
    left: 7,
    right: 7,
    bottom: 11,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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

  onboardingHint: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(34,211,238,0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(14,116,144,0.25)',
    padding: 16,
    marginBottom: 20,
    gap: 10,
  },
  onboardingHintTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0e7490',
    textAlign: 'center',
  },
  onboardingHintBody: {
    fontSize: 13,
    color: DA.muted,
    textAlign: 'center',
    lineHeight: 19,
  },
  onboardingHintBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(14,116,144,0.35)',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  onboardingHintBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0e7490',
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
    backgroundColor: '#c2410c',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#c2410c',
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

  linkBtn: {
    paddingVertical: 10,
    alignSelf: 'center',
  },
  linkText: {
    color: '#0e7490',
    fontSize: 14,
    fontWeight: '700',
  },
  linkTextMuted: {
    color: DA.muted,
    fontSize: 13,
    fontWeight: '600',
  },
});
