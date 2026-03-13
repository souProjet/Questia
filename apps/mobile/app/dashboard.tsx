import React, { useState, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, SafeAreaView,
} from 'react-native';
import { useAuth, useUser } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { QUEST_TAXONOMY, DAILY_FREE_REROLLS, MAX_REROLLS_PER_DAY } from '@dopamode/shared';
import type { QuestModel, QuestNarrationResponse } from '@dopamode/shared';

const CATEGORY_EMOJI: Record<string, string> = {
  spatial_adventure: '🚆', public_introspection: '🍽️', sensory_deprivation: '🌌',
  exploratory_sociability: '🗺️', physical_existential: '⛰️', async_discipline: '🌅',
  dopamine_detox: '📵', active_empathy: '🤝', temporal_projection: '✉️',
  hostile_immersion: '🎭', spontaneous_altruism: '☀️', relational_vulnerability: '📞',
  unconditional_service: '🍳',
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

function NarrationSheet({ narration, wasFallback, apiError, onConfirm, onClose }: {
  narration: QuestNarrationResponse;
  wasFallback: boolean;
  apiError: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <View style={sheet.overlay}>
      <Pressable style={sheet.backdrop} onPress={onClose} />
      <View style={sheet.container}>
        <View style={sheet.handle} />
        <ScrollView showsVerticalScrollIndicator={false}>
          {apiError ? (
            <View style={sheet.errorBadge}>
              <Text style={sheet.errorText}>{apiError}</Text>
            </View>
          ) : null}
          {wasFallback && (
            <View style={sheet.fallbackBadge}>
              <Text style={sheet.fallbackText}>🌧️ Quête adaptée aux conditions météo</Text>
            </View>
          )}
          <Text style={sheet.eyebrow}>⚔️  TA QUÊTE DU JOUR</Text>
          <Text style={sheet.title}>{narration.title}</Text>
          <View style={sheet.divider} />
          <Text style={sheet.narrative}>{narration.narrative}</Text>
          <View style={sheet.hookBox}>
            <Text style={sheet.hookText}>" {narration.motivationalHook} "</Text>
          </View>
          <View style={sheet.metaBox}>
            <Text style={sheet.metaEmoji}>⏱</Text>
            <Text style={sheet.metaValue}>{narration.estimatedDuration}</Text>
          </View>
          {narration.safetyReminders.length > 0 && (
            <View style={sheet.safetyBox}>
              <Text style={sheet.safetyTitle}>⚠️  Rappels importants</Text>
              {narration.safetyReminders.map((r, i) => (
                <Text key={i} style={sheet.safetyItem}>› {r}</Text>
              ))}
            </View>
          )}
          <View style={sheet.actions}>
            <Pressable style={sheet.laterBtn} onPress={onClose}>
              <Text style={sheet.laterText}>Plus tard</Text>
            </Pressable>
            <Pressable style={sheet.goBtn} onPress={onConfirm}>
              <Text style={sheet.goText}>C'est parti ! ⚔️</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  const [quest, setQuest] = useState<QuestModel>(QUEST_TAXONOMY[12]);
  const [rerolls, setRerolls] = useState(DAILY_FREE_REROLLS);
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [narration, setNarration] = useState<QuestNarrationResponse | null>(null);
  const [wasFallback, setWasFallback] = useState(false);
  const [showNarration, setShowNarration] = useState(false);

  const categoryEmoji = CATEGORY_EMOJI[quest.category] ?? '⚔️';

  const [apiError, setApiError] = useState<string | null>(null);

  const fallbackNarration: QuestNarrationResponse = {
    title: quest.title,
    narrative: quest.description,
    motivationalHook: 'Chaque quête est une chance de te redécouvrir.',
    estimatedDuration: `${quest.minimumDurationMinutes} min`,
    safetyReminders: [],
  };

  const fetchNarration = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/quest/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questId: quest.id,
          quadrant: { explorerAxis: 'explorer', riskAxis: 'risktaker' },
          phase: 'calibration',
          congruenceDelta: 0,
          currentDay: 1,
        }),
      });
      const data = await res.json().catch(() => ({})) as { narration?: QuestNarrationResponse; wasFallback?: boolean; error?: string };
      if (!res.ok) {
        setApiError(data.error ?? `Erreur ${res.status}. Sur téléphone, utilise l’IP de ton PC dans EXPO_PUBLIC_API_BASE_URL (pas localhost).`);
        setNarration(fallbackNarration);
      } else {
        setNarration(data.narration ?? fallbackNarration);
        setWasFallback(data.wasFallback ?? false);
      }
    } catch (e) {
      setApiError('Impossible de joindre l’API. Lance le serveur web (npm run dev:web) et vérifie EXPO_PUBLIC_API_BASE_URL.');
      setNarration(fallbackNarration);
    } finally {
      setLoading(false);
      setShowNarration(true);
    }
  }, [quest]);

  const handleReroll = () => {
    if (rerolls <= 0 || accepted) return;
    const others = QUEST_TAXONOMY.filter((q) => q.id !== quest.id);
    setQuest(others[Math.floor(Math.random() * others.length)]);
    setRerolls((r) => r - 1);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appName}>DOPAMODE</Text>
            <Text style={styles.greeting}>Bonjour, {user?.firstName ?? 'Aventurier'} 👋</Text>
          </View>
          <Pressable onPress={() => signOut()} style={styles.signOutBtn}>
            <Text style={styles.signOutText}>Déco.</Text>
          </Pressable>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { emoji: '🌱', value: 'Étalonnage', label: 'Phase' },
            { emoji: '📅', value: 'Jour 1', label: 'Prog.' },
            { emoji: '🎲', value: `${rerolls}/${MAX_REROLLS_PER_DAY}`, label: 'Rerolls' },
          ].map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Text style={styles.statEmoji}>{s.emoji}</Text>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Quest section */}
        <Text style={styles.sectionLabel}>
          {accepted ? '✅  Quête acceptée' : '⚔️  Quête du Jour'}
        </Text>

        {/* Quest card */}
        <View style={[styles.questCard, accepted && styles.questCardAccepted]}>
          <View style={[styles.questCardBar, accepted ? styles.questCardBarAccepted : null]} />
          <View style={styles.questCardBody}>
            <View style={styles.questTopRow}>
              <View style={styles.questIconBox}>
                <Text style={styles.questIcon}>{categoryEmoji}</Text>
              </View>
              <View style={styles.questMeta}>
                <Text style={styles.questNumber}>#{quest.id}</Text>
                <Text style={styles.questCategory}>{quest.category.replace(/_/g, ' ')}</Text>
              </View>
            </View>
            <Text style={styles.questTitle}>{quest.title}</Text>
            <Text style={styles.questDesc}>{quest.description}</Text>
            <View style={styles.questTags}>
              {quest.requiresOutdoor && <View style={styles.tagOutdoor}><Text style={styles.tagOutdoorText}>🌿 Extérieur</Text></View>}
              {quest.requiresSocial && <View style={styles.tagSocial}><Text style={styles.tagSocialText}>👥 Social</Text></View>}
              <View style={styles.tag}><Text style={styles.tagText}>⏱ {quest.minimumDurationMinutes}+ min</Text></View>
            </View>

            {accepted ? (
              <View style={styles.acceptedBanner}>
                <Text style={styles.acceptedText}>⚔️  Quête en cours ! Reviens demain.</Text>
              </View>
            ) : loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color="#8b5cf6" />
                <Text style={styles.loadingText}>Génération de ta narration…</Text>
              </View>
            ) : (
              <View style={styles.actions}>
                <Pressable style={[styles.rerollBtn, rerolls <= 0 && styles.rerollBtnDisabled]}
                  onPress={handleReroll} disabled={rerolls <= 0}>
                  <Text style={styles.rerollText}>🎲  Relancer ({rerolls})</Text>
                </Pressable>
                {API_BASE_URL.includes('localhost') && (
                  <View style={styles.localhostWarning}>
                    <Text style={styles.localhostWarningText}>
                      Sur téléphone, remplace localhost par l’IP de ton PC dans .env (EXPO_PUBLIC_API_BASE_URL)
                    </Text>
                  </View>
                )}
                <Pressable style={styles.acceptBtn} onPress={fetchNarration}>
                  <Text style={styles.acceptText}>Accepter la quête ⚔️</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>

      </ScrollView>

      {showNarration && narration && (
        <NarrationSheet
          narration={narration}
          wasFallback={wasFallback}
          apiError={apiError}
          onConfirm={() => { setShowNarration(false); setAccepted(true); }}
          onClose={() => setShowNarration(false)}
        />
      )}
    </SafeAreaView>
  );
}

