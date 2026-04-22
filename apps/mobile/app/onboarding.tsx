import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, ScrollView, useWindowDimensions, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ExplorerAxis, RiskAxis, SociabilityLevel } from '@questia/shared';
import { AnalyticsEvent } from '@questia/shared';
import { DA, UiLucideIcon } from '@questia/ui';
import { trackMobileEvent } from '../lib/analytics/track';

type Step = 'welcome' | 'q1' | 'q2' | 'q3' | 'done';

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
  const [sociability, setSociability] = useState<SociabilityLevel | null>(null);
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

  const persistSociability = async (value: SociabilityLevel) => {
    try {
      await AsyncStorage.setItem('questia_sociability', value);
    } catch {}
  };

  const finish = async () => {
    if (!explorer || !risk) return;
    trackMobileEvent(AnalyticsEvent.onboardingCompleted);
    try {
      await AsyncStorage.setItem('questia_explorer', explorer);
      await AsyncStorage.setItem('questia_risk', risk);
      if (sociability) await AsyncStorage.setItem('questia_sociability', sociability);
    } catch {}
    router.replace('/(auth)?flow=signup' as never);
  };

  const PROFILES: Record<string, { icon: string; label: string; desc: string }> = {
    explorer_risktaker: { icon: 'Zap', label: "L'Aventurier", desc: 'Quêtes nerveuses, souvent dehors.' },
    explorer_cautious: { icon: 'Compass', label: "L'Explorateur cool", desc: 'Belles sorties, zéro chaos.' },
    homebody_risktaker: { icon: 'Drama', label: 'Le Fou du salon', desc: 'Surprise… mais chez toi.' },
    homebody_cautious: { icon: 'Sprout', label: 'Le Zen', desc: 'Doucement, sûrement.' },
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
            <Text style={s.body}>3 questions fun, zéro piège — on calibre tes quêtes.</Text>
            <Pressable style={s.btn} onPress={() => goTo('q1')}>
              <Text style={s.btnText}>C&apos;est parti →</Text>
            </Pressable>
            {renderLoginFooter(false)}
          </>
        )}

        {/* ── Q1 ── */}
        {step === 'q1' && (
          <>
            <Text style={s.stepLabel}>1 / 3 — Ton rythme</Text>
            <Text style={[s.questionTitle, compact && s.questionTitleCompact]}>Dimanche libre,{'\n'}tu fais quoi ?</Text>
            <Text style={s.questionHint}>Le tap qui te parle</Text>
            {[
              { id: 'homebody' as ExplorerAxis, lucideIcon: 'Home', title: 'Je reste au chaud.', desc: 'Coco, série, tranquille.' },
              { id: 'explorer' as ExplorerAxis, lucideIcon: 'Globe', title: 'Je pars explorer.', desc: 'Nouveaux spots, imprévus.' },
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
                <View style={s.optionIconSlot}>
                  <UiLucideIcon name={o.lucideIcon} size={28} color={C.accent} strokeWidth={2} />
                </View>
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
            <Text style={s.stepLabel}>2 / 3 — L'imprévu</Text>
            <Text style={[s.questionTitle, compact && s.questionTitleCompact]}>Plan foiré,{'\n'}tu réagis comment ?</Text>
            <Text style={s.questionHint}>Dernier tap</Text>
            {[
              { id: 'cautious' as RiskAxis, lucideIcon: 'ClipboardList', title: 'Je prépare, je planifie.', desc: 'Ça se passe comme prévu : top.' },
              { id: 'risktaker' as RiskAxis, lucideIcon: 'Dices', title: "J'improvise, je fonce.", desc: 'Souvent là que ça devient mémorable.' },
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
                  goTo('q3');
                }}
              >
                <View style={s.optionIconSlot}>
                  <UiLucideIcon name={o.lucideIcon} size={28} color={C.accent} strokeWidth={2} />
                </View>
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

        {/* ── Q3 (sociabilité, optionnelle) ── */}
        {step === 'q3' && (
          <>
            <Text style={s.stepLabel}>3 / 3 — Ton énergie sociale</Text>
            <Text style={[s.questionTitle, compact && s.questionTitleCompact]}>En soirée,{'\n'}t&apos;es comment ?</Text>
            <Text style={s.questionHint}>Optionnel — passe si tu veux</Text>
            {([
              { id: 'solitary' as SociabilityLevel, lucideIcon: 'Moon', title: 'Plutôt solo.', desc: 'Mon énergie, je la garde pour moi.' },
              { id: 'balanced' as SociabilityLevel, lucideIcon: 'Users', title: 'Ça dépend.', desc: 'Un mélange des deux, selon le moment.' },
              { id: 'social' as SociabilityLevel, lucideIcon: 'MessageCircle', title: 'Très sociable.', desc: 'Parler, échanger, ça me booste.' },
            ]).map((o) => (
              <Pressable
                key={o.id}
                style={s.optionCard}
                onPress={() => {
                  setSociability(o.id);
                  void persistSociability(o.id);
                  trackMobileEvent(AnalyticsEvent.onboardingStepCompleted, {
                    step_name: 'sociability',
                    step_index: 2,
                  });
                  goTo('done');
                }}
              >
                <View style={s.optionIconSlot}>
                  <UiLucideIcon name={o.lucideIcon} size={28} color={C.accent} strokeWidth={2} />
                </View>
                <View style={s.optionText}>
                  <Text style={s.optionTitle}>{o.title}</Text>
                  <Text style={s.optionDesc}>{o.desc}</Text>
                </View>
              </Pressable>
            ))}
            <Pressable onPress={() => goTo('done')} style={s.backBtn}>
              <Text style={s.backText}>Passer →</Text>
            </Pressable>
            <Pressable onPress={() => goTo('q2')} style={s.backBtn}>
              <Text style={s.backText}>← Retour</Text>
            </Pressable>
            {renderLoginFooter(true)}
          </>
        )}

        {/* ── DONE ── */}
        {step === 'done' && profile && (
          <>
            <View style={s.doneBadgeRow}>
              <UiLucideIcon name="Check" size={16} color={C.accent} strokeWidth={2.4} />
              <Text style={s.doneBadge}>C&apos;est tout</Text>
            </View>
            <Text style={s.doneTitle}>Ton profil en un clin d&apos;œil</Text>
            <Text style={s.doneExplain}>Crée un compte pour le garder.</Text>
            <View style={s.profileIconSlot}>
              <UiLucideIcon name={profile.icon} size={56} color={C.accent} strokeWidth={1.6} />
            </View>
            <Text style={s.profileLabel}>Ta vibe</Text>
            <Text style={s.profileName}>{profile.label}</Text>
            <Text style={s.profileDesc}>{profile.desc}</Text>
            <Text style={s.recapHeading}>{sociability ? 'Ton trio' : 'Ton duo'}</Text>
            <View style={s.recapCard} accessibilityLabel="Résumé de tes réponses, non interactif">
              <View style={s.recapRow}>
                <UiLucideIcon name={explorer === 'explorer' ? 'Globe' : 'Home'} size={18} color={C.accent} strokeWidth={2.1} />
                <Text style={s.recapItemText}>
                  {explorer === 'explorer' ? 'Tu aimes explorer' : 'Tu aimes ta routine'}
                </Text>
              </View>
              <View style={s.recapDivider} />
              <View style={s.recapRow}>
                <UiLucideIcon name={risk === 'risktaker' ? 'Dices' : 'ClipboardList'} size={18} color={C.accent} strokeWidth={2.1} />
                <Text style={s.recapItemText}>
                  {risk === 'risktaker' ? 'Tu fonces dans l\'inconnu' : 'Tu préfères planifier'}
                </Text>
              </View>
              {sociability && (
                <>
                  <View style={s.recapDivider} />
                  <View style={s.recapRow}>
                    <UiLucideIcon
                      name={
                        sociability === 'solitary' ? 'Moon' : sociability === 'social' ? 'MessageCircle' : 'Users'
                      }
                      size={18}
                      color={C.accent}
                      strokeWidth={2.1}
                    />
                    <Text style={s.recapItemText}>
                      {sociability === 'solitary'
                        ? 'Tu recharges mieux en solo'
                        : sociability === 'social'
                          ? 'Tu te nourris du contact'
                          : 'Tu alternes solo et social'}
                    </Text>
                  </View>
                </>
              )}
            </View>
            <Pressable style={s.btn} onPress={finish} accessibilityLabel="Créer mon compte pour sauvegarder mon profil">
              <Text style={s.btnText}>Créer mon compte →</Text>
            </Pressable>
            <Pressable onPress={() => goTo('q3')} style={s.backBtn}>
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
  optionIconSlot: { width: 40, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  optionText: { flex: 1 },
  optionTitle: { fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 4 },
  optionDesc: { fontSize: 13, color: C.muted },

  doneBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  doneBadge: { fontSize: 12, fontWeight: '800', color: C.accent, letterSpacing: 1.5, textTransform: 'uppercase', textAlign: 'center' },
  doneTitle: { fontSize: 24, fontWeight: '900', color: C.text, textAlign: 'center', lineHeight: 30, marginBottom: 12 },
  doneExplain: { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 22, marginBottom: 20, paddingHorizontal: 4 },
  profileIconSlot: { alignItems: 'center', marginBottom: 12 },
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
  recapRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  recapItemText: { flex: 1, fontSize: 14, color: C.text, fontWeight: '600' },
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
