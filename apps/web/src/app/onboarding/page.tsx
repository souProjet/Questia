'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icons';
import type { ExplorerAxis, RiskAxis } from '@questia/shared';

// ── Questions ─────────────────────────────────────────────────────────────────

const Q1_OPTIONS = [
  {
    id: 'homebody' as ExplorerAxis,
    icon: 'Home' as const,
    title: 'Je reste au chaud.',
    desc: 'Le canapé, un bon film, ma routine. Je me ressource chez moi.',
  },
  {
    id: 'explorer' as ExplorerAxis,
    icon: 'Globe' as const,
    title: 'Je pars explorer.',
    desc: 'Les nouvelles adresses, les quartiers inconnus, les imprévus — j\'adore.',
  },
];

const Q2_OPTIONS = [
  {
    id: 'cautious' as RiskAxis,
    icon: 'ClipboardList' as const,
    title: 'Je prépare, je planifie.',
    desc: 'Quand les choses se passent comme prévu, c\'est parfait.',
  },
  {
    id: 'risktaker' as RiskAxis,
    icon: 'Dices' as const,
    title: 'J\'improvise, je fonce.',
    desc: 'Les plans qui tombent à l\'eau ? C\'est souvent quand il se passe quelque chose d\'intéressant.',
  },
];

const PROFILE_RESULTS: Record<string, { icon: string; label: string; desc: string }> = {
  explorer_risktaker: { icon: 'Zap', label: 'L\'Aventurier',     desc: 'Tu vivras des quêtes intenses, en mouvement, souvent dehors.' },
  explorer_cautious:  { icon: 'Compass', label: 'L\'Explorateur Méthodique', desc: 'Tes aventures seront riches et bien cadrées, sans mauvaises surprises.' },
  homebody_risktaker: { icon: 'Drama', label: 'Le Risqueur Discret', desc: 'Des challenges à ta porte — inattendus mais toujours maîtrisés.' },
  homebody_cautious:  { icon: 'Leaf', label: 'Le Découvreur Doux', desc: 'Des aventures accessibles qui agrandiront doucement ton monde.' },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [explorer, setExplorer] = useState<ExplorerAxis | null>(null);
  const [risk, setRisk] = useState<RiskAxis | null>(null);
  const [saving, setSaving] = useState(false);

  const profileKey = explorer && risk ? `${explorer}_${risk}` : null;
  const profile = profileKey ? PROFILE_RESULTS[profileKey] : null;

  const handleQ1 = (v: ExplorerAxis) => { setExplorer(v); setStep(1); };
  const handleQ2 = (v: RiskAxis) => { setRisk(v); setStep(2); };

  const handleFinish = () => {
    if (!explorer || !risk) return;
    setSaving(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('questia_explorer', explorer);
      localStorage.setItem('questia_risk', risk);
    }
    router.push('/sign-up');
  };

  return (
    <div className="min-h-screen bg-adventure flex items-center justify-center px-4 py-16 relative">

      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-12"
          style={{ background: 'radial-gradient(ellipse,rgba(34,211,238,0.35),transparent 70%)' }} />
        <div className="absolute top-[12%] right-[9%] w-[260px] h-[220px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(ellipse,#f97316,transparent 70%)' }} />
        <div className="absolute bottom-[10%] left-[8%] w-[260px] h-[220px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(ellipse,#22d3ee,transparent 70%)' }} />
        <div className="absolute top-20 left-[12%] text-4xl opacity-10 animate-float select-none">🗺️</div>
        <div className="absolute bottom-16 right-[10%] text-3xl opacity-10 animate-float select-none">🎲</div>
      </div>

      <main id="main-content" tabIndex={-1} className="relative w-full max-w-md outline-none">

        {/* Logo */}
        <div className="flex flex-col items-center gap-2 mb-10">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-black text-white"
              style={{ background: 'linear-gradient(135deg, #f97316, #fbbf24)', boxShadow: '0 6px 16px rgba(249,115,22,.3)' }}
            >
              ⚔
            </div>
            <span className="font-display font-black text-2xl tracking-tight text-[var(--text)]">QUESTIA</span>
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--link-on-bg)]">
            🧭 Calibration du profil
          </span>
        </div>

        {/* Progress — 1 barre par question, pleine = répondue */}
        <div className="flex items-center gap-2.5 mb-10">
          {[0, 1].map((i) => {
            const filled = step > i;
            return (
              <div
                key={i}
                className="flex-1 h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: 'rgba(15,23,42,0.1)' }}
              >
                <div
                  className="h-full rounded-full transition-[width] duration-500 ease-out"
                  style={{
                    width: filled ? '100%' : '0%',
                    background: 'linear-gradient(90deg, #22d3ee, #14b8a6, #f97316)',
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* ── Step 0 ── */}
        {step === 0 && (
          <div className="motion-safe:animate-onboarding-step motion-reduce:animate-none">
            <div className="mb-8 text-center">
              <p className="label mb-3">Question 1 sur 2</p>
              <h1 className="font-display font-black text-3xl text-[var(--text)] leading-tight">
                Un dimanche après-midi libre,<br />
                <span className="text-gradient">tu fais quoi ?</span>
              </h1>
              <p className="text-sm text-[var(--text)]/80 mt-3 font-medium">Choisis ton style de joueur pour démarrer l&apos;aventure 🎮</p>
            </div>
            <div className="space-y-3">
              {Q1_OPTIONS.map((o, idx) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => handleQ1(o.id)}
                  className="w-full text-left card card-hover rounded-2xl p-5 flex items-start gap-4 group transition-[transform,box-shadow,border-color,background] duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{
                      color: idx === 0 ? '#b45309' : '#0e7490',
                      background: idx === 0 ? 'rgba(251,191,36,.2)' : 'rgba(34,211,238,.18)',
                      border: idx === 0 ? '1px solid rgba(217,119,6,.4)' : '1px solid rgba(14,116,144,.35)',
                    }}><Icon name={o.icon} size="xl" /></div>
                  <div>
                    <p className="font-bold text-[var(--text)] mb-1 group-hover:text-cyan-900 transition-colors duration-200">{o.title}</p>
                    <p className="text-sm text-[var(--text)]/75 leading-relaxed">{o.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 1 ── */}
        {step === 1 && (
          <div className="motion-safe:animate-onboarding-step motion-reduce:animate-none">
            <div className="mb-8 text-center">
              <p className="label mb-3">Question 2 sur 2</p>
              <h1 className="font-display font-black text-3xl text-[var(--text)] leading-tight">
                Un plan qui tombe à l'eau,<br />
                <span className="text-gradient">c'est comment pour toi ?</span>
              </h1>
              <p className="text-sm text-[var(--text)]/80 mt-3 font-medium">Dernier choix avant de générer tes quêtes ⚡</p>
            </div>
            <div className="space-y-3">
              {Q2_OPTIONS.map((o, idx) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => handleQ2(o.id)}
                  className="w-full text-left card card-hover rounded-2xl p-5 flex items-start gap-4 group transition-[transform,box-shadow,border-color,background] duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{
                      color: idx === 0 ? '#0e7490' : '#c2410c',
                      background: idx === 0 ? 'rgba(34,211,238,.2)' : 'rgba(249,115,22,.18)',
                      border: idx === 0 ? '1px solid rgba(14,116,144,.38)' : '1px solid rgba(194,65,12,.38)',
                    }}><Icon name={o.icon} size="xl" /></div>
                  <div>
                    <p className="font-bold text-[var(--text)] mb-1 group-hover:text-cyan-900 transition-colors duration-200">{o.title}</p>
                    <p className="text-sm text-[var(--text)]/75 leading-relaxed">{o.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setStep(0)}
              className="w-full text-center text-sm font-semibold text-[var(--link-on-bg)] hover:text-[var(--text)] underline decoration-[color:color-mix(in_srgb,var(--link-on-bg)_35%,transparent)] underline-offset-[0.2em] transition-colors duration-200 mt-5"
            >
              ← Revenir
            </button>
          </div>
        )}

        {/* ── Step 2: Recap ── */}
        {step === 2 && profile && (
          <div className="motion-safe:animate-onboarding-step motion-reduce:animate-none text-center">
            <p className="label mb-4">Ton profil est prêt ✨</p>
            <div className="flex justify-center mb-4"><Icon name={profile.icon as 'Zap' | 'Compass' | 'Drama' | 'Leaf'} size="2xl" className="text-cyan-800 w-16 h-16" /></div>
            <h2 className="font-display font-black text-3xl text-[var(--text)] mb-3">
              {profile.label}
            </h2>
            <p className="text-[var(--text)]/80 mb-8 leading-relaxed font-medium">{profile.desc}</p>

            <div className="card rounded-2xl p-5 mb-6 text-left space-y-3 border-[color:var(--border-ui-strong)]">
              <div className="flex items-center gap-3">
                <Icon name={explorer === 'explorer' ? 'Globe' : 'Home'} size="lg" className="text-cyan-800 flex-shrink-0" />
                <span className="text-sm text-[var(--text)]/85 leading-snug">
                  {explorer === 'explorer' ? 'Tu aimes explorer et bouger' : 'Tu aimes ta routine et ton espace'}
                </span>
              </div>
              <div className="divider" />
              <div className="flex items-center gap-3">
                <Icon name={risk === 'risktaker' ? 'Dices' : 'ClipboardList'} size="lg" className="text-orange-800 flex-shrink-0" />
                <span className="text-sm text-[var(--text)]/85 leading-snug">
                  {risk === 'risktaker' ? 'Tu fonces dans l\'inconnu' : 'Tu préfères ce qui est rassurant'}
                </span>
              </div>
            </div>

            <div className="rounded-2xl px-5 py-4 mb-7 border border-[color:color-mix(in_srgb,var(--cyan)_28%,var(--border-ui))] border-l-[3px] border-l-cyan-700/75 bg-[color:color-mix(in_srgb,var(--card)_70%,rgba(224,242,254,.95))] shadow-[inset_0_1px_0_rgba(255,255,255,.65)]">
              <p className="text-sm text-[var(--text)] leading-relaxed">
                " Tes quêtes seront générées chaque matin à partir de ce profil et de ce que tu
                acceptes dans l’app — le tout pour rester à ta mesure. "
              </p>
            </div>

            <button type="button" onClick={handleFinish} disabled={saving}
              className="btn btn-cta btn-lg w-full text-base transition-[transform,opacity,box-shadow] duration-200 ease-out hover:brightness-[1.03] active:scale-[0.99] disabled:opacity-60 disabled:hover:brightness-100 disabled:active:scale-100">
              {saving ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Un instant…
                </span>
              ) : '🚀 Créer mon compte et voir ma première quête'}
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full text-center text-sm font-semibold text-[var(--link-on-bg)] hover:text-[var(--text)] underline decoration-[color:color-mix(in_srgb,var(--link-on-bg)_35%,transparent)] underline-offset-[0.2em] transition-colors duration-200 mt-4"
            >
              ← Modifier mes réponses
            </button>
          </div>
        )}

        {/* Lien connexion — toujours visible */}
        <p className="text-center text-sm text-[var(--text)]/70 mt-10">
          Déjà un compte ?{' '}
          <Link
            href="/sign-in"
            className="font-bold text-[var(--link-on-bg)] hover:text-[var(--text)] underline decoration-[color:color-mix(in_srgb,var(--link-on-bg)_35%,transparent)] underline-offset-[0.2em] transition-colors duration-200"
          >
            Se connecter
          </Link>
        </p>
      </main>
    </div>
  );
}