const C = { bg: '#05050a', card: '#0d0d16', border: '#1a1a2a', accent: '#8b5cf6', text: '#f1f1f9', muted: '#6b7280', gold: '#f59e0b', success: '#10b981' };

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: { padding: 20, paddingTop: 16, paddingBottom: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  appName: { fontSize: 11, fontWeight: '800', color: C.accent, letterSpacing: 3, marginBottom: 4 },
  greeting: { fontSize: 26, fontWeight: '900', color: C.text },
  signOutBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: C.border },
  signOutText: { fontSize: 12, color: C.muted, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  statCard: { flex: 1, backgroundColor: C.card, borderRadius: 16, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  statEmoji: { fontSize: 18, marginBottom: 4 },
  statValue: { fontSize: 13, fontWeight: '800', color: C.text, marginBottom: 2, textAlign: 'center' },
  statLabel: { fontSize: 10, color: C.muted, fontWeight: '500' },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 2, marginBottom: 12, textTransform: 'uppercase' },
  questCard: { backgroundColor: C.card, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)', marginBottom: 16, shadowColor: C.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 6 },
  questCardAccepted: { borderColor: 'rgba(16,185,129,0.3)' },
  questCardBar: { height: 4, backgroundColor: C.accent },
  questCardBarAccepted: { backgroundColor: C.success },
  questCardBody: { padding: 20 },
  questTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  questIconBox: { width: 50, height: 50, borderRadius: 14, backgroundColor: 'rgba(139,92,246,0.1)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)', justifyContent: 'center', alignItems: 'center' },
  questIcon: { fontSize: 24 },
  questMeta: {},
  questNumber: { fontSize: 11, color: C.muted, fontWeight: '600' },
  questCategory: { fontSize: 11, color: C.accent, fontWeight: '700', textTransform: 'capitalize' },
  questTitle: { fontSize: 22, fontWeight: '900', color: C.text, marginBottom: 8, lineHeight: 28 },
  questDesc: { fontSize: 14, color: C.muted, lineHeight: 22, marginBottom: 14, fontStyle: 'italic' },
  questTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  tag: { backgroundColor: 'rgba(255,255,255,0.04)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: C.border },
  tagText: { fontSize: 12, color: C.muted },
  tagOutdoor: { backgroundColor: 'rgba(16,185,129,0.08)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)' },
  tagOutdoorText: { fontSize: 12, color: C.success, fontWeight: '600' },
  tagSocial: { backgroundColor: 'rgba(139,92,246,0.08)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)' },
  tagSocialText: { fontSize: 12, color: C.accent, fontWeight: '600' },
  actions: { gap: 10 },
  rerollBtn: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: C.border, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  rerollBtnDisabled: { opacity: 0.4 },
  rerollText: { color: C.accent, fontWeight: '700', fontSize: 14 },
  acceptBtn: { backgroundColor: C.accent, paddingVertical: 16, borderRadius: 14, alignItems: 'center', shadowColor: C.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8 },
  acceptText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  loadingBox: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: 'rgba(139,92,246,0.05)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(139,92,246,0.15)' },
  loadingText: { color: 'rgba(139,92,246,0.8)', fontSize: 13, fontWeight: '600', flex: 1 },
  localhostWarning: { backgroundColor: 'rgba(245,158,11,0.08)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)', borderRadius: 10, padding: 10, marginBottom: 8 },
  localhostWarningText: { color: '#f59e0b', fontSize: 11, fontWeight: '600', lineHeight: 16 },
  acceptedBanner: { backgroundColor: 'rgba(16,185,129,0.08)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)', borderRadius: 14, padding: 16, alignItems: 'center' },
  acceptedText: { color: C.success, fontWeight: '700', fontSize: 14 },
});

