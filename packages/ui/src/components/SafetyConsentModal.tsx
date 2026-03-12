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
  'Je m\'engage à ne pas pénétrer sur des propriétés privées.',
  'Je n\'agirai pas de nuit dans des zones non éclairées.',
  'J\'utiliserai mon bon sens et je respecterai les lois.',
  'Je ne me mettrai pas en danger physique pour accomplir cette quête.',
  'J\'ai vérifié que les conditions météorologiques sont favorables.',
];

export function SafetyConsentModal({ visible, quest, onConfirm, onCancel }: SafetyConsentModalProps) {
  const [checkedRules, setCheckedRules] = useState<Set<number>>(new Set());

  const toggleRule = (index: number) => {
    setCheckedRules((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const allChecked = checkedRules.size === SAFETY_RULES.length;

  const handleConfirm = () => {
    if (!allChecked) return;
    setCheckedRules(new Set());
    onConfirm();
  };

  const handleCancel = () => {
    setCheckedRules(new Set());
    onCancel();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ScrollView>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.title}>Charte de Sécurité</Text>
            <Text style={styles.subtitle}>
              La quête « {quest.title} » implique un déplacement physique.
              Tu dois valider chaque point avant de continuer.
            </Text>

            {SAFETY_RULES.map((rule, index) => (
              <Pressable
                key={index}
                style={[
                  styles.ruleRow,
                  checkedRules.has(index) && styles.ruleRowChecked,
                ]}
                onPress={() => toggleRule(index)}
              >
                <View style={[styles.checkbox, checkedRules.has(index) && styles.checkboxChecked]}>
                  {checkedRules.has(index) && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.ruleText}>{rule}</Text>
              </Pressable>
            ))}

            <View style={styles.actions}>
              <Pressable style={styles.cancelButton} onPress={handleCancel}>
                <Text style={styles.cancelText}>Annuler</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmButton, !allChecked && styles.confirmButtonDisabled]}
                onPress={handleConfirm}
                disabled={!allChecked}
              >
                <Text style={styles.confirmText}>J'accepte et je pars</Text>
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#12121a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  warningIcon: {
    fontSize: 40,
    textAlign: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#e8e8f0',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#9090a8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#1a1a2e',
    marginBottom: 8,
    gap: 12,
  },
  ruleRowChecked: {
    backgroundColor: '#1a2e1a',
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#555',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  checkmark: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  ruleText: {
    flex: 1,
    color: '#e8e8f0',
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  cancelText: {
    color: '#9090a8',
    fontWeight: '600',
  },
  confirmButton: {
    flex: 2,
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.4,
  },
  confirmText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
