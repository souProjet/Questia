'use client';

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import type { QuestModel } from '@questia/shared';
import { DA } from '../theme';

interface QuestDetailScreenProps {
  questId: number;
  /** Ex. EXPO_PUBLIC_API_BASE_URL — requis pour charger l’archétype depuis l’API. */
  apiBaseUrl?: string;
}

const comfortLevelConfig = {
  low: { label: 'Faible', color: '#22c55e', emoji: '🟢' },
  moderate: { label: 'Modéré', color: '#f59e0b', emoji: '🟡' },
  high: { label: 'Élevé', color: '#f97316', emoji: '🟠' },
  extreme: { label: 'Extrême', color: '#ef4444', emoji: '🔴' },
};

export function QuestDetailScreen({ questId, apiBaseUrl = '' }: QuestDetailScreenProps) {
  const [quest, setQuest] = useState<QuestModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!apiBaseUrl.trim()) {
      setLoading(false);
      setErr('config');
      return;
    }
    let cancelled = false;
    const base = apiBaseUrl.replace(/\/$/, '');
    setLoading(true);
    setErr(null);
    (async () => {
      try {
        const res = await fetch(`${base}/api/quest/archetype/${questId}`);
        if (!res.ok) throw new Error('http');
        const data = (await res.json()) as QuestModel;
        if (!cancelled) {
          setQuest(data);
        }
      } catch {
        if (!cancelled) setErr('load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [questId, apiBaseUrl]);

  if (!apiBaseUrl.trim()) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Définis l&apos;URL API (EXPO_PUBLIC_API_BASE_URL) pour ce détail.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={DA.cyan} />
      </View>
    );
  }

  if (err || !quest) {
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
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 24,
    paddingTop: 40,
  },
  questNumber: {
    fontSize: 12,
    color: DA.muted,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: DA.text,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: DA.muted,
    marginBottom: 20,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 16,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 12,
    color: DA.muted,
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 16,
    fontWeight: '600',
    color: DA.text,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 13,
    color: DA.text,
  },
  acceptButton: {
    backgroundColor: DA.cyan,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  acceptButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  errorText: {
    color: '#b91c1c',
    padding: 24,
    fontSize: 15,
  },
  loadingText: {
    color: DA.muted,
  },
});
