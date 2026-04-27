'use client';

/**
 * AuraOrbsLayer — composant headless (render null).
 *
 * Met à jour trois CSS custom properties sur <html> :
 *   --aura-tr  (énergie / action — haut-droite)
 *   --aura-bl  (créativité / lien — bas-gauche)
 *   --aura-tl  (ancrage / sérénité — gauche-milieu)
 *
 * Ces variables sont consommées par body::before dans globals.css :
 *   position: fixed; z-index: 1 → toujours au-dessus des fonds opaques des pages,
 *   en-dessous des contenus interactifs (main z-10, navbar z-50+).
 *
 * Les valeurs :root dans globals.css servent de fallback immédiat (CSS pur, avant
 * tout JS) — aucun flash d'hydratation.
 *
 * - Connecté avec personnalité → couleurs issues du profil exhibited / declared.
 * - Sinon → clearAuraVars() retire l'override inline → les :root defaults reprennent.
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { computeWebAuraColors } from '@/lib/auraColors';
import type { PersonalityVector } from '@questia/shared';

type ProfileResponse = {
  exhibitedPersonality?: PersonalityVector | null;
  declaredPersonality?: PersonalityVector | null;
  shop?: { activeThemeId?: string | null };
};

function applyAuraVars(tr: string, bl: string, tl: string) {
  const el = document.documentElement;
  el.style.setProperty('--aura-tr', tr);
  el.style.setProperty('--aura-bl', bl);
  el.style.setProperty('--aura-tl', tl);
}

function clearAuraVars() {
  const el = document.documentElement;
  el.style.removeProperty('--aura-tr');
  el.style.removeProperty('--aura-bl');
  el.style.removeProperty('--aura-tl');
}

export function AuraOrbsLayer() {
  const { isSignedIn, isLoaded } = useAuth();
  const [personality, setPersonality] = useState<PersonalityVector | null>(null);
  const [themeId, setThemeId] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/profile', { method: 'GET' });
      if (!res.ok) return;
      const j = (await res.json()) as ProfileResponse;
      setPersonality(j.exhibitedPersonality ?? j.declaredPersonality ?? null);
      setThemeId(j.shop?.activeThemeId ?? null);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      void fetchProfile();
    } else {
      setPersonality(null);
      setThemeId(null);
      clearAuraVars();
    }
  }, [isLoaded, isSignedIn, fetchProfile]);

  // Re-sync quand le thème change (achat en boutique)
  useEffect(() => {
    if (typeof window === 'undefined' || !isSignedIn) return;
    const handler = () => void fetchProfile();
    window.addEventListener('questia-shop-grants-updated', handler);
    return () => window.removeEventListener('questia-shop-grants-updated', handler);
  }, [isSignedIn, fetchProfile]);

  const colors = useMemo(
    () => (personality ? computeWebAuraColors(personality, themeId) : null),
    [personality, themeId],
  );

  useEffect(() => {
    if (colors) {
      applyAuraVars(colors.tr, colors.bl, colors.tl);
    } else {
      clearAuraVars();
    }
  }, [colors]);

  return null;
}
