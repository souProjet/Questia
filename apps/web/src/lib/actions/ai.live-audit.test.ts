import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import type { PersonalityVector, EscalationPhase } from '@questia/shared';
import type { QuestContext, DailyQuestProfileInput, GeneratedDailyQuest } from './ai';

const LIVE = Boolean(process.env.RUN_LIVE_AUDIT);

type Persona = {
  id: string;
  label: string;
  declared: PersonalityVector;
  explorerAxis: 'explorer' | 'homebody';
  riskAxis: 'risktaker' | 'cautious';
};

const PERSONAS: Persona[] = [
  {
    id: 'introvert-structure',
    label: 'Introverti structuré (calme, méthodique, peu social)',
    declared: {
      openness: 0.38,
      conscientiousness: 0.82,
      extraversion: 0.22,
      agreeableness: 0.6,
      emotionalStability: 0.58,
      thrillSeeking: 0.2,
      boredomSusceptibility: 0.3,
    },
    explorerAxis: 'homebody',
    riskAxis: 'cautious',
  },
  {
    id: 'explorer-risk',
    label: 'Explorateur audacieux (curieux, social, prend des risques)',
    declared: {
      openness: 0.9,
      conscientiousness: 0.45,
      extraversion: 0.78,
      agreeableness: 0.5,
      emotionalStability: 0.64,
      thrillSeeking: 0.88,
      boredomSusceptibility: 0.75,
    },
    explorerAxis: 'explorer',
    riskAxis: 'risktaker',
  },
  {
    id: 'social-empath',
    label: 'Empathique social (chaleureux, coopératif, modéré)',
    declared: {
      openness: 0.56,
      conscientiousness: 0.55,
      extraversion: 0.65,
      agreeableness: 0.92,
      emotionalStability: 0.58,
      thrillSeeking: 0.32,
      boredomSusceptibility: 0.44,
    },
    explorerAxis: 'explorer',
    riskAxis: 'cautious',
  },
  {
    id: 'homebody-stable',
    label: 'Casanier stable (très prudent, routine, faible ouverture)',
    declared: {
      openness: 0.25,
      conscientiousness: 0.75,
      extraversion: 0.2,
      agreeableness: 0.72,
      emotionalStability: 0.78,
      thrillSeeking: 0.15,
      boredomSusceptibility: 0.22,
    },
    explorerAxis: 'homebody',
    riskAxis: 'cautious',
  },
];

const CITIES: Record<string, QuestContext> = {
  'Paris-soleil': {
    city: 'Paris',
    country: 'France',
    weatherDescription: 'Ciel dégagé, 19°C',
    weatherIcon: 'Sun',
    temp: 19,
    isOutdoorFriendly: true,
    hasUserLocation: true,
  },
  'Lyon-pluie': {
    city: 'Lyon',
    country: 'France',
    weatherDescription: 'Pluie modérée, 11°C',
    weatherIcon: 'CloudRain',
    temp: 11,
    isOutdoorFriendly: false,
    hasUserLocation: true,
  },
  'Bordeaux-couvert': {
    city: 'Bordeaux',
    country: 'France',
    weatherDescription: 'Nuageux, 15°C',
    weatherIcon: 'Cloud',
    temp: 15,
    isOutdoorFriendly: true,
    hasUserLocation: true,
  },
  'sans-GPS': {
    city: 'ta ville',
    country: '',
    weatherDescription: 'Non disponible',
    weatherIcon: 'Cloud',
    temp: 16,
    isOutdoorFriendly: false,
    hasUserLocation: false,
  },
};

type Scenario = {
  label: string;
  personaIdx: number;
  day: number;
  cityKey: string;
  isReroll?: boolean;
  refinementContext?: string;
  instantOnly?: boolean;
};

const SCENARIOS: Scenario[] = [
  { label: 'Introverti J2 calibration Paris soleil', personaIdx: 0, day: 2, cityKey: 'Paris-soleil' },
  { label: 'Introverti J7 expansion Paris soleil', personaIdx: 0, day: 7, cityKey: 'Paris-soleil' },
  { label: 'Introverti J15 rupture Paris soleil', personaIdx: 0, day: 15, cityKey: 'Paris-soleil' },
  { label: 'Explorateur J2 calibration Lyon pluie', personaIdx: 1, day: 2, cityKey: 'Lyon-pluie' },
  { label: 'Explorateur J8 expansion Bordeaux couvert', personaIdx: 1, day: 8, cityKey: 'Bordeaux-couvert' },
  { label: 'Explorateur J18 rupture Paris soleil', personaIdx: 1, day: 18, cityKey: 'Paris-soleil' },
  { label: 'Empath social J5 expansion Bordeaux couvert', personaIdx: 2, day: 5, cityKey: 'Bordeaux-couvert' },
  { label: 'Empath social J14 rupture Lyon pluie', personaIdx: 2, day: 14, cityKey: 'Lyon-pluie' },
  { label: 'Casanier J3 calibration sans GPS', personaIdx: 3, day: 3, cityKey: 'sans-GPS' },
  { label: 'Casanier J9 expansion sans GPS', personaIdx: 3, day: 9, cityKey: 'sans-GPS' },
  { label: 'Explorateur J8 RELANCE Bordeaux', personaIdx: 1, day: 8, cityKey: 'Bordeaux-couvert', isReroll: true },
  {
    label: 'Empath social J7 avec raffinement Bordeaux',
    personaIdx: 2,
    day: 7,
    cityKey: 'Bordeaux-couvert',
    refinementContext: 'Préfère les activités en soirée. Aime cuisiner. Évite les foules.',
  },
  { label: 'Introverti J12 remplacement instant Lyon pluie', personaIdx: 0, day: 12, cityKey: 'Lyon-pluie', instantOnly: true },
  { label: 'Explorateur J25 rupture avancée Paris soleil', personaIdx: 1, day: 25, cityKey: 'Paris-soleil' },
];

