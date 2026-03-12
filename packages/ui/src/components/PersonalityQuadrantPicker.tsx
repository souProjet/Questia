import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

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
      {options.map((option) => (
        <Pressable
          key={option.value}
          style={[
            styles.option,
            selected === option.value && styles.optionSelected,
          ]}
          onPress={() => onSelect(option.value)}
        >
          <Text style={[
            styles.optionLabel,
            selected === option.value && styles.optionLabelSelected,
          ]}>
            {option.label}
          </Text>
          <Text style={styles.optionDescription}>{option.description}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 12,
  },
  option: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#2a2a3e',
  },
  optionSelected: {
    borderColor: '#7c3aed',
    backgroundColor: 'rgba(124,58,237,0.1)',
  },
  optionLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e8e8f0',
    marginBottom: 6,
  },
  optionLabelSelected: {
    color: '#a855f7',
  },
  optionDescription: {
    fontSize: 14,
    color: '#9090a8',
    lineHeight: 20,
  },
});
