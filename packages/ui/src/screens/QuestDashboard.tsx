'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import {
  DAILY_FREE_REROLLS, MAX_REROLLS_PER_DAY,
} from '@questia/shared';
import type {
  QuestModel, EscalationPhase, OperationalQuadrant, QuestNarrationResponse,
} from '@questia/shared';
import { QuestCard } from '../components/QuestCard';
import { SafetyConsentModal } from '../components/SafetyConsentModal';
import { NarrationModal } from '../components/NarrationModal';
import { UiLucideIcon } from '../components/UiLucideIcon';
import { DA } from '../theme';

interface QuestDashboardProps {
  userId?: string;
  phase?: EscalationPhase;
  day?: number;
  streak?: number;
  rerollsRemaining?: number;
  quadrant?: OperationalQuadrant;
  congruenceDelta?: number;
  apiBaseUrl?: string;
}

const PHASE_CONFIG = {
  calibration: { label: 'Étalonnage', color: '#10b981', icon: 'Leaf', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
  expansion:   { label: 'Expansion',  color: '#134e4a', icon: 'Moon', bg: 'rgba(19,78,74,0.12)', border: 'rgba(19,78,74,0.3)' },
  rupture:     { label: 'Rupture',    color: '#c2410c', icon: 'Zap', bg: 'rgba(194,65,12,0.12)',  border: 'rgba(194,65,12,0.3)' },
};

export function QuestDashboard({
  phase = 'calibration',
  day = 1,
  streak = 0,
  rerollsRemaining: initialRerolls = DAILY_FREE_REROLLS,
  quadrant = { explorerAxis: 'explorer', riskAxis: 'risktaker' },
  congruenceDelta = 0,
  apiBaseUrl = '',
}: QuestDashboardProps) {
  const [taxonomy, setTaxonomy] = useState<QuestModel[]>([]);
  const [currentQuest, setCurrentQuest] = useState<QuestModel | null>(null);

  useEffect(() => {
    if (!apiBaseUrl.trim()) {
      setTaxonomy([]);
      setCurrentQuest(null);
      return;
    }
    const base = apiBaseUrl.replace(/\/$/, '');
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${base}/api/quest/archetypes`);
        if (!res.ok) throw new Error('archetypes');
        const list = (await res.json()) as QuestModel[];
        if (cancelled) return;
        setTaxonomy(list);
        if (list.length > 0) {
          setCurrentQuest(list[list.length - 1]!);
        }
      } catch {
        if (!cancelled) {
          setTaxonomy([]);
          setCurrentQuest(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl]);
  const [rerollsLeft, setRerollsLeft] = useState(initialRerolls);
  const [showConsent, setShowConsent] = useState(false);
  const [showNarration, setShowNarration] = useState(false);
  const [narration, setNarration] = useState<QuestNarrationResponse | null>(null);
  const [wasFallback, setWasFallback] = useState(false);
  const [loading, setLoading] = useState(false);
  const [questAccepted, setQuestAccepted] = useState(false);

  const pc = PHASE_CONFIG[phase];

  const fetchNarration = useCallback(async () => {
    if (!currentQuest) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/quest/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questId: currentQuest.id,
          quadrant,
          phase,
          congruenceDelta,
          currentDay: day,
        }),
      });

      if (!res.ok) throw new Error('API error');
      const data = await res.json() as { narration: QuestNarrationResponse; wasFallback: boolean };
      setNarration(data.narration);
      setWasFallback(data.wasFallback ?? false);
    } catch {
      setNarration({
        title: currentQuest.title,
        narrative: currentQuest.description,
        motivationalHook: 'Chaque quête est une chance de te redécouvrir.',
        estimatedDuration: `${currentQuest.minimumDurationMinutes} min`,
        safetyReminders: ['Fais confiance à ton instinct.'],
      });
      setWasFallback(false);
    } finally {
      setLoading(false);
      setShowNarration(true);
    }
  }, [currentQuest, apiBaseUrl, quadrant, phase, congruenceDelta, day]);

  const handleAcceptQuest = useCallback(() => {
    if (!currentQuest || loading || questAccepted) return;
    if (currentQuest.requiresOutdoor) {
      setShowConsent(true);
    } else {
      fetchNarration();
    }
  }, [currentQuest, loading, questAccepted, fetchNarration]);

  const handleConsentConfirm = useCallback(() => {
    setShowConsent(false);
    fetchNarration();
  }, [fetchNarration]);

  const handleNarrationConfirm = useCallback(() => {
    setShowNarration(false);
    setQuestAccepted(true);
  }, []);

  const handleReroll = useCallback(() => {
    if (!currentQuest || rerollsLeft <= 0 || questAccepted || loading) return;
    const others = taxonomy.filter((q) => q.id !== currentQuest.id);
    if (others.length === 0) return;
    setCurrentQuest(others[Math.floor(Math.random() * others.length)]!);
    setRerollsLeft((r) => r - 1);
  }, [rerollsLeft, currentQuest, questAccepted, loading, taxonomy]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>QUESTIA</Text>
          <Text style={styles.dayLabel}>Jour {day}</Text>
        </View>
        <View style={[styles.phaseBadge, { backgroundColor: pc.bg, borderColor: pc.border }]}>
          <UiLucideIcon name={pc.icon} size={18} color={pc.color} />
          <Text style={[styles.phaseLabel, { color: pc.color }]}>{pc.label}</Text>
        </View>
      </View>

      {/* ── Stats ── */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <UiLucideIcon name="Flame" size={22} color="#c2410c" />
          <Text style={styles.statValue}>{streak}</Text>
          <Text style={styles.statLabel}>Série</Text>
        </View>
        <View style={styles.statCard}>
          <UiLucideIcon name="Dices" size={22} color="#134e4a" />
          <Text style={styles.statValue}>{rerollsLeft}/{MAX_REROLLS_PER_DAY}</Text>
          <Text style={styles.statLabel}>Rerolls</Text>
        </View>
        <View style={styles.statCard}>
          <UiLucideIcon name="Zap" size={22} color="#f59e0b" />
          <Text style={styles.statValue}>{Math.round(congruenceDelta * 100)}</Text>
          <Text style={styles.statLabel}>Delta Δ</Text>
        </View>
      </View>

      {/* ── Quest card ── */}
      <View style={styles.sectionTitleRow}>
        {questAccepted ? (
          <UiLucideIcon name="Check" size={20} color="#10b981" />
        ) : (
          <UiLucideIcon name="Swords" size={20} color="#c2410c" />
        )}
        <Text style={styles.sectionTitle}>
          {questAccepted ? 'Quête en cours' : 'Quête du Jour'}
        </Text>
      </View>

      {!apiBaseUrl.trim() ? (
        <View style={styles.loadingCard}>
          <Text style={styles.loadingSubtitle}>Passe apiBaseUrl (ex. EXPO_PUBLIC_API_BASE_URL) pour charger la taxonomie.</Text>
        </View>
      ) : !currentQuest ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#134e4a" />
          <Text style={styles.loadingTitle}>Chargement des archétypes…</Text>
        </View>
      ) : loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#134e4a" />
          <Text style={styles.loadingTitle}>Le Maître des Quêtes rédige ta narration…</Text>
          <Text style={styles.loadingSubtitle}>Préparation de ton aventure personnalisée</Text>
        </View>
      ) : (
        <QuestCard quest={currentQuest} onAccept={handleAcceptQuest} accepted={questAccepted} />
      )}

      {/* ── Reroll ── */}
      {!questAccepted && !loading && currentQuest && (
        <View style={styles.rerollSection}>
          <Pressable
            style={[styles.rerollButton, rerollsLeft <= 0 && styles.rerollButtonDisabled]}
            onPress={handleReroll}
            disabled={rerollsLeft <= 0}
          >
            <View style={styles.rerollTextRow}>
              <UiLucideIcon name="Dices" size={16} color={rerollsLeft <= 0 ? DA.muted : '#c2410c'} />
              <Text style={[styles.rerollText, rerollsLeft <= 0 && styles.rerollTextDisabled]}>
                Relancer la quête
              </Text>
            </View>
            <Text style={[styles.rerollCount, rerollsLeft <= 0 && styles.rerollTextDisabled]}>
              {rerollsLeft} restant{rerollsLeft > 1 ? 's' : ''}
            </Text>
          </Pressable>

          {rerollsLeft <= 0 && (
            <Pressable style={styles.buyButton}>
              <View style={styles.buyTextRow}>
                <UiLucideIcon name="Sparkles" size={16} color="#c2410c" />
                <Text style={styles.buyText}>Obtenir plus de Rerolls</Text>
              </View>
            </Pressable>
          )}
        </View>
      )}

      {/* ── Accepted state ── */}
      {questAccepted && (
        <View style={styles.acceptedCard}>
          <UiLucideIcon name="Swords" size={32} color="#c2410c" />
          <Text style={styles.acceptedTitle}>Quête acceptée !</Text>
          <Text style={styles.acceptedSubtitle}>
            Tu as lancé ton aventure. Reviens demain pour une nouvelle quête.
          </Text>
        </View>
      )}

      <SafetyConsentModal
        visible={showConsent}
        quest={currentQuest!}
        onConfirm={handleConsentConfirm}
        onCancel={() => setShowConsent(false)}
      />
      <NarrationModal
        visible={showNarration}
        narration={narration}
        wasFallback={wasFallback}
        onConfirm={handleNarrationConfirm}
        onClose={() => setShowNarration(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DA.bg,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 56,
    paddingBottom: 60,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  appName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#134e4a',
    letterSpacing: 3,
    marginBottom: 4,
  },
  dayLabel: {
    fontSize: 32,
    fontWeight: '900',
    color: DA.text,
    lineHeight: 36,
  },
  phaseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  phaseLabel: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: DA.card,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: DA.borderCyan,
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: DA.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: DA.muted,
    fontWeight: '500',
  },

  // Section title
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: DA.muted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  rerollTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buyTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // Loading
  loadingCard: {
    backgroundColor: DA.card,
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: DA.borderCyan,
    marginBottom: 16,
    gap: 16,
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: DA.text,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 13,
    color: DA.muted,
    textAlign: 'center',
  },

  // Reroll
  rerollSection: {
    marginTop: 16,
    gap: 10,
  },
  rerollButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: DA.surface,
    borderWidth: 1,
    borderColor: DA.border,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 14,
  },
  rerollButtonDisabled: {
    opacity: 0.4,
  },
  rerollText: {
    color: '#134e4a',
    fontWeight: '700',
    fontSize: 15,
  },
  rerollCount: {
    color: DA.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  rerollTextDisabled: {
    color: 'rgba(19,33,45,0.35)',
  },
  buyButton: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  buyText: {
    color: '#f59e0b',
    fontWeight: '700',
    fontSize: 15,
  },

  // Accepted
  acceptedCard: {
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  acceptedTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#10b981',
  },
  acceptedSubtitle: {
    fontSize: 14,
    color: DA.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