const sheet = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)' },
  container: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#0d0d16', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderColor: 'rgba(139,92,246,0.3)', maxHeight: '90%', padding: 24, paddingBottom: 40 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#2a2a3e', alignSelf: 'center', marginBottom: 24 },
  errorBadge: { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText: { color: '#f87171', fontSize: 12, fontWeight: '600', lineHeight: 18 },
  fallbackBadge: { backgroundColor: 'rgba(245,158,11,0.1)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)', borderRadius: 10, padding: 10, marginBottom: 16 },
  fallbackText: { color: '#f59e0b', fontSize: 12, fontWeight: '600' },
  eyebrow: { fontSize: 10, fontWeight: '800', color: '#8b5cf6', letterSpacing: 2, marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '900', color: '#f1f1f9', marginBottom: 16, lineHeight: 32 },
  divider: { height: 1, backgroundColor: '#1a1a2a', marginBottom: 16 },
  narrative: { fontSize: 15, color: '#9090a8', lineHeight: 24, marginBottom: 20, fontStyle: 'italic' },
  hookBox: { backgroundColor: 'rgba(139,92,246,0.06)', borderLeftWidth: 3, borderLeftColor: '#8b5cf6', borderRadius: 4, padding: 14, marginBottom: 20 },
  hookText: { color: '#a78bfa', fontSize: 14, fontStyle: 'italic', fontWeight: '500', lineHeight: 22 },
  metaBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#111118', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#1a1a2a', marginBottom: 20 },
  metaEmoji: { fontSize: 20 },
  metaValue: { fontSize: 14, fontWeight: '700', color: '#f1f1f9' },
  safetyBox: { backgroundColor: 'rgba(239,68,68,0.05)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)', borderRadius: 12, padding: 14, marginBottom: 24 },
  safetyTitle: { fontSize: 12, fontWeight: '700', color: '#ef4444', marginBottom: 8, letterSpacing: 0.5 },
  safetyItem: { fontSize: 13, color: '#9090a8', lineHeight: 20, marginBottom: 4 },
  actions: { flexDirection: 'row', gap: 10 },
  laterBtn: { flex: 1, paddingVertical: 16, borderRadius: 14, borderWidth: 1, borderColor: '#2a2a3e', alignItems: 'center' },
  laterText: { color: '#6b7280', fontWeight: '600', fontSize: 14 },
  goBtn: { flex: 2, paddingVertical: 16, borderRadius: 14, backgroundColor: '#8b5cf6', alignItems: 'center', shadowColor: '#8b5cf6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8 },
  goText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
