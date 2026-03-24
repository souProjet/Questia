import React, { useState, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ExplorerAxis, RiskAxis } from '@questia/shared';
import { DA } from '@questia/ui';

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

  const goTo = (next: Step) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setStep(next);
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    });
  };

  const finish = async () => {
    if (!explorer || !risk) return;
    try {
      await AsyncStorage.setItem('questia_explorer', explorer);
      await AsyncStorage.setItem('questia_risk', risk);
    } catch {}
    router.replace('/(auth)' as never);
  };

  const PROFILES: Record<string, { icon: string; label: string; desc: string }> = {
    explorer_risktaker: { icon: '⚡', label: "L'Aventurier",           desc: 'Quêtes intenses, en mouvement, souvent dehors.' },
    explorer_cautious:  { icon: '🧭', label: "L'Explorateur Méthodique", desc: 'Aventures riches et bien cadrées.' },
    homebody_risktaker: { icon: '🎭', label: 'Le Risqueur Discret',    desc: 'Challenges inattendus mais toujours maîtrisés.' },
    homebody_cautious:  { icon: '🌱', label: 'Le Découvreur Doux',     desc: 'Aventures douces qui agrandissent ton monde.' },
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
              <Text style={s.iconText}>🗺️</Text>
            </View>
            <Text style={[s.title, compact && s.titleCompact]}>Questia</Text>
            <Text style={[s.subtitle, compact && s.subtitleCompact]}>Une aventure quotidienne,{'\n'}rien que pour toi.</Text>
            <Text style={s.body}>
              En 30 secondes, on apprend à te connaître pour générer des quêtes adaptées à ta ville, ta météo et ta personnalité.
            </Text>
            <Pressable style={s.btn} onPress={() => goTo('q1')}>
              <Text style={s.btnText}>Commencer →</Text>
            </Pressable>
          </>
        )}

        {/* ── Q1 ── */}
        {step === 'q1' && (
          <>
            <Text style={s.stepLabel}>Question 1 / 2</Text>
            <Text style={[s.questionTitle, compact && s.questionTitleCompact]}>Un dimanche libre,{'\n'}tu fais quoi ?</Text>
            {[
              { id: 'homebody' as ExplorerAxis, icon: '🏠', title: 'Je reste au chaud.', desc: 'Canapé, film, routine.' },
              { id: 'explorer' as ExplorerAxis, icon: '🌍', title: 'Je pars explorer.',  desc: 'Nouvelles adresses, imprévus.' },
            ].map((o) => (
              <Pressable key={o.id} style={s.optionCard} onPress={() => { setExplorer(o.id); goTo('q2'); }}>
                <Text style={s.optionIcon}>{o.icon}</Text>
                <View style={s.optionText}>
                  <Text style={s.optionTitle}>{o.title}</Text>
                  <Text style={s.optionDesc}>{o.desc}</Text>
                </View>
              </Pressable>
            ))}
          </>
        )}

        {/* ── Q2 ── */}
        {step === 'q2' && (
          <>
            <Text style={s.stepLabel}>Question 2 / 2</Text>
            <Text style={[s.questionTitle, compact && s.questionTitleCompact]}>Un plan tombe à l'eau,{'\n'}c'est comment ?</Text>
            {[
              { id: 'cautious' as RiskAxis, icon: '📋', title: 'Je prépare, je planifie.', desc: 'Quand tout se passe comme prévu, parfait.' },
              { id: 'risktaker' as RiskAxis, icon: '🎲', title: "J'improvise, je fonce.",   desc: 'Les imprévus mènent aux meilleures histoires.' },
            ].map((o) => (
              <Pressable key={o.id} style={s.optionCard} onPress={() => { setRisk(o.id); goTo('done'); }}>
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
          </>
        )}

        {/* ── DONE ── */}
        {step === 'done' && profile && (
          <>
            <Text style={s.profileIcon}>{profile.icon}</Text>
            <Text style={s.profileLabel}>Ton profil</Text>
            <Text style={s.profileName}>{profile.label}</Text>
            <Text style={s.profileDesc}>{profile.desc}</Text>
            <View style={s.recapCard}>
              <Text style={s.recapItem}>
                {explorer === 'explorer' ? '🌍  Tu aimes explorer' : '🏠  Tu aimes ta routine'}
              </Text>
              <View style={s.recapDivider} />
              <Text style={s.recapItem}>
                {risk === 'risktaker' ? '🎲  Tu fonces dans l\'inconnu' : '📋  Tu préfères planifier'}
              </Text>
            </View>
            <Pressable style={s.btn} onPress={finish}>
              <Text style={s.btnText}>Créer mon compte →</Text>
            </Pressable>
            <Pressable onPress={() => goTo('q2')} style={s.backBtn}>
              <Text style={s.backText}>← Modifier mes réponses</Text>
            </Pressable>
          </>
        )}

        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  iconBox: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(34,211,238,.1)', borderWidth: 1, borderColor: 'rgba(249,115,22,.28)', justifyContent: 'center', alignItems: 'center', marginBottom: 24, alignSelf: 'center' },
  iconText: { fontSize: 36 },

  title: { fontSize: 32, fontWeight: '900', color: C.text, textAlign: 'center', letterSpacing: 1, marginBottom: 10 },
  titleCompact: { fontSize: 26, marginBottom: 8 },
  subtitle: { fontSize: 20, fontWeight: '700', color: C.text, textAlign: 'center', lineHeight: 28, marginBottom: 16 },
  subtitleCompact: { fontSize: 17, lineHeight: 24, marginBottom: 12 },
  body: { fontSize: 15, color: C.muted, textAlign: 'center', lineHeight: 24, marginBottom: 36 },

  stepLabel: { fontSize: 11, fontWeight: '700', color: C.accent, letterSpacing: 2, textTransform: 'uppercase', textAlign: 'center', marginBottom: 16 },
  questionTitle: { fontSize: 26, fontWeight: '900', color: C.text, textAlign: 'center', lineHeight: 34, marginBottom: 28 },
  questionTitleCompact: { fontSize: 22, lineHeight: 30, marginBottom: 22 },

  optionCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: C.border, marginBottom: 12 },
  optionIcon: { fontSize: 30, flexShrink: 0 },
  optionText: { flex: 1 },
  optionTitle: { fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 4 },
  optionDesc: { fontSize: 13, color: C.muted },

  profileIcon: { fontSize: 64, textAlign: 'center', marginBottom: 12 },
  profileLabel: { fontSize: 11, fontWeight: '700', color: C.accentWarm, letterSpacing: 2, textTransform: 'uppercase', textAlign: 'center', marginBottom: 8 },
  profileName: { fontSize: 28, fontWeight: '900', color: C.text, textAlign: 'center', marginBottom: 10 },
  profileDesc: { fontSize: 15, color: C.muted, textAlign: 'center', lineHeight: 24, marginBottom: 24 },
  recapCard: { backgroundColor: C.card, borderRadius: 16, padding: 18, width: '100%', borderWidth: 1, borderColor: C.border, marginBottom: 28 },
  recapItem: { fontSize: 14, color: C.text, fontWeight: '600', paddingVertical: 8 },
  recapDivider: { height: 1, backgroundColor: C.border },

  btn: { backgroundColor: C.accentWarm, paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginBottom: 12, shadowColor: C.accentWarm, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  backBtn: { alignItems: 'center', paddingVertical: 10 },
  backText: { color: C.muted, fontSize: 14 },
});
