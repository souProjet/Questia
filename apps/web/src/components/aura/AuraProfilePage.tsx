'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Palette, Sliders, Layers, Zap } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { AuraProfileSimulator } from './AuraProfileSimulator';

// ─── Textes ───────────────────────────────────────────────────────────────────

const COPY = {
  fr: {
    kicker: 'Fonctionnalité',
    title: 'Profil Aura Visuelle',
    lead: 'Les bulles de couleur autour de ta quête ne sont pas décoratives : elles évoluent avec ta personnalité. Plus tu utilises Questia, plus les orbes reflètent fidèlement qui tu es.',
    backHome: '← Accueil',
    howTitle: 'Comment ça fonctionne',
    steps: [
      {
        icon: Layers,
        title: 'Un vecteur de personnalité unique',
        body: 'Questia mesure 7 dimensions : les 5 grands traits (Big Five) et 2 axes de Sensation Seeking. Chaque trait varie de 0 à 1 — le centre (0,5) est la neutralité. Aucune case, aucun diagnostic.',
      },
      {
        icon: Palette,
        title: 'Chaque trait correspond à une famille de couleurs',
        body: 'L\'extraversion tire vers l\'orange chaleureux ; l\'ouverture d\'esprit vers le violet créatif ; la stabilité émotionnelle vers l\'or serein. Les pôles opposés (faible ↔ élevé) ont des teintes différentes — la couleur exprime la direction, pas juste l\'intensité.',
      },
      {
        icon: Layers,
        title: 'Trois orbes, trois axes de lecture',
        body: 'L\'orbe Haut-Droite exprime l\'énergie et l\'action (extraversion + thrill seeking). L\'orbe Bas-Gauche exprime la créativité et le lien social (ouverture + agréabilité). L\'orbe Haut-Gauche exprime l\'ancrage et la sérénité (discipline + stabilité émotionnelle).',
      },
      {
        icon: Zap,
        title: 'Intensité proportionnelle à la personnalité',
        body: 'Un profil moyen (50 % partout) produit les teintes neutres du thème. Plus les traits sont marqués, plus les couleurs deviennent expressives. Le thème actif (Minuit, Aurore…) module la saturation et la luminosité.',
      },
      {
        icon: Sliders,
        title: 'Personnalité exhibée vs déclarée',
        body: 'À l\'onboarding, tu déclares une orientation. Avec le temps, tes choix de quêtes (complétées, refusées, relancées) font évoluer une personnalité "exhibée" calculée depuis ton comportement réel. C\'est cette version qui colore l\'aura en priorité.',
      },
    ],
    simulatorTitle: 'Simulateur interactif',
    simulatorLead: 'Déplace les curseurs pour explorer comment chaque trait influence les couleurs en temps réel.',
    noteTitle: 'Ce que tu dois retenir',
    noteBody: 'L\'aura n\'est pas un ornement — c\'est un miroir doux de ton parcours. Elle change imperceptiblement au fil des semaines à mesure que ta personnalité exhibée converge ou diverge de ce que tu avais déclaré. Aucun chiffre, aucune étiquette : juste une ambiance.',
  },
  en: {
    kicker: 'Feature',
    title: 'Visual Aura Profile',
    lead: 'The color bubbles around your quest aren\'t decorative — they evolve with your personality. The more you use Questia, the more the orbs faithfully reflect who you are.',
    backHome: '← Home',
    howTitle: 'How it works',
    steps: [
      {
        icon: Layers,
        title: 'A unique personality vector',
        body: 'Questia measures 7 dimensions: the Big Five traits and 2 Sensation Seeking axes. Each trait ranges from 0 to 1 — the center (0.5) is neutral. No boxes, no diagnosis.',
      },
      {
        icon: Palette,
        title: 'Each trait maps to a color family',
        body: 'Extraversion pulls toward warm orange; openness toward creative violet; emotional stability toward serene gold. Opposite poles (low ↔ high) have different hues — color expresses direction, not just intensity.',
      },
      {
        icon: Layers,
        title: 'Three orbs, three reading axes',
        body: 'The top-right orb expresses energy and action (extraversion + thrill seeking). The bottom-left expresses creativity and social connection (openness + agreeableness). The top-left expresses grounding and serenity (conscientiousness + emotional stability).',
      },
      {
        icon: Zap,
        title: 'Intensity proportional to personality',
        body: 'An average profile (50% everywhere) produces the theme\'s neutral tints. The more marked the traits, the more expressive the colors become. The active theme (Midnight, Aurora…) modulates saturation and lightness.',
      },
      {
        icon: Sliders,
        title: 'Exhibited vs declared personality',
        body: 'At onboarding, you declare an orientation. Over time, your quest choices (completed, rejected, rerolled) evolve an "exhibited" personality calculated from real behavior. That version colors the aura first.',
      },
    ],
    simulatorTitle: 'Interactive simulator',
    simulatorLead: 'Move the sliders to explore how each trait influences colors in real time.',
    noteTitle: 'What to keep in mind',
    noteBody: 'The aura isn\'t an ornament — it\'s a gentle mirror of your journey. It changes imperceptibly over weeks as your exhibited personality converges or diverges from what you declared. No numbers, no labels: just an atmosphere.',
  },
} as const;

type Locale = 'fr' | 'en';

