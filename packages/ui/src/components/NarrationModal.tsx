'use client';

import React, { useEffect, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet, Modal,
  ScrollView, Animated,
} from 'react-native';
import type { QuestNarrationResponse } from '@dopamode/shared';

interface NarrationModalProps {
  visible: boolean;
  narration: QuestNarrationResponse | null;
  wasFallback?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function NarrationModal({ visible, narration, wasFallback, onConfirm, onClose }: NarrationModalProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(40);
    }
  }, [visible, fadeAnim, slideAnim]);

  if (!narration) return null;

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.overlay}>
        <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

            {wasFallback && (
              <View style={styles.fallbackBadge}>
                <Text style={styles.fallbackText}>🌧️ Quête adaptée aux conditions météo</Text>
              </View>
            )}

            <Text style={styles.eyebrow}>⚔️  TA QUÊTE DU JOUR</Text>
            <Text style={styles.title}>{narration.title}</Text>

            <View style={styles.divider} />

            <Text style={styles.narrative}>{narration.narrative}</Text>

            <View style={styles.hookContainer}>
              <Text style={styles.hookQuote}>"</Text>
              <Text style={styles.hookText}>{narration.motivationalHook}</Text>
              <Text style={styles.hookQuote}>"</Text>
            </View>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Text style={styles.metaEmoji}>⏱</Text>
                <Text style={styles.metaValue}>{narration.estimatedDuration}</Text>
                <Text style={styles.metaLabel}>Durée estimée</Text>
              </View>
            </View>

            {narration.safetyReminders.length > 0 && (
              <View style={styles.safetySection}>
                <Text style={styles.safetyTitle}>⚠️  Rappels importants</Text>
                {narration.safetyReminders.map((reminder, i) => (
                  <View key={i} style={styles.safetyItem}>
                    <Text style={styles.safetyBullet}>›</Text>
                    <Text style={styles.safetyText}>{reminder}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.actions}>
              <Pressable style={styles.laterButton} onPress={onClose}>
                <Text style={styles.laterText}>Plus tard</Text>
              </Pressable>
              <Pressable style={styles.goButton} onPress={onConfirm}>
                <Text style={styles.goText}>C'est parti ! ⚔️</Text>
              </Pressable>
            </View>

          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#0f0f18',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: '#7c3aed',
    maxHeight: '90%',
  },
  content: {
    padding: 28,
    paddingBottom: 40,
  },
  fallbackBadge: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f59e0b',
    alignSelf: 'flex-start',
  },
  fallbackText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '600',
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7c3aed',
    letterSpacing: 2,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#f0f0f8',
    lineHeight: 34,
    marginBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#1e1e2e',
    marginBottom: 20,
  },
  narrative: {
    fontSize: 16,
    color: '#b0b0c8',
    lineHeight: 26,
    marginBottom: 24,
    fontStyle: 'italic',
  },
  hookContainer: {
    backgroundColor: 'rgba(124,58,237,0.08)',
    borderLeftWidth: 3,
    borderLeftColor: '#7c3aed',
    borderRadius: 4,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  hookQuote: {
    fontSize: 32,
    color: '#7c3aed',
    lineHeight: 32,
    fontWeight: '900',
  },
  hookText: {
    flex: 1,
    fontSize: 15,
    color: '#a855f7',
    fontStyle: 'italic',
    fontWeight: '500',
    lineHeight: 22,
    paddingTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  metaItem: {
    backgroundColor: '#111118',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    flex: 1,
    borderWidth: 1,
    borderColor: '#1e1e2e',
  },
  metaEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f0f0f8',
    marginBottom: 2,
  },
  metaLabel: {
    fontSize: 11,
    color: '#6b6b82',
  },
  safetySection: {
    backgroundColor: 'rgba(239,68,68,0.06)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  safetyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ef4444',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  safetyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 8,
  },
  safetyBullet: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '700',
    marginTop: 1,
  },
  safetyText: {
    flex: 1,
    fontSize: 13,
    color: '#9090a8',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  laterButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2a2a3e',
    alignItems: 'center',
  },
  laterText: {
    color: '#6b6b82',
    fontWeight: '600',
    fontSize: 15,
  },
  goButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  goText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 16,
  },
});
