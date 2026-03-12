import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { QuestModel } from '@quetes/shared';

interface QuestCardProps {
  quest: QuestModel;
  onAccept: () => void;
}

const comfortConfig = {
  low:      { label: 'Faible', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  moderate: { label: 'Modéré', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  high:     { label: 'Élevé', color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  extreme:  { label: 'Extrême', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};

export function QuestCard({ quest, onAccept }: QuestCardProps) {
  const comfort = comfortConfig[quest.comfortLevel];

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.questId}>Quête #{quest.id}</Text>
        <View style={[styles.comfortBadge, { backgroundColor: comfort.bg }]}>
          <Text style={[styles.comfortText, { color: comfort.color }]}>
            {comfort.label}
          </Text>
        </View>
      </View>

      <Text style={styles.title}>{quest.title}</Text>
      <Text style={styles.description}>{quest.description}</Text>

      <View style={styles.tags}>
        {quest.requiresOutdoor && (
          <View style={styles.tag}>
            <Text style={styles.tagText}>🌿 Extérieur</Text>
          </View>
        )}
        {quest.requiresSocial && (
          <View style={styles.tag}>
            <Text style={styles.tagText}>👥 Social</Text>
          </View>
        )}
        <View style={styles.tag}>
          <Text style={styles.tagText}>⏱ {quest.minimumDurationMinutes} min</Text>
        </View>
      </View>

      <Pressable style={styles.acceptButton} onPress={onAccept}>
        <Text style={styles.acceptText}>Accepter la quête ⚔️</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  questId: {
    fontSize: 12,
    color: '#7c3aed',
    fontWeight: '600',
  },
  comfortBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  comfortText: {
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#e8e8f0',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#9090a8',
    lineHeight: 24,
    marginBottom: 16,
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
  },
  tagText: {
    fontSize: 12,
    color: '#9090a8',
  },
  acceptButton: {
    backgroundColor: '#7c3aed',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  acceptText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