const STEP_ACCENTS = [
  { ring: 'from-violet-400 to-violet-600', bg: 'bg-violet-500/10', border: 'border-violet-400/40', icon: 'text-violet-700' },
  { ring: 'from-orange-400 to-orange-600', bg: 'bg-orange-500/10', border: 'border-orange-400/40', icon: 'text-orange-700' },
  { ring: 'from-teal-400 to-teal-600', bg: 'bg-teal-500/10', border: 'border-teal-400/40', icon: 'text-teal-700' },
  { ring: 'from-amber-400 to-amber-600', bg: 'bg-amber-500/10', border: 'border-amber-400/40', icon: 'text-amber-700' },
  { ring: 'from-cyan-400 to-cyan-600', bg: 'bg-cyan-500/10', border: 'border-cyan-400/40', icon: 'text-cyan-700' },
] as const;

// ─── Composant principal ──────────────────────────────────────────────────────

export function AuraProfilePage({ locale }: { locale: Locale }) {
  const t = COPY[locale];
  const reduceMotion = useReducedMotion();

  return (
    <div className="min-h-screen bg-[var(--bg)]">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden border-b border-[var(--border)] bg-[var(--text)]">
        {/* Orbes décoratifs reproduisant l'effet aura */}
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage: `
              radial-gradient(circle at 15% 25%, hsla(280,60%,55%,0.45) 0%, transparent 45%),
              radial-gradient(circle at 82% 12%, hsla(28,70%,55%,0.38) 0%, transparent 40%),
              radial-gradient(circle at 50% 85%, hsla(130,50%,52%,0.30) 0%, transparent 45%),
              radial-gradient(circle at 68% 60%, hsla(210,55%,55%,0.25) 0%, transparent 35%)
            `,
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-4xl px-4 py-14 sm:py-20 text-white">
          <h1 className="font-display text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">{t.title}</h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-200 sm:text-lg">{t.lead}</p>
        </div>
      </div>

      {/* ── Breadcrumb ── */}
      <div className="mx-auto max-w-3xl px-4 py-4 sm:py-6">
        <p className="text-sm text-[var(--muted)]">
          <Link href="/" className="font-semibold text-[var(--orange)] hover:underline">
            {t.backHome}
          </Link>
        </p>
      </div>

      <div className="mx-auto max-w-3xl px-4 pb-16 sm:pb-24 space-y-12">

        {/* ── Simulateur interactif ── */}
        <section aria-labelledby="simulator-section-title">
          <h2 id="simulator-section-title" className="mb-2 font-display text-xl font-black text-[var(--text)] sm:text-2xl">
            {t.simulatorTitle}
          </h2>
          <p className="mb-6 text-sm leading-relaxed text-[var(--muted)] sm:text-[15px]">{t.simulatorLead}</p>
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)]/80 p-6 shadow-xl shadow-black/5 backdrop-blur-sm sm:p-8">
            <AuraProfileSimulator />
          </div>
        </section>
        {/* ── Comment ça fonctionne ── */}
        <section aria-labelledby="how-title">
          <h2 id="how-title" className="mb-6 font-display text-xl font-black text-[var(--text)] sm:text-2xl">
            {t.howTitle}
          </h2>
          <div
            className="relative rounded-3xl border border-[var(--border)] bg-[var(--card)]/80 p-6 shadow-xl shadow-black/5 backdrop-blur-sm sm:p-10"
          >
            <div
              className="pointer-events-none absolute left-8 top-24 bottom-32 hidden w-px bg-gradient-to-b from-violet-300 via-orange-300 to-teal-300 opacity-60 sm:block md:left-12"
              aria-hidden
            />
            <ol className="space-y-0">
              {t.steps.map((step, i) => {
                const accent = STEP_ACCENTS[i % STEP_ACCENTS.length]!;
                const Icon = step.icon;
                const motionProps = reduceMotion
                  ? {}
                  : {
                    initial: { x: i % 2 === 0 ? -12 : 12 },
                    whileInView: { x: 0 },
                    viewport: { once: true, amount: 0.1 },
                    transition: { delay: i * 0.04, duration: 0.38, ease: [0.22, 1, 0.36, 1] as const },
                  };
                return (
                  <li key={i}>
                    <motion.div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6" {...motionProps}>
                      <div className="flex shrink-0 items-center gap-3 sm:w-28 sm:flex-col sm:items-center md:w-32">
                        <div className={`relative flex h-14 w-14 items-center justify-center rounded-2xl border-2 ${accent.border} ${accent.bg}`}>
                          <span className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${accent.ring} opacity-15`} aria-hidden />
                          <Icon className={`relative h-7 w-7 ${accent.icon}`} strokeWidth={2.25} aria-hidden />
                        </div>
                        <span className="font-display text-xs font-black tabular-nums text-[var(--muted)] sm:text-center">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 px-4 py-4 sm:px-5 sm:py-5">
                        <h3 className="font-display text-lg font-black text-[var(--text)] sm:text-xl">{step.title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)] sm:text-[15px]">{step.body}</p>
                      </div>
                    </motion.div>
                    {i < t.steps.length - 1 ? (
                      <div className="relative flex justify-center py-1" aria-hidden>
                        <div className={`h-12 w-1 rounded-full bg-gradient-to-b ${STEP_ACCENTS[(i + 1) % STEP_ACCENTS.length]!.ring} opacity-70`} />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </div>
        </section>


        {/* ── Note finale ── */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
          <h2 className="font-display text-lg font-black text-[var(--text)]">{t.noteTitle}</h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--muted)] sm:text-[15px]">{t.noteBody}</p>
        </div>

      </div>
    </div>
  );
}
