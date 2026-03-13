'use client';

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { QuestModel } from '@dopamode/shared';

interface QuestCardProps {
  quest: QuestModel;
  onAccept: () => void;
  accepted?: boolean;
}

const COMFORT_CONFIG = {
  low:      { label: 'Confort',  color: '#10b981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.3)',  bar: 1 },
  moderate: { label: 'Modéré',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', bar: 2 },
  high:     { label: 'Élevé',   color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)', bar: 3 },
  extreme:  { label: 'Extrême', color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  bar: 4 },
};

const CATEGORY_EMOJI: Record<string, string> = {
  spatial_adventure: '🚆', public_introspection: '🍽️', sensory_deprivation: '🌌',
  exploratory_sociability: '🗺️', physical_existential: '⛰️', async_discipline: '🌅',
  dopamine_detox: '📵', active_empathy: '🤝', temporal_projection: '✉️',
  hostile_immersion: '🎭', spontaneous_altruism: '☀️', relational_vulnerability: '📞',
  unconditional_service: '🍳',
};

export function QuestCard({ quest, onAccept, accepted = false }: QuestCardProps) {
  const comfort = COMFORT_CONFIG[quest.comfortLevel];
  const categoryEmoji = CATEGORY_EMOJI[quest.category] ?? '⚔️';

  return (
    <View style={[styles.card, accepted && styles.cardAccepted]}>

      {/* Top row */}
      <View style={styles.topRow}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryEmoji}>{categoryEmoji}</Text>
          <Text style={styles.questNumber}>Quête #{quest.id}</Text>
        </View>
        <View style={[styles.comfortBadge, { backgroundColor: comfort.bg, borderColor: comfort.border }]}>
          <View style={styles.comfortBars}>
            {[1, 2, 3, 4].map((i) => (
              <View
                key={i}
                style={[styles.comfortBar, { backgroundColor: i <= comfort.bar ? comfort.color : '#2a2a3e' }]}
              />
            ))}
          </View>
          <Text style={[styles.comfortLabel, { color: comfort.color }]}>{comfort.label}</Text>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title}>{quest.title}</Text>
      <Text style={styles.description}>{quest.description}</Text>

      {/* Tags */}
      <View style={styles.tags}>
        {quest.requiresOutdoor && (
          <View style={[styles.tag, styles.tagOutdoor]}>
            <Text style={styles.tagOutdoorText}>🌿 Extérieur</Text>
          </View>
        )}
        {quest.requiresSocial && (
          <View style={[styles.tag, styles.tagSocial]}>
            <Text style={styles.tagSocialText}>👥 Social</Text>
          </View>
        )}
        <View style={styles.tag}>
          <Text style={styles.tagText}>⏱ {quest.minimumDurationMinutes} min</Text>
        </View>
      </View>

      {/* CTA */}
      {accepted ? (
        <View style={styles.acceptedBadge}>
          <Text style={styles.acceptedText}>✅  Quête acceptée</Text>
        </View>
      ) : (
        <Pressable style={styles.acceptButton} onPress={onAccept}>
          <Text style={styles.acceptText}>Accepter la quête  ⚔️</Text>
        </Pressable>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111118',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e1e2e',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  cardAccepted: {
    borderColor: 'rgba(16,185,129,0.4)',
  },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryEmoji: {
    fontSize: 24,
  },
  questNumber: {
    fontSize: 12,
    color: '#6b6b82',
    fontWeight: '600',
  },
  comfortBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  comfortBars: {
    flexDirection: 'row',
    gap: 3,
  },
  comfortBar: {
    width: 4,
    height: 14,
    borderRadius: 2,
  },
  comfortLabel: {
    fontSize: 11,
    fontWeight: '700',
  },

  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#f0f0f8',
    lineHeight: 30,
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    color: '#6b6b82',
    lineHeight: 23,
    marginBottom: 18,
    fontStyle: 'italic',
  },

  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  tag: {
    backgroundColor: '#0a0a0f',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e1e2e',
  },
  tagText: {
    fontSize: 12,
    color: '#6b6b82',
    fontWeight: '500',
  },
  tagOutdoor: {
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderColor: 'rgba(16,185,129,0.25)',
  },
  tagOutdoorText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
  },
  tagSocial: {
    backgroundColor: 'rgba(124,58,237,0.08)',
    borderColor: 'rgba(124,58,237,0.25)',
  },
  tagSocialText: {
    fontSize: 12,
    color: '#a855f7',
    fontWeight: '600',
  },

  acceptButton: {
    backgroundColor: '#7c3aed',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  acceptText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  acceptedBadge: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
  },
  acceptedText: {
    color: '#10b981',
    fontSize: 15,
    fontWeight: '700',
  },
});
