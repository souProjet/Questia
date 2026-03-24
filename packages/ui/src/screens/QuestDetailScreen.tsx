'use client';

import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { QUEST_TAXONOMY } from '@questia/shared';
import { DA } from '../theme';

interface QuestDetailScreenProps {
  questId: number;
}

const comfortLevelConfig = {
  low:      { label: 'Faible', color: '#22c55e', emoji: '🟢' },
  moderate: { label: 'Modéré', color: '#f59e0b', emoji: '🟡' },
  high:     { label: 'Élevé', color: '#f97316', emoji: '🟠' },
  extreme:  { label: 'Extrême', color: '#ef4444', emoji: '🔴' },
};

export function QuestDetailScreen({ questId }: QuestDetailScreenProps) {
  const quest = QUEST_TAXONOMY.find((q) => q.id === questId);

  if (!quest) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Quête introuvable</Text>
      </View>
    );
  }

  const comfort = comfortLevelConfig[quest.comfortLevel];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.questNumber}>Quête #{quest.id}</Text>
      <Text style={styles.title}>{quest.title}</Text>
      <Text style={styles.description}>{quest.description}</Text>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Sortie de zone</Text>
          <Text style={[styles.metaValue, { color: comfort.color }]}>
            {comfort.emoji} {comfort.label}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Durée min.</Text>
          <Text style={styles.metaValue}>{quest.minimumDurationMinutes} min</Text>
        </View>
      </View>

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
      </View>

      <Pressable style={styles.acceptButton}>
        <Text style={styles.acceptButtonText}>Accepter la quête</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DA.bg,
  },
  content: {
    padding: 24,
    paddingTop: 40,
  },
  questNumber: {
    fontSize: 14,
    color: '#22d3ee',
    fontWeight: '600',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: DA.text,
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: DA.muted,
    lineHeight: 26,
    marginBottom: 32,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  metaItem: {
    flex: 1,
    backgroundColor: DA.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DA.border,
  },
  metaLabel: {
    fontSize: 12,
    color: DA.muted,
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 16,
    fontWeight: '700',
    color: DA.text,
  },
  tags: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  tag: {
    backgroundColor: DA.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: DA.border,
  },
  tagText: {
    fontSize: 13,
    color: DA.muted,
  },
  acceptButton: {
    backgroundColor: '#f97316',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  acceptButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 40,
  },
});
