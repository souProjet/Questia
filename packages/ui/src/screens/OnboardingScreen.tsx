import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'solito/navigation';
import type { ExplorerAxis, RiskAxis, OperationalQuadrant } from '@quetes/shared';
import { QUADRANT_DEFAULTS } from '@quetes/shared';
import { PersonalityQuadrantPicker } from '../components/PersonalityQuadrantPicker';

type OnboardingStep = 'welcome' | 'question1' | 'question2' | 'complete';

export function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [explorerAxis, setExplorerAxis] = useState<ExplorerAxis | null>(null);
  const [riskAxis, setRiskAxis] = useState<RiskAxis | null>(null);

  const handleComplete = () => {
    if (!explorerAxis || !riskAxis) return;
    const quadrant: OperationalQuadrant = { explorerAxis, riskAxis };
    const key = `${explorerAxis}_${riskAxis}` as keyof typeof QUADRANT_DEFAULTS;
    const personality = QUADRANT_DEFAULTS[key];
    // In production, save to Supabase here
    console.log('Profile created:', { quadrant, personality });
    router.push('/dashboard');
  };

  return (
    <View style={styles.container}>
      {step === 'welcome' && (
        <View style={styles.content}>
          <Text style={styles.logo}>⚔️</Text>
          <Text style={styles.title}>Quêtes Secondaires</Text>
          <Text style={styles.subtitle}>
            Tu t'ennuies parce que t'as pas de quêtes secondaires.{'\n'}
            La vie c'est pas juste travailler + dormir.
          </Text>
          <Pressable style={styles.primaryButton} onPress={() => setStep('question1')}>
            <Text style={styles.primaryButtonText}>Commencer l'aventure</Text>
          </Pressable>
        </View>
      )}

      {step === 'question1' && (
        <View style={styles.content}>
          <Text style={styles.stepIndicator}>1 / 2</Text>
          <Text style={styles.questionTitle}>Ton style d'aventure</Text>
          <Text style={styles.questionText}>
            Es-tu plutôt du genre casanier (soirée film) ou aimes-tu sortir sans savoir où la nuit te mènera ?
          </Text>
          <PersonalityQuadrantPicker
            options={[
              { value: 'homebody', label: '🏠 Casanier', description: 'Je préfère le confort de chez moi' },
              { value: 'explorer', label: '🌍 Explorateur', description: 'J\'aime découvrir l\'inconnu' },
            ]}
            selected={explorerAxis}
            onSelect={(val) => {
              setExplorerAxis(val as ExplorerAxis);
              setStep('question2');
            }}
          />
        </View>
      )}

      {step === 'question2' && (
        <View style={styles.content}>
          <Text style={styles.stepIndicator}>2 / 2</Text>
          <Text style={styles.questionTitle}>Ton rapport au risque</Text>
          <Text style={styles.questionText}>
            En vacances, préfères-tu le confort d'un hébergement planifié à l'avance, ou l'imprévu de devoir trouver un abri à la dernière minute ?
          </Text>
          <PersonalityQuadrantPicker
            options={[
              { value: 'cautious', label: '🛡️ Prudent', description: 'Je planifie et je sécurise' },
              { value: 'risktaker', label: '🎲 Téméraire', description: 'J\'embrasse l\'imprévu' },
            ]}
            selected={riskAxis}
            onSelect={(val) => {
              setRiskAxis(val as RiskAxis);
              setStep('complete');
            }}
          />
        </View>
      )}

      {step === 'complete' && (
        <View style={styles.content}>
          <Text style={styles.logo}>🎯</Text>
          <Text style={styles.title}>Profil établi !</Text>
          <Text style={styles.subtitle}>
            {explorerAxis === 'explorer' ? 'Explorateur' : 'Casanier'} ×{' '}
            {riskAxis === 'risktaker' ? 'Téméraire' : 'Prudent'}
          </Text>
          <Text style={styles.description}>
            L'algorithme va maintenant calibrer tes premières quêtes sur 3 jours.
            Elles seront proches de ta zone de confort pour créer l'habitude.
          </Text>
          <Pressable style={styles.primaryButton} onPress={handleComplete}>
            <Text style={styles.primaryButtonText}>Recevoir ma première quête</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 440,
    alignItems: 'center',
  },
  logo: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#e8e8f0',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#9090a8',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  description: {
    fontSize: 14,
    color: '#9090a8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  stepIndicator: {
    fontSize: 14,
    color: '#7c3aed',
    fontWeight: '600',
    marginBottom: 16,
  },
  questionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#e8e8f0',
    textAlign: 'center',
    marginBottom: 12,
  },
  questionText: {
    fontSize: 15,
    color: '#9090a8',
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