type AuditResult = {
  scenario: string;
  persona: string;
  day: number;
  phase: EscalationPhase;
  city: string;
  archetypeTitle: string;
  archetypeCategory: string;
  generatedTitle: string;
  mission: string;
  hook: string;
  duration: string;
  isOutdoor: boolean;
  destinationLabel: string | null;
  safetyNote: string | null;
  checks: Record<string, boolean>;
  latencyMs: number;
};

describe.skipIf(!LIVE)('AUDIT LIVE — pertinence des quêtes générées', () => {
  it('campagne multi-profils, multi-phases, multi-villes', async () => {
    const { loadEnvConfig } = await import('@next/env');
    loadEnvConfig(resolve(process.cwd(), 'apps/web'));

    const { generateDailyQuest } = await import('./ai');
    const {
      selectQuest,
      computeExhibitedPersonality,
      computeCongruenceDelta,
      getEffectivePhase,
    } = await import('@questia/shared');

    const results: AuditResult[] = [];

    for (const sc of SCENARIOS) {
      const persona = PERSONAS[sc.personaIdx]!;
      const context = CITIES[sc.cityKey]!;
      const phase = getEffectivePhase(sc.day, []);
      const exhibited = computeExhibitedPersonality([]);
      const delta = computeCongruenceDelta(persona.declared, exhibited);

      const archetype = selectQuest(
        persona.declared,
        phase,
        [],
        context.isOutdoorFriendly && context.hasUserLocation,
        undefined,
        sc.instantOnly ?? false,
        {
          exhibited,
          congruenceDelta: delta,
          selectionSeed: `audit:${persona.id}:${sc.day}:${sc.isReroll ? 'reroll' : 'first'}`,
          diversityWindow: 7,
        },
      );

      expect(archetype).not.toBeNull();

      const profileInput: DailyQuestProfileInput = {
        phase,
        day: sc.day,
        congruenceDelta: delta,
        explorerAxis: persona.explorerAxis,
        riskAxis: persona.riskAxis,
        questDateIso: '2026-03-31',
        generationSeed: `audit:${persona.id}:${sc.day}:${sc.isReroll ? 'reroll' : 'first'}`,
        declaredPersonality: persona.declared,
        exhibitedPersonality: exhibited,
        isRerollGeneration: sc.isReroll,
        substitutedInstantAfterDefer: sc.instantOnly,
        refinementContext: sc.refinementContext ?? null,
        locale: 'fr',
      };

      const t0 = performance.now();
      const gen: GeneratedDailyQuest = await generateDailyQuest(profileInput, archetype!, context);
      const latencyMs = Math.round(performance.now() - t0);

      const missionLower = gen.mission.toLowerCase();
      const hookWords = gen.hook.trim().split(/\s+/).length;
      const missionTrim = gen.mission.trim();
      const missionHasStrongVerb =
        /\b(va|prends|écris|fais|ouvre|note|choisis|envoie|pose|appelle|passe|marche|sors|traverse|ferme|lis|regarde|dessine|prépare|offre|cuisine|range|commence|arrête|écoute|demande|quitte|monte|descends|entre|explore|trace|crée|tourne|goûte|observe|cherche|installe|mets|rends|pars|profite|essaie|tente|repère|trouve|promène|filme|contacte|déplace|découvre|visite|invite|respire|rédige|joue|tire|lance|suis|montre|échange|laisse)\b/i.test(
          missionTrim,
        );

      const checks: Record<string, boolean> = {
        'titre-non-vide': gen.title.trim().length >= 3,
        'titre-pas-trop-long': gen.title.trim().length <= 90,
        'mission-concrete': gen.mission.trim().length >= 30,
        'mission-verbe-action': missionHasStrongVerb,
        'hook-compact': hookWords <= 24,
        'hook-non-vide': gen.hook.trim().length >= 5,
        'duration-presente': gen.duration.trim().length > 0,
        'outdoor-coherent': context.hasUserLocation
          ? context.isOutdoorFriendly
            ? true
            : !gen.isOutdoor
          : !gen.isOutdoor,
        'ville-mentionnee': !context.hasUserLocation ||
          context.city === 'ta ville' ||
          missionLower.includes(context.city.toLowerCase()),
        'destination-si-outdoor': gen.isOutdoor
          ? (gen.destinationLabel ?? '').trim().length >= 2
          : true,
        'pas-de-jargon-psy': !/big.?five|conscientiousness|extraversion|agreeableness|neuroticism|openness|trait de personnalit|personality trait/i.test(
          gen.mission + gen.hook,
        ),
      };

      results.push({
        scenario: sc.label,
        persona: persona.label,
        day: sc.day,
        phase,
        city: sc.cityKey,
        archetypeTitle: archetype!.title,
        archetypeCategory: archetype!.category,
        generatedTitle: gen.title,
        mission: gen.mission,
        hook: gen.hook,
        duration: gen.duration,
        isOutdoor: gen.isOutdoor,
        destinationLabel: gen.destinationLabel,
        safetyNote: gen.safetyNote,
        checks,
        latencyMs,
      });
    }

    // ── Rapport détaillé ──────────────────────────────────────────────────
    console.log('\n\n');
    console.log('═'.repeat(90));
    console.log('   AUDIT LIVE — PERTINENCE DES QUÊTES GÉNÉRÉES');
    console.log('═'.repeat(90));

    for (const r of results) {
      const allPass = Object.values(r.checks).every(Boolean);
      const failedChecks = Object.entries(r.checks)
        .filter(([, v]) => !v)
        .map(([k]) => k);

      console.log('\n' + '─'.repeat(90));
      console.log(`SCÉNARIO : ${r.scenario}`);
      console.log(`  Profil      : ${r.persona}`);
      console.log(`  Jour ${r.day} | Phase : ${r.phase} | Contexte : ${r.city}`);
      console.log(`  Archétype   : ${r.archetypeTitle} (${r.archetypeCategory})`);
      console.log(`  ────────────`);
      console.log(`  TITRE       : ${r.generatedTitle}`);
      console.log(`  MISSION     : ${r.mission}`);
      console.log(`  HOOK        : ${r.hook}`);
      console.log(`  DURÉE       : ${r.duration}`);
      console.log(`  OUTDOOR     : ${r.isOutdoor ? `oui → ${r.destinationLabel ?? '(pas de lieu)'}` : 'non'}`);
      if (r.safetyNote) console.log(`  SÉCURITÉ    : ${r.safetyNote}`);
      console.log(`  LATENCE     : ${r.latencyMs} ms`);
      console.log(`  VÉRIFS      : ${allPass ? 'TOUT OK' : `ÉCHECS → ${failedChecks.join(', ')}`}`);
    }

    // ── Synthèse globale ─────────────────────────────────────────────────
    console.log('\n' + '═'.repeat(90));
    console.log('   SYNTHÈSE GLOBALE');
    console.log('═'.repeat(90));

    const totalChecks = results.reduce(
      (acc, r) => {
        for (const [k, v] of Object.entries(r.checks)) {
          acc[k] = acc[k] ?? { pass: 0, fail: 0 };
          if (v) acc[k].pass += 1;
          else acc[k].fail += 1;
        }
        return acc;
      },
      {} as Record<string, { pass: number; fail: number }>,
    );

    for (const [check, { pass, fail }] of Object.entries(totalChecks)) {
      const pct = Math.round((pass / (pass + fail)) * 100);
      const bar = pct === 100 ? 'OK' : `${pct}%`;
      console.log(`  ${check.padEnd(26)} ${pass}/${pass + fail}  ${bar}${fail > 0 ? '  ⚠' : ''}`);
    }

    const uniqueTitles = new Set(results.map((r) => r.generatedTitle));
    const uniqueCategories = new Set(results.map((r) => r.archetypeCategory));
    const avgLatency = Math.round(results.reduce((s, r) => s + r.latencyMs, 0) / results.length);

    console.log('\n  ── Diversité ──');
    console.log(`  Titres uniques        : ${uniqueTitles.size}/${results.length}`);
    console.log(`  Catégories touchées   : ${uniqueCategories.size}/13`);
    console.log(`  Catégories            : ${[...uniqueCategories].join(', ')}`);

    const byPersona = new Map<string, string[]>();
    for (const r of results) {
      const list = byPersona.get(r.persona) ?? [];
      list.push(r.archetypeCategory);
      byPersona.set(r.persona, list);
    }
    console.log('\n  ── Répartition par profil ──');
    for (const [p, cats] of byPersona) {
      console.log(`  ${p.slice(0, 40).padEnd(42)} → ${[...new Set(cats)].join(', ')}`);
    }

    console.log(`\n  Latence moyenne       : ${avgLatency} ms`);
    console.log('═'.repeat(90) + '\n');

    const globalFailures = Object.values(totalChecks).reduce((s, c) => s + c.fail, 0);
    if (globalFailures > 0) {
      console.log(`⚠  ${globalFailures} vérification(s) en échec — voir le détail ci-dessus.\n`);
    }

    expect(uniqueTitles.size).toBeGreaterThanOrEqual(Math.floor(results.length * 0.8));
    expect(uniqueCategories.size).toBeGreaterThanOrEqual(5);
  }, 300_000);
});
