'use client';

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { DA } from '../theme';

interface PickerOption {
  value: string;
  label: string;
  description: string;
}

interface PersonalityQuadrantPickerProps {
  options: PickerOption[];
  selected: string | null;
  onSelect: (value: string) => void;
}

export function PersonalityQuadrantPicker({ options, selected, onSelect }: PersonalityQuadrantPickerProps) {
  return (
    <View style={styles.container}>
      {options.map((option) => {
        const isSelected = selected === option.value;
        return (
          <Pressable
            key={option.value}
            style={[styles.option, isSelected && styles.optionSelected]}
            onPress={() => onSelect(option.value)}
          >
            <View style={styles.optionInner}>
              <View style={styles.optionHeader}>
                <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                  {option.label}
                </Text>
                <View style={[styles.radio, isSelected && styles.radioSelected]}>
                  {isSelected && <View style={styles.radioDot} />}
                </View>
              </View>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 12,
  },
  option: {
    backgroundColor: DA.card,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: DA.border,
    overflow: 'hidden',
  },
  optionSelected: {
    borderColor: '#134e4a',
    backgroundColor: 'rgba(34,211,238,0.08)',
  },
  optionInner: {
    padding: 20,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionLabel: {
    fontSize: 20,
    fontWeight: '800',
    color: DA.text,
  },
  optionLabelSelected: {
    color: '#134e4a',
  },
  optionDescription: {
    fontSize: 14,
    color: DA.muted,
    lineHeight: 21,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: DA.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: '#134e4a',
    backgroundColor: 'rgba(34,211,238,0.15)',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#134e4a',
  },
});
