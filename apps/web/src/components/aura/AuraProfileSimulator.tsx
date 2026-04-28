'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles, Zap, Compass, Heart, Shield, Flame, Wind } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PersonalityVector } from '@questia/shared';
import { computeWebAuraColors } from '@/lib/auraColors';

// ─── Config des traits ────────────────────────────────────────────────────────

type TraitKey = keyof PersonalityVector;

interface TraitConfig {
  key: TraitKey;
  labelFr: string;
  descLow: string;
  descHigh: string;
  Icon: LucideIcon;
  accentClass: string;
}

const TRAITS: TraitConfig[] = [
  {
    key: 'openness',
    labelFr: 'Ouverture',
    descLow: 'Concret, habitudes stables',
    descHigh: 'Curieux, imaginatif, créatif',
    Icon: Compass,
    accentClass: 'text-[var(--violet)]',
  },
  {
    key: 'conscientiousness',
    labelFr: 'Discipline',
    descLow: 'Flexible, spontané',
    descHigh: 'Rigoureux, organisé',
    Icon: Shield,
    accentClass: 'text-[var(--cyan)]',
  },
  {
    key: 'extraversion',
    labelFr: 'Extraversion',
    descLow: 'Solitaire, introverti',
    descHigh: 'Social, expressif, énergique',
    Icon: Zap,
    accentClass: 'text-[var(--orange)]',
  },
  {
    key: 'agreeableness',
    labelFr: 'Agréabilité',
    descLow: 'Direct, compétitif',
    descHigh: 'Bienveillant, coopératif',
    Icon: Heart,
    accentClass: 'text-[var(--green)]',
  },
  {
    key: 'emotionalStability',
    labelFr: 'Stabilité émotionnelle',
    descLow: 'Réactif, intense',
    descHigh: 'Serein, équilibré',
    Icon: Wind,
    accentClass: 'text-[var(--gold)]',
  },
  {
    key: 'thrillSeeking',
    labelFr: 'Recherche de sensations',
    descLow: 'Prudent, confort assuré',
    descHigh: 'Adrénaline, prises de risque',
    Icon: Flame,
    accentClass: 'text-[var(--red)]',
  },
  {
    key: 'boredomSusceptibility',
    labelFr: 'Besoin de stimulation',
    descLow: 'Patient, routine acceptable',
    descHigh: 'S\'ennuie vite, cherche la nouveauté',
    Icon: Sparkles,
    accentClass: 'text-[var(--cyan)]',
  },
];

const DEFAULT_VALUES: PersonalityVector = {
  openness: 0.5,
  conscientiousness: 0.5,
  extraversion: 0.5,
  agreeableness: 0.5,
  emotionalStability: 0.5,
  thrillSeeking: 0.5,
  boredomSusceptibility: 0.5,
};

const PRESETS: { label: string; values: PersonalityVector }[] = [
  {
    label: 'Aventurier',
    values: { openness: 0.88, conscientiousness: 0.35, extraversion: 0.82, agreeableness: 0.5, emotionalStability: 0.65, thrillSeeking: 0.9, boredomSusceptibility: 0.85 },
  },
  {
    label: 'Sage solitaire',
    values: { openness: 0.7, conscientiousness: 0.72, extraversion: 0.18, agreeableness: 0.6, emotionalStability: 0.78, thrillSeeking: 0.2, boredomSusceptibility: 0.3 },
  },
  {
    label: 'Connecteur social',
    values: { openness: 0.5, conscientiousness: 0.5, extraversion: 0.9, agreeableness: 0.85, emotionalStability: 0.45, thrillSeeking: 0.42, boredomSusceptibility: 0.55 },
  },
  {
    label: 'Bâtisseur',
    values: { openness: 0.3, conscientiousness: 0.92, extraversion: 0.3, agreeableness: 0.55, emotionalStability: 0.6, thrillSeeking: 0.15, boredomSusceptibility: 0.2 },
  },
  {
    label: 'Neutre',
    values: DEFAULT_VALUES,
  },
];

// ─── Slider trait ─────────────────────────────────────────────────────────────

