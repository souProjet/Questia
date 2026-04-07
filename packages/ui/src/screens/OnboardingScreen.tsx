'use client';

import React, { useState, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'solito/navigation';
import type { ExplorerAxis, RiskAxis, OperationalQuadrant } from '@questia/shared';
import { QUADRANT_DEFAULTS } from '@questia/shared';
import { PersonalityQuadrantPicker } from '../components/PersonalityQuadrantPicker';
import { DA } from '../theme';

type OnboardingStep = 'welcome' | 'question1' | 'question2' | 'complete';

const STEP_INDEX: Record<OnboardingStep, number> = { welcome: 0, question1: 1, question2: 2, complete: 3 };

export function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [explorerAxis, setExplorerAxis] = useState<ExplorerAxis | null>(null);
  const [riskAxis, setRiskAxis] = useState<RiskAxis | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const goTo = (next: OnboardingStep) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      setStep(next);
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    });
  };

  const handleComplete = () => {
    if (!explorerAxis || !riskAxis) return;
    const quadrant: OperationalQuadrant = { explorerAxis, riskAxis };
    const key = `${explorerAxis}_${riskAxis}` as keyof typeof QUADRANT_DEFAULTS;
    const personality = QUADRANT_DEFAULTS[key];
    console.log('Profile created:', { quadrant, personality });
    router.push('/app');
  };

  const currentStepIndex = STEP_INDEX[step];

  return (
    <View style={styles.container}>

      {/* Progress dots */}
      {step !== 'welcome' && step !== 'complete' && (
        <View style={styles.progressRow}>
          {[1, 2].map((i) => (
            <View
              key={i}
              style={[styles.dot, currentStepIndex >= i && styles.dotActive]}
            />
          ))}
        </View>
      )}

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>

        {step === 'welcome' && (
          <>
            <View style={styles.logoContainer}>
              <Text style={styles.logoEmoji}>⚔️</Text>
            </View>
            <Text style={styles.appTitle}>QUESTIA</Text>
            <Text style={styles.tagline}>Tu t'ennuies parce que{'\n'}t'as pas de quêtes secondaires.</Text>
            <Text style={styles.subTagline}>🎯 Quêtes du jour · Sur ton rythme · Qui évoluent avec toi</Text>
            <Pressable style={styles.primaryButton} onPress={() => goTo('question1')}>
              <Text style={styles.primaryButtonText}>C'est parti ⚔️</Text>
            </Pressable>
          </>
        )}

        {step === 'question1' && (
          <>
            <Text style={styles.questionStep}>1 / 2 — Ton rythme</Text>
            <Text style={styles.questionTitle}>Un dimanche libre, tu fais quoi ?</Text>
            <Text style={styles.questionText}>Un clic, celui qui te parle le plus.</Text>
            <PersonalityQuadrantPicker
              options={[
                { value: 'homebody', label: '🏠  Casanier', description: 'Coco, dodo, zéro galère.' },
                { value: 'explorer', label: '🌍  Explorateur', description: 'Nouveaux spots, imprévus.' },
              ]}
              selected={explorerAxis}
              onSelect={(val) => {
                setExplorerAxis(val as ExplorerAxis);
                setTimeout(() => goTo('question2'), 200);
              }}
            />
          </>
        )}

        {step === 'question2' && (
          <>
            <Text style={styles.questionStep}>2 / 2 — L'imprévu</Text>
            <Text style={styles.questionTitle}>Quand un plan tombe à l'eau…</Text>
            <Text style={styles.questionText}>Dernier clic, même règle : fun &gt; perfection.</Text>
            <PersonalityQuadrantPicker
              options={[
                { value: 'cautious', label: '🛡️  Prudent', description: 'Quand c’est prévu, c’est parfait.' },
                { value: 'risktaker', label: '🎲  Téméraire', description: 'L’imprévu, j’adore.' },
              ]}
              selected={riskAxis}
              onSelect={(val) => {
                setRiskAxis(val as RiskAxis);
                setTimeout(() => goTo('complete'), 200);
              }}
            />
          </>
        )}

        {step === 'complete' && (
          <>
            <Text style={styles.recapBadge}>Plus de questions ✓</Text>
            <View style={styles.completeBadge}>
              <Text style={styles.completeEmoji}>🎯</Text>
            </View>
            <Text style={styles.completeTitle}>Ton combo</Text>
            <View style={styles.quadrantCard}>
              <Text style={styles.quadrantLabel}>Ton style</Text>
              <Text style={styles.quadrantValue}>
                {explorerAxis === 'explorer' ? '🌍 Explorateur' : '🏠 Casanier'}{' '}
                ×{' '}
                {riskAxis === 'risktaker' ? '🎲 Téméraire' : '🛡️ Prudent'}
              </Text>
            </View>
            <Text style={styles.completeDesc}>
              On commence en douce sur{' '}
              <Text style={styles.highlight}>3 quêtes</Text>, puis on monte le niveau avec toi.
            </Text>
            <Pressable style={styles.primaryButton} onPress={handleComplete} accessibilityLabel="Continuer après le récapitulatif">
              <Text style={styles.primaryButtonText}>Continuer ⚔️</Text>
            </Pressable>
          </>
        )}

      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DA.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  progressRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
    position: 'absolute',
    top: 56,
  },
  dot: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: DA.trackMuted,
  },
  dotActive: {
    backgroundColor: '#22d3ee',
  },

  content: {
    width: '100%',
    maxWidth: 440,
    alignItems: 'center',
  },

  // Welcome
  logoContainer: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: 'rgba(34,211,238,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoEmoji: {
    fontSize: 40,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: DA.text,
    letterSpacing: 4,
    marginBottom: 12,
  },
  tagline: {
    fontSize: 20,
    fontWeight: '700',
    color: DA.text,
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 8,
  },
  subTagline: {
    fontSize: 15,
    color: DA.muted,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },

  // Question
  questionStep: {
    fontSize: 12,
    color: '#22d3ee',
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  questionTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: DA.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  questionText: {
    fontSize: 15,
    color: DA.muted,
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 28,
  },

  recapBadge: {
    fontSize: 12,
    color: '#22d3ee',
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  // Complete
  completeBadge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(34,211,238,0.1)',
    borderWidth: 2,
    borderColor: '#f97316',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  completeEmoji: {
    fontSize: 36,
  },
  completeTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: DA.text,
    marginBottom: 20,
  },
  quadrantCard: {
    backgroundColor: DA.card,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: DA.borderCyan,
    marginBottom: 20,
    gap: 8,
  },
  quadrantLabel: {
    fontSize: 12,
    color: DA.muted,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  quadrantValue: {
    fontSize: 18,
    fontWeight: '800',
    color: DA.text,
  },
  completeDesc: {
    fontSize: 14,
    color: DA.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  highlight: {
    color: '#fbbf24',
    fontWeight: '700',
  },

  // Common
  primaryButton: {
    backgroundColor: '#f97316',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
