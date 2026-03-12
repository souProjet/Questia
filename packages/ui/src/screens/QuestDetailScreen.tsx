import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { QUEST_TAXONOMY } from '@quetes/shared';

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
    backgroundColor: '#0a0a0f',
  },
  content: {
    padding: 24,
    paddingTop: 40,
  },
  questNumber: {
    fontSize: 14,
    color: '#7c3aed',
    fontWeight: '600',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#e8e8f0',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#9090a8',
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
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 12,
  },
  metaLabel: {
    fontSize: 12,
    color: '#9090a8',
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e8e8f0',
  },
  tags: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  tag: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 13,
    color: '#9090a8',
  },
  acceptButton: {
    backgroundColor: '#7c3aed',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
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
