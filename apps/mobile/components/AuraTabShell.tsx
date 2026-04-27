/**
 * AuraTabShell — conteneur racine pour les onglets secondaires (profil, boutique, historique).
 *
 * Fournit le fond coloré du thème + les 3 orbes d'aura dérivés de la personnalité
 * de l'utilisateur (Profil Aura Visuelle). Les orbes sont absolument positionnés
 * derrière le contenu (pointerEvents="none"), le contenu garde le z-index naturel.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { computeAuraOrbTints } from '@questia/ui';
import { useAppTheme } from '../contexts/AppThemeContext';

interface Props {
  children: React.ReactNode;
}

export function AuraTabShell({ children }: Props) {
  const { palette, themeId, personality } = useAppTheme();

  const orbTints = useMemo(
    () => computeAuraOrbTints(personality, themeId, palette),
    [personality, themeId, palette],
  );

  return (
    <View style={[styles.root, { backgroundColor: palette.bg }]}>
      {/* Orbes d'aura — derrière le contenu */}
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        <View
          style={[
            styles.orb,
            styles.orbTopRight,
            { backgroundColor: orbTints.tr },
          ]}
        />
        <View
          style={[
            styles.orb,
            styles.orbBottomLeft,
            { backgroundColor: orbTints.bl },
          ]}
        />
        <View
          style={[
            styles.orb,
            styles.orbTopLeft,
            { backgroundColor: orbTints.tl },
          ]}
        />
      </View>

      {/* Contenu de l'onglet */}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    position: 'relative',
  },
  content: {
    flex: 1,
  },
  orb: {
    position: 'absolute',
    borderRadius: 9999,
    // Flou simulé via opacité étalée : React Native ne supporte pas blur natif sur les Views.
    // Pour un vrai blur sur iOS : remplacer par MaskedView + BlurView si les perfs le permettent.
    opacity: 1,
  },
  orbTopRight: {
    width: 420,
    height: 420,
    top: -80,
    right: -100,
  },
  orbBottomLeft: {
    width: 460,
    height: 460,
    bottom: -100,
    left: -110,
  },
  orbTopLeft: {
    width: 320,
    height: 320,
    top: 60,
    left: -80,
  },
});
