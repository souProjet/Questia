'use client';

import React, { useState, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import {
  QUEST_TAXONOMY, DAILY_FREE_REROLLS, MAX_REROLLS_PER_DAY,
} from '@dopamode/shared';
import type {
  QuestModel, EscalationPhase, OperationalQuadrant, QuestNarrationResponse,
} from '@dopamode/shared';
import { QuestCard } from '../components/QuestCard';
import { SafetyConsentModal } from '../components/SafetyConsentModal';
import { NarrationModal } from '../components/NarrationModal';

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
  calibration: { label: 'Étalonnage', color: '#22c55e', emoji: '🌱', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)' },
  expansion:   { label: 'Expansion',  color: '#f59e0b', emoji: '🌙', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
  rupture:     { label: 'Rupture',    color: '#ef4444', emoji: '⚡', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)' },
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
  const [currentQuest, setCurrentQuest] = useState<QuestModel>(QUEST_TAXONOMY[12]);
  const [rerollsLeft, setRerollsLeft] = useState(initialRerolls);
  const [showConsent, setShowConsent] = useState(false);
  const [showNarration, setShowNarration] = useState(false);
  const [narration, setNarration] = useState<QuestNarrationResponse | null>(null);
  const [wasFallback, setWasFallback] = useState(false);
  const [loading, setLoading] = useState(false);
  const [questAccepted, setQuestAccepted] = useState(false);

  const pc = PHASE_CONFIG[phase];

  const fetchNarration = useCallback(async () => {
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
    if (loading || questAccepted) return;
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
    if (rerollsLeft <= 0 || questAccepted || loading) return;
    const others = QUEST_TAXONOMY.filter((q) => q.id !== currentQuest.id);
    setCurrentQuest(others[Math.floor(Math.random() * others.length)]);
    setRerollsLeft((r) => r - 1);
  }, [rerollsLeft, currentQuest, questAccepted, loading]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>DOPAMODE</Text>
          <Text style={styles.dayLabel}>Jour {day}</Text>
        </View>
        <View style={[styles.phaseBadge, { backgroundColor: pc.bg, borderColor: pc.border }]}>
          <Text style={styles.phaseEmoji}>{pc.emoji}</Text>
          <Text style={[styles.phaseLabel, { color: pc.color }]}>{pc.label}</Text>
        </View>
      </View>

      {/* ── Stats ── */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>🔥</Text>
          <Text style={styles.statValue}>{streak}</Text>
          <Text style={styles.statLabel}>Série</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>🎲</Text>
          <Text style={styles.statValue}>{rerollsLeft}/{MAX_REROLLS_PER_DAY}</Text>
          <Text style={styles.statLabel}>Rerolls</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>⚡</Text>
          <Text style={styles.statValue}>{Math.round(congruenceDelta * 100)}</Text>
          <Text style={styles.statLabel}>Delta Δ</Text>
        </View>
      </View>

      {/* ── Quest card ── */}
      <Text style={styles.sectionTitle}>
        {questAccepted ? '✅  Quête en cours' : '⚔️  Quête du Jour'}
      </Text>

      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={styles.loadingTitle}>Le Maître des Quêtes rédige ta narration…</Text>
          <Text style={styles.loadingSubtitle}>Préparation de ton aventure personnalisée</Text>
        </View>
      ) : (
        <QuestCard quest={currentQuest} onAccept={handleAcceptQuest} accepted={questAccepted} />
      )}

      {/* ── Reroll ── */}
      {!questAccepted && !loading && (
        <View style={styles.rerollSection}>
          <Pressable
            style={[styles.rerollButton, rerollsLeft <= 0 && styles.rerollButtonDisabled]}
            onPress={handleReroll}
            disabled={rerollsLeft <= 0}
          >
            <Text style={[styles.rerollText, rerollsLeft <= 0 && styles.rerollTextDisabled]}>
              🎲  Relancer la quête
            </Text>
            <Text style={[styles.rerollCount, rerollsLeft <= 0 && styles.rerollTextDisabled]}>
              {rerollsLeft} restant{rerollsLeft > 1 ? 's' : ''}
            </Text>
          </Pressable>

          {rerollsLeft <= 0 && (
            <Pressable style={styles.buyButton}>
              <Text style={styles.buyText}>🌟  Obtenir plus de Rerolls</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* ── Accepted state ── */}
      {questAccepted && (
        <View style={styles.acceptedCard}>
          <Text style={styles.acceptedEmoji}>⚔️</Text>
          <Text style={styles.acceptedTitle}>Quête acceptée !</Text>
          <Text style={styles.acceptedSubtitle}>
            Tu as lancé ton aventure. Reviens demain pour une nouvelle quête.
          </Text>
        </View>
      )}

      <SafetyConsentModal
        visible={showConsent}
        quest={currentQuest}
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
    backgroundColor: '#0a0a0f',
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
    color: '#7c3aed',
    letterSpacing: 3,
    marginBottom: 4,
  },
  dayLabel: {
    fontSize: 32,
    fontWeight: '900',
    color: '#f0f0f8',
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
  phaseEmoji: {
    fontSize: 14,
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
    backgroundColor: '#111118',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e1e2e',
  },
  statEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f0f0f8',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#6b6b82',
    fontWeight: '500',
  },

  // Section title
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6b6b82',
    letterSpacing: 1.5,
    marginBottom: 14,
    textTransform: 'uppercase',
  },

  // Loading
  loadingCard: {
    backgroundColor: '#111118',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#7c3aed',
    marginBottom: 16,
    gap: 16,
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f0f0f8',
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 13,
    color: '#6b6b82',
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
    backgroundColor: '#111118',
    borderWidth: 1,
    borderColor: '#2a2a3e',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 14,
  },
  rerollButtonDisabled: {
    opacity: 0.4,
  },
  rerollText: {
    color: '#a855f7',
    fontWeight: '700',
    fontSize: 15,
  },
  rerollCount: {
    color: '#6b6b82',
    fontSize: 13,
    fontWeight: '500',
  },
  rerollTextDisabled: {
    color: '#3d3d52',
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
  acceptedEmoji: {
    fontSize: 40,
    marginBottom: 4,
  },
  acceptedTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#10b981',
  },
  acceptedSubtitle: {
    fontSize: 14,
    color: '#6b6b82',
    textAlign: 'center',
    lineHeight: 20,
  },
});
