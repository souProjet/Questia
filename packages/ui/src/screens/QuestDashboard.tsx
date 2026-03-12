'use client';

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { QUEST_TAXONOMY, DAILY_FREE_REROLLS, MAX_REROLLS_PER_DAY } from '@dopamode/shared';
import type { QuestModel, EscalationPhase } from '@dopamode/shared';
import { QuestCard } from '../components/QuestCard';
import { SafetyConsentModal } from '../components/SafetyConsentModal';

export function QuestDashboard() {
  const [currentQuest, setCurrentQuest] = useState<QuestModel>(QUEST_TAXONOMY[12]); // Start with Quest 13 (safe)
  const [rerollsLeft, setRerollsLeft] = useState(DAILY_FREE_REROLLS);
  const [showConsent, setShowConsent] = useState(false);
  const [phase] = useState<EscalationPhase>('calibration');
  const [streak] = useState(0);
  const [day] = useState(1);

  const handleReroll = () => {
    if (rerollsLeft <= 0) return;
    const others = QUEST_TAXONOMY.filter((q) => q.id !== currentQuest.id && !q.requiresOutdoor);
    const random = others[Math.floor(Math.random() * others.length)];
    setCurrentQuest(random);
    setRerollsLeft((r) => r - 1);
  };

  const handleAcceptQuest = () => {
    if (currentQuest.requiresOutdoor) {
      setShowConsent(true);
    } else {
      console.log('Quest accepted:', currentQuest.id);
    }
  };

  const handleConsentConfirm = () => {
    setShowConsent(false);
    console.log('Quest accepted with safety consent:', currentQuest.id);
  };

  const phaseLabel: Record<EscalationPhase, string> = {
    calibration: 'Étalonnage',
    expansion: 'Expansion',
    rupture: 'Rupture',
  };

  const phaseColor: Record<EscalationPhase, string> = {
    calibration: '#22c55e',
    expansion: '#f59e0b',
    rupture: '#ef4444',
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Jour {day}</Text>
          <Text style={styles.phaseText}>
            Phase :{' '}
            <Text style={{ color: phaseColor[phase] }}>{phaseLabel[phase]}</Text>
          </Text>
        </View>
        <View style={styles.streakBadge}>
          <Text style={styles.streakText}>🔥 {streak}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Quête du Jour</Text>

      <QuestCard quest={currentQuest} onAccept={handleAcceptQuest} />

      <View style={styles.rerollSection}>
        <Pressable
          style={[styles.rerollButton, rerollsLeft <= 0 && styles.rerollButtonDisabled]}
          onPress={handleReroll}
          disabled={rerollsLeft <= 0}
        >
          <Text style={styles.rerollButtonText}>
            🎲 Reroll ({rerollsLeft}/{MAX_REROLLS_PER_DAY})
          </Text>
        </Pressable>
        {rerollsLeft <= 0 && (
          <Pressable style={styles.buyRerollButton}>
            <Text style={styles.buyRerollText}>Acheter des Rerolls</Text>
          </Pressable>
        )}
      </View>

      <SafetyConsentModal
        visible={showConsent}
        quest={currentQuest}
        onConfirm={handleConsentConfirm}
        onCancel={() => setShowConsent(false)}
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
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: '#e8e8f0',
  },
  phaseText: {
    fontSize: 14,
    color: '#9090a8',
    marginTop: 4,
  },
  streakBadge: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  streakText: {
    color: '#f59e0b',
    fontWeight: '700',
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e8e8f0',
    marginBottom: 16,
  },
  rerollSection: {
    marginTop: 20,
    alignItems: 'center',
    gap: 12,
  },
  rerollButton: {
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#7c3aed',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  rerollButtonDisabled: {
    borderColor: '#333',
    opacity: 0.5,
  },
  rerollButtonText: {
    color: '#a855f7',
    fontWeight: '600',
    fontSize: 15,
  },
  buyRerollButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  buyRerollText: {
    color: '#0a0a0f',
    fontWeight: '700',
    fontSize: 15,
  },
});
