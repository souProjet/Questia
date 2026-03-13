'use client';

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ScrollView } from 'react-native';
import type { QuestModel } from '@dopamode/shared';

interface SafetyConsentModalProps {
  visible: boolean;
  quest: QuestModel;
  onConfirm: () => void;
  onCancel: () => void;
}

const SAFETY_RULES = [
  "Je n'entrerai pas sur des propriétés privées.",
  "Je n'agirai pas de nuit dans des zones non éclairées.",
  "Je respecterai les lois et utiliserai mon bon sens.",
  "Je ne me mettrai pas en danger physique pour cette quête.",
  "J'ai vérifié que les conditions météo sont favorables.",
];

export function SafetyConsentModal({ visible, quest, onConfirm, onCancel }: SafetyConsentModalProps) {
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const toggle = (i: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const allChecked = checked.size === SAFETY_RULES.length;

  const reset = () => setChecked(new Set());

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.warningBadge}>
              <Text style={styles.warningEmoji}>⚠️</Text>
            </View>

            <Text style={styles.title}>Charte de Sécurité</Text>
            <Text style={styles.subtitle}>
              <Text style={styles.questTitle}>« {quest.title} »</Text>
              {' '}implique un déplacement physique.{'\n'}Coche chaque engagement pour continuer.
            </Text>

            <View style={styles.rules}>
              {SAFETY_RULES.map((rule, i) => (
                <Pressable
                  key={i}
                  style={[styles.ruleRow, checked.has(i) && styles.ruleRowChecked]}
                  onPress={() => toggle(i)}
                >
                  <View style={[styles.checkbox, checked.has(i) && styles.checkboxChecked]}>
                    {checked.has(i) && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={[styles.ruleText, checked.has(i) && styles.ruleTextChecked]}>
                    {rule}
                  </Text>
                </Pressable>
              ))}
            </View>

            {!allChecked && (
              <Text style={styles.hint}>
                Coche les {SAFETY_RULES.length - checked.size} règle{SAFETY_RULES.length - checked.size > 1 ? 's' : ''} restante{SAFETY_RULES.length - checked.size > 1 ? 's' : ''} pour continuer
              </Text>
            )}

            <View style={styles.actions}>
              <Pressable style={styles.cancelButton} onPress={() => { reset(); onCancel(); }}>
                <Text style={styles.cancelText}>Annuler</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmButton, !allChecked && styles.confirmButtonDisabled]}
                onPress={() => { if (allChecked) { reset(); onConfirm(); } }}
                disabled={!allChecked}
              >
                <Text style={styles.confirmText}>J'accepte et je pars ⚔️</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0f0f18',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '88%',
    borderTopWidth: 1,
    borderColor: '#1e1e2e',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2a2a3e',
    alignSelf: 'center',
    marginBottom: 24,
  },
  warningBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  warningEmoji: {
    fontSize: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#f0f0f8',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b6b82',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  questTitle: {
    color: '#a855f7',
    fontWeight: '600',
  },
  rules: {
    gap: 8,
    marginBottom: 12,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#111118',
    borderWidth: 1,
    borderColor: '#1e1e2e',
    gap: 12,
  },
  ruleRowChecked: {
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderColor: 'rgba(16,185,129,0.3)',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#2a2a3e',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  checkmark: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 13,
  },
  ruleText: {
    flex: 1,
    fontSize: 14,
    color: '#6b6b82',
    lineHeight: 20,
  },
  ruleTextChecked: {
    color: '#b0b0c8',
  },
  hint: {
    textAlign: 'center',
    fontSize: 12,
    color: '#3d3d52',
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2a2a3e',
    alignItems: 'center',
  },
  cancelText: {
    color: '#6b6b82',
    fontWeight: '600',
    fontSize: 15,
  },
  confirmButton: {
    flex: 2,
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
  confirmButtonDisabled: {
    backgroundColor: '#1e1e2e',
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
});
