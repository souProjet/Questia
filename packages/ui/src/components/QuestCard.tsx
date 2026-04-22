'use client';

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { QuestModel } from '@questia/shared';
import { DA } from '../theme';
import { UiLucideIcon } from './UiLucideIcon';

interface QuestCardProps {
  quest: QuestModel;
  onAccept: () => void;
  accepted?: boolean;
}

const COMFORT_CONFIG = {
  low: { label: 'Confort', color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', bar: 1 },
  moderate: { label: 'Modéré', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', bar: 2 },
  high: { label: 'Élevé', color: '#c2410c', bg: 'rgba(194,65,12,0.12)', border: 'rgba(194,65,12,0.3)', bar: 3 },
  extreme: { label: 'Extrême', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', bar: 4 },
};

const CATEGORY_ICON: Record<string, string> = {
  spatial_adventure: 'Train',
  public_introspection: 'UtensilsCrossed',
  sensory_deprivation: 'Moon',
  exploratory_sociability: 'Map',
  physical_existential: 'Mountain',
  async_discipline: 'Sunrise',
  dopamine_detox: 'Smartphone',
  active_empathy: 'Handshake',
  temporal_projection: 'Mail',
  hostile_immersion: 'Drama',
  spontaneous_altruism: 'Sun',
  relational_vulnerability: 'Phone',
  unconditional_service: 'ChefHat',
};

export function QuestCard({ quest, onAccept, accepted = false }: QuestCardProps) {
  const comfort = COMFORT_CONFIG[quest.comfortLevel];
  const categoryIcon = CATEGORY_ICON[quest.category] ?? 'Swords';

  return (
    <View style={[styles.card, accepted && styles.cardAccepted]}>

      {/* Top row */}
      <View style={styles.topRow}>
        <View style={styles.categoryBadge}>
          <UiLucideIcon name={categoryIcon} size={24} color={DA.text} />
          <Text style={styles.questNumber}>Quête #{quest.id}</Text>
        </View>
        <View style={[styles.comfortBadge, { backgroundColor: comfort.bg, borderColor: comfort.border }]}>
          <View style={styles.comfortBars}>
            {[1, 2, 3, 4].map((i) => (
              <View
                key={i}
                style={[styles.comfortBar, { backgroundColor: i <= comfort.bar ? comfort.color : DA.trackMuted }]}
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
          <View style={[styles.tag, styles.tagOutdoor, styles.tagWithIcon]}>
            <UiLucideIcon name="Leaf" size={14} color="#10b981" />
            <Text style={styles.tagOutdoorText}>Extérieur</Text>
          </View>
        )}
        {quest.requiresSocial && (
          <View style={[styles.tag, styles.tagSocial, styles.tagWithIcon]}>
            <UiLucideIcon name="Users" size={14} color="#134e4a" />
            <Text style={styles.tagSocialText}>Social</Text>
          </View>
        )}
        <View style={[styles.tag, styles.tagWithIcon]}>
          <UiLucideIcon name="Clock" size={14} color={DA.muted} />
          <Text style={styles.tagText}>{quest.minimumDurationMinutes} min</Text>
        </View>
      </View>

      {/* CTA */}
      {accepted ? (
        <View style={styles.acceptedBadge}>
          <View style={styles.acceptedRow}>
            <UiLucideIcon name="Check" size={18} color="#10b981" />
            <Text style={styles.acceptedText}>Quête acceptée</Text>
          </View>
        </View>
      ) : (
        <Pressable
          style={styles.acceptButton}
          onPress={onAccept}
          accessibilityRole="button"
          accessibilityLabel="Accepter la quête"
        >
          <View style={styles.acceptRow}>
            <Text style={styles.acceptText}>Accepter la quête</Text>
            <UiLucideIcon name="Swords" size={18} color="#ffffff" />
          </View>
        </Pressable>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: DA.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.25)',
    shadowColor: '#c2410c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
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
  questNumber: {
    fontSize: 12,
    color: DA.muted,
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
    color: DA.text,
    lineHeight: 30,
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    color: DA.muted,
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
    backgroundColor: DA.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: DA.border,
  },
  tagWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tagText: {
    fontSize: 12,
    color: DA.muted,
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
    backgroundColor: 'rgba(34,211,238,0.08)',
    borderColor: 'rgba(34,211,238,0.25)',
  },
  tagSocialText: {
    fontSize: 12,
    color: '#134e4a',
    fontWeight: '600',
  },

  acceptButton: {
    backgroundColor: '#c2410c',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#c2410c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  acceptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  acceptedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  acceptedText: {
    color: '#10b981',
    fontSize: 15,
    fontWeight: '700',
  },
});