function TraitSlider({
  config,
  value,
  onChange,
}: {
  config: TraitConfig;
  value: number;
  onChange: (v: number) => void;
}) {
  const { Icon, labelFr, descLow, descHigh, accentClass } = config;
  const pct = Math.round(value * 100);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Icon className={`h-3.5 w-3.5 shrink-0 ${accentClass}`} strokeWidth={2.25} aria-hidden />
          <span className="text-sm font-semibold text-[var(--text)]">{labelFr}</span>
        </div>
        <span className="tabular-nums text-xs font-bold text-[var(--muted)] w-8 text-right">{pct}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={pct}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-[var(--progress-track)] accent-current"
        style={{ accentColor: 'var(--cyan)' }}
        aria-label={labelFr}
      />
      <div className="flex justify-between">
        <span className="text-[10px] text-[var(--subtle)]">{descLow}</span>
        <span className="text-[10px] text-[var(--subtle)]">{descHigh}</span>
      </div>
    </div>
  );
}

// ─── Preview aura (rendu côte-à-côte) ─────────────────────────────────────────

function AuraPreview({ colors }: { colors: { tr: string; bl: string; tl: string } | null }) {
  const fallbackTr = 'rgba(195, 90, 20, 0.10)';
  const fallbackBl = 'rgba(19, 78, 74, 0.11)';
  const fallbackTl = 'rgba(28, 25, 23, 0.05)';

  const tr = colors?.tr ?? fallbackTr;
  const bl = colors?.bl ?? fallbackBl;
  const tl = colors?.tl ?? fallbackTl;

  return (
    <div
      className="relative w-full h-[220px] sm:h-[260px] rounded-2xl overflow-hidden border border-[var(--border-m)] bg-[var(--surface)]"
      aria-label="Prévisualisation des orbes d'aura"
    >
      {/* Orbe TR */}
      <div
        className="absolute -top-16 -right-16 w-64 h-64 rounded-full transition-all duration-700 ease-out"
        style={{ backgroundColor: tr, filter: 'blur(50px)' }}
        aria-hidden
      />
      {/* Orbe BL */}
      <div
        className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full transition-all duration-700 ease-out"
        style={{ backgroundColor: bl, filter: 'blur(60px)' }}
        aria-hidden
      />
      {/* Orbe TL */}
      <div
        className="absolute top-4 -left-12 w-56 h-56 rounded-full transition-all duration-700 ease-out"
        style={{ backgroundColor: tl, filter: 'blur(45px)' }}
        aria-hidden
      />
      {/* Texte central */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 pointer-events-none">
        <div className="rounded-2xl border border-[var(--border-ui)] bg-[var(--card)]/70 backdrop-blur-sm px-5 py-3 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Ton aura aujourd'hui</p>
          <p className="mt-1 text-sm font-black text-[var(--text)]">Quête du jour</p>
        </div>
      </div>
    </div>
  );
}

// ─── Légende mapping trait → couleur ─────────────────────────────────────────

const ORB_LEGEND = [
  {
    id: 'TR',
    label: 'Énergie / Action',
    traits: ['Extraversion', 'Recherche de sensations'],
    colorDesc: 'Orange ↔ Rouge',
    meaning: 'L\'intensité de ton élan social et de ton goût pour l\'adrénaline',
  },
  {
    id: 'BL',
    label: 'Créativité / Lien',
    traits: ['Ouverture', 'Agréabilité'],
    colorDesc: 'Violet ↔ Vert',
    meaning: 'La richesse de ton imaginaire et la chaleur de tes relations',
  },
  {
    id: 'TL',
    label: 'Ancrage / Sérénité',
    traits: ['Discipline', 'Stabilité émotionnelle'],
    colorDesc: 'Bleu ↔ Or',
    meaning: 'Ton sens de la structure et de la paix intérieure',
  },
];

// ─── Composant principal ──────────────────────────────────────────────────────

export function AuraProfileSimulator() {
  const [values, setValues] = useState<PersonalityVector>(DEFAULT_VALUES);
  const [activePreset, setActivePreset] = useState<string | null>('Neutre');
  const reduceMotion = useReducedMotion();

  const handleChange = useCallback((key: TraitKey, v: number) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    setActivePreset(null);
  }, []);

  const applyPreset = useCallback((preset: typeof PRESETS[number]) => {
    setValues(preset.values);
    setActivePreset(preset.label);
  }, []);

  const auraColors = useMemo(() => computeWebAuraColors(values, null), [values]);

  return (
    <div className="space-y-10">

      {/* ── Prévisualisation ── */}
      <section aria-labelledby="simulator-preview-title">
        <h2 id="simulator-preview-title" className="mb-3 font-display text-lg font-black text-[var(--text)]">
          Ton profil aura en direct
        </h2>
        <AuraPreview colors={auraColors} />
      </section>

      {/* ── Presets ── */}
      <section aria-label="Profils prédéfinis">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Profils prédéfinis</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              className={`rounded-full border px-3 py-1 text-xs font-bold transition-all ${
                activePreset === p.label
                  ? 'border-[var(--cyan)] bg-[var(--cyan)]/10 text-[var(--cyan)]'
                  : 'border-[var(--border-m)] bg-[var(--card)] text-[var(--muted)] hover:border-[var(--cyan)]/40 hover:text-[var(--text)]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Sliders ── */}
      <section aria-labelledby="simulator-sliders-title">
        <h2 id="simulator-sliders-title" className="mb-4 font-display text-lg font-black text-[var(--text)]">
          Ajuste ta personnalité
        </h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {TRAITS.map((t) => (
            <TraitSlider
              key={t.key}
              config={t}
              value={values[t.key]}
              onChange={(v) => handleChange(t.key, v)}
            />
          ))}
        </div>
      </section>

      {/* ── Légende des orbes ── */}
      <section aria-labelledby="orb-legend-title">
        <h2 id="orb-legend-title" className="mb-4 font-display text-lg font-black text-[var(--text)]">
          Ce que chaque orbe exprime
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {ORB_LEGEND.map((orb) => {
            const color =
              orb.id === 'TR' ? (auraColors?.tr ?? 'rgba(195,90,20,0.10)')
              : orb.id === 'BL' ? (auraColors?.bl ?? 'rgba(19,78,74,0.11)')
              : (auraColors?.tl ?? 'rgba(28,25,23,0.06)');

            return (
              <motion.div
                key={orb.id}
                className="relative overflow-hidden rounded-2xl border border-[var(--border-ui)] bg-[var(--card)] p-4"
                layout
                transition={reduceMotion ? { duration: 0 } : { duration: 0.3 }}
              >
                {/* Fond coloré avec la couleur d'aura correspondante */}
                <div
                  className="pointer-events-none absolute inset-0 transition-all duration-700"
                  style={{ backgroundColor: color, opacity: 0.6 }}
                  aria-hidden
                />
                <div className="relative">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-display text-base font-black text-[var(--text)]">{orb.label}</span>
                    <span className="rounded-full border border-[var(--border-ui)] bg-[var(--surface)]/80 px-2 py-0.5 text-[10px] font-bold text-[var(--muted)] backdrop-blur-sm">
                      {orb.id}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--muted)] mb-2">
                    {orb.traits.join(' · ')}
                  </p>
                  <p className="text-xs font-semibold text-[var(--cyan)] mb-1">{orb.colorDesc}</p>
                  <p className="text-xs leading-relaxed text-[var(--muted)]">{orb.meaning}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── Note technique ── */}
      <div className="rounded-2xl border border-[var(--border-ui)] bg-[var(--surface)] px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-2">Note technique</p>
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          Chaque trait est converti en teinte HSL via une interpolation circulaire entre deux pôles.
          L'intensité visuelle (opacité) est proportionnelle à l'écart par rapport à la neutralité (50%).
          Un profil parfaitement moyen produit les teintes neutres du thème actif — l'aura émerge progressivement
          à mesure que la personnalité se marque.
        </p>
      </div>

    </div>
  );
}
