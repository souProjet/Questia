import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, ScrollView, useWindowDimensions, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ExplorerAxis, RiskAxis } from '@questia/shared';
import { AnalyticsEvent } from '@questia/shared';
import { DA } from '@questia/ui';
import { trackMobileEvent } from '../lib/analytics/track';

type Step = 'welcome' | 'q1' | 'q2' | 'done';

const C = {
  bg: DA.bg,
  card: DA.card,
  border: DA.borderCyan,
  accent: DA.cyan,
  accentWarm: DA.orange,
  text: DA.text,
  muted: DA.muted,
};

export default function OnboardingPage() {
  const { width } = useWindowDimensions();
  const compact = width < 400;

  const router = useRouter();
  const [step, setStep] = useState<Step>('welcome');
  const [explorer, setExplorer] = useState<ExplorerAxis | null>(null);
  const [risk, setRisk] = useState<RiskAxis | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    trackMobileEvent(AnalyticsEvent.onboardingStarted);
  }, []);

  const goTo = (next: Step) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setStep(next);
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    });
  };

  /** Persiste tout de suite chaque axe (comme le web) pour que « Se connecter » / inscription gardent le profil. */
  const persistExplorer = async (value: ExplorerAxis) => {
    try {
      await AsyncStorage.setItem('questia_explorer', value);
    } catch {}
  };

  const persistRisk = async (value: RiskAxis) => {
    try {
      await AsyncStorage.setItem('questia_risk', value);
    } catch {}
  };

  const finish = async () => {
    if (!explorer || !risk) return;
    trackMobileEvent(AnalyticsEvent.onboardingCompleted);
    try {
      await AsyncStorage.setItem('questia_explorer', explorer);
      await AsyncStorage.setItem('questia_risk', risk);
    } catch {}
    router.replace('/(auth)?flow=signup' as never);
  };

  const PROFILES: Record<string, { icon: string; label: string; desc: string }> = {
    explorer_risktaker: { icon: '⚡', label: "L'Aventurier", desc: 'Quêtes nerveuses, souvent dehors.' },
    explorer_cautious: { icon: '🧭', label: "L'Explorateur cool", desc: 'Belles sorties, zéro chaos.' },
    homebody_risktaker: { icon: '🎭', label: 'Le Fou du salon', desc: 'Surprise… mais chez toi.' },
    homebody_cautious: { icon: '🌱', label: 'Le Zen', desc: 'Doucement, sûrement.' },
  };

  const profileKey = explorer && risk ? `${explorer}_${risk}` : null;
  const profile = profileKey ? PROFILES[profileKey] : null;

  const scrollPad = {
    flexGrow: 1 as const,
    justifyContent: 'center' as const,
    paddingTop: 4,
    paddingBottom: 24,
    paddingHorizontal: compact ? 18 : 24,
  };

  const goToAuth = () => {
    router.replace('/(auth)?flow=signin' as never);
  };

  const renderLoginFooter = (spaced: boolean) => (
    <Pressable
      onPress={goToAuth}
      style={spaced ? [s.loginLink, s.loginFooterSpacer] : s.loginLink}
      accessibilityRole="link"
      accessibilityLabel="Se connecter"
    >
      <Text style={s.loginText}>
        Déjà un compte ? <Text style={s.loginHighlight}>Se connecter</Text>
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={scrollPad}
        bounces
      >
        <Animated.View style={{ opacity: fadeAnim }}>

        {/* ── WELCOME ── */}
        {step === 'welcome' && (
          <>
            <View style={s.iconBox}>
              <View style={s.iconBoxInset}>
                <Image
                  source={require('../assets/icon.png')}
                  style={s.iconImage}
                  resizeMode="contain"
                  accessibilityIgnoresInvertColors
                />
              </View>
            </View>
            <Text style={[s.title, compact && s.titleCompact]}>Questia</Text>
            <Text style={[s.subtitle, compact && s.subtitleCompact]}>Une aventure quotidienne,{'\n'}rien que pour toi.</Text>
            <Text style={s.body}>2 questions fun, zéro piège — on calibre tes quêtes.</Text>
            <Pressable style={s.btn} onPress={() => goTo('q1')}>
              <Text style={s.btnText}>C&apos;est parti →</Text>
            </Pressable>
            {renderLoginFooter(false)}
          </>
        )}

        {/* ── Q1 ── */}
        {step === 'q1' && (
          <>
            <Text style={s.stepLabel}>1 / 2 — Ton rythme</Text>
            <Text style={[s.questionTitle, compact && s.questionTitleCompact]}>Dimanche libre,{'\n'}tu fais quoi ?</Text>
            <Text style={s.questionHint}>Le tap qui te parle ✨</Text>
            {[
              { id: 'homebody' as ExplorerAxis, icon: '🏠', title: 'Je reste au chaud.', desc: 'Coco, série, tranquille.' },
              { id: 'explorer' as ExplorerAxis, icon: '🌍', title: 'Je pars explorer.', desc: 'Nouveaux spots, imprévus.' },
            ].map((o) => (
              <Pressable
                key={o.id}
                style={s.optionCard}
                onPress={() => {
                  setExplorer(o.id);
                  void persistExplorer(o.id);
                  trackMobileEvent(AnalyticsEvent.onboardingStepCompleted, {
                    step_name: 'explorer_axis',
                    step_index: 0,
                  });
                  goTo('q2');
                }}
              >
                <Text style={s.optionIcon}>{o.icon}</Text>
                <View style={s.optionText}>
                  <Text style={s.optionTitle}>{o.title}</Text>
                  <Text style={s.optionDesc}>{o.desc}</Text>
                </View>
              </Pressable>
            ))}
            {renderLoginFooter(true)}
          </>
        )}

        {/* ── Q2 ── */}
        {step === 'q2' && (
          <>
            <Text style={s.stepLabel}>2 / 2 — L'imprévu</Text>
            <Text style={[s.questionTitle, compact && s.questionTitleCompact]}>Plan foiré,{'\n'}tu réagis comment ?</Text>
            <Text style={s.questionHint}>Dernier tap 🎯</Text>
            {[
              { id: 'cautious' as RiskAxis, icon: '📋', title: 'Je prépare, je planifie.', desc: 'Ça se passe comme prévu : top.' },
              { id: 'risktaker' as RiskAxis, icon: '🎲', title: "J'improvise, je fonce.", desc: 'Souvent là que ça devient mémorable.' },
            ].map((o) => (
              <Pressable
                key={o.id}
                style={s.optionCard}
                onPress={() => {
                  setRisk(o.id);
                  void persistRisk(o.id);
                  trackMobileEvent(AnalyticsEvent.onboardingStepCompleted, {
                    step_name: 'risk_axis',
                    step_index: 1,
                  });
                  goTo('done');
                }}
              >
                <Text style={s.optionIcon}>{o.icon}</Text>
                <View style={s.optionText}>
                  <Text style={s.optionTitle}>{o.title}</Text>
                  <Text style={s.optionDesc}>{o.desc}</Text>
                </View>
              </Pressable>
            ))}
            <Pressable onPress={() => goTo('q1')} style={s.backBtn}>
              <Text style={s.backText}>← Retour</Text>
            </Pressable>
            {renderLoginFooter(true)}
          </>
        )}

        {/* ── DONE ── */}
        {step === 'done' && profile && (
          <>
            <Text style={s.doneBadge}>C&apos;est tout ✓</Text>
            <Text style={s.doneTitle}>Ton profil en un clin d&apos;œil</Text>
            <Text style={s.doneExplain}>Crée un compte pour le garder.</Text>
            <Text style={s.profileIcon}>{profile.icon}</Text>
            <Text style={s.profileLabel}>Ta vibe</Text>
            <Text style={s.profileName}>{profile.label}</Text>
            <Text style={s.profileDesc}>{profile.desc}</Text>
            <Text style={s.recapHeading}>Ton duo</Text>
            <View style={s.recapCard} accessibilityLabel="Résumé de tes réponses, non interactif">
              <Text style={s.recapItem}>
                {explorer === 'explorer' ? '🌍  Tu aimes explorer' : '🏠  Tu aimes ta routine'}
              </Text>
              <View style={s.recapDivider} />
              <Text style={s.recapItem}>
                {risk === 'risktaker' ? '🎲  Tu fonces dans l\'inconnu' : '📋  Tu préfères planifier'}
              </Text>
            </View>
            <Pressable style={s.btn} onPress={finish} accessibilityLabel="Créer mon compte pour sauvegarder mon profil">
              <Text style={s.btnText}>Créer mon compte →</Text>
            </Pressable>
            <Pressable onPress={() => goTo('q2')} style={s.backBtn}>
              <Text style={s.backText}>← Modifier mes réponses</Text>
            </Pressable>
            {renderLoginFooter(true)}
          </>
        )}

        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  iconBox: {
    width: 100,
    height: 100,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
    alignSelf: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 5,
  },
  iconBoxInset: {
    ...StyleSheet.absoluteFillObject,
    top: 14,
    left: 8,
    right: 8,
    bottom: 14,
  },
  iconImage: { width: '100%', height: '100%' },

  title: { fontSize: 32, fontWeight: '900', color: C.text, textAlign: 'center', letterSpacing: 1, marginBottom: 10 },
  titleCompact: { fontSize: 26, marginBottom: 8 },
  subtitle: { fontSize: 20, fontWeight: '700', color: C.text, textAlign: 'center', lineHeight: 28, marginBottom: 16 },
  subtitleCompact: { fontSize: 17, lineHeight: 24, marginBottom: 12 },
  body: { fontSize: 15, color: C.muted, textAlign: 'center', lineHeight: 24, marginBottom: 36 },

  stepLabel: { fontSize: 11, fontWeight: '700', color: C.accent, letterSpacing: 2, textTransform: 'uppercase', textAlign: 'center', marginBottom: 16 },
  questionTitle: { fontSize: 26, fontWeight: '900', color: C.text, textAlign: 'center', lineHeight: 34, marginBottom: 12 },
  questionTitleCompact: { fontSize: 22, lineHeight: 30, marginBottom: 10 },
  questionHint: { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 21, marginBottom: 22, paddingHorizontal: 4 },

  optionCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: C.border, marginBottom: 12 },
  optionIcon: { fontSize: 30, flexShrink: 0 },
  optionText: { flex: 1 },
  optionTitle: { fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 4 },
  optionDesc: { fontSize: 13, color: C.muted },

  doneBadge: { fontSize: 12, fontWeight: '800', color: C.accent, letterSpacing: 1.5, textTransform: 'uppercase', textAlign: 'center', marginBottom: 10 },
  doneTitle: { fontSize: 24, fontWeight: '900', color: C.text, textAlign: 'center', lineHeight: 30, marginBottom: 12 },
  doneExplain: { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 22, marginBottom: 20, paddingHorizontal: 4 },
  profileIcon: { fontSize: 64, textAlign: 'center', marginBottom: 12 },
  profileLabel: { fontSize: 11, fontWeight: '700', color: C.accentWarm, letterSpacing: 2, textTransform: 'uppercase', textAlign: 'center', marginBottom: 8 },
  recapHeading: { fontSize: 12, fontWeight: '700', color: C.muted, textAlign: 'left', alignSelf: 'stretch', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 },
  profileName: { fontSize: 28, fontWeight: '900', color: C.text, textAlign: 'center', marginBottom: 10 },
  profileDesc: { fontSize: 15, color: C.muted, textAlign: 'center', lineHeight: 24, marginBottom: 24 },
  recapCard: {
    backgroundColor: 'rgba(224,242,254,0.28)',
    borderRadius: 16,
    padding: 18,
    width: '100%',
    borderWidth: 2,
    borderColor: 'rgba(14,116,144,0.35)',
    marginBottom: 20,
  },
  recapItem: { fontSize: 14, color: C.text, fontWeight: '600', paddingVertical: 8 },
  recapDivider: { height: 1, backgroundColor: C.border },

  btn: { backgroundColor: C.accentWarm, paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginBottom: 12, shadowColor: C.accentWarm, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  backBtn: { alignItems: 'center', paddingVertical: 10 },
  backText: { color: C.muted, fontSize: 14 },

  loginLink: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  /** Comme le web (mt-10) : lien connexion sous les questions / récap */
  loginFooterSpacer: { marginTop: 28 },
  loginText: { color: C.muted, fontSize: 14, fontWeight: '500' },
  loginHighlight: { color: C.accent, fontWeight: '700' },
});
