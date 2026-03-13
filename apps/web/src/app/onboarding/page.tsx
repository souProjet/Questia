'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icons';
import type { ExplorerAxis, RiskAxis } from '@dopamode/shared';

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
      localStorage.setItem('dopamode_explorer', explorer);
      localStorage.setItem('dopamode_risk', risk);
    }
    router.push('/sign-up');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 relative"
      style={{ background: 'var(--bg)' }}>

      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(ellipse,#8b5cf6,transparent 70%)' }} />
      </div>

      <div className="relative w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-10">
          <span className="font-display font-black text-2xl text-white">dopa<span className="text-gradient">mode</span></span>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-10">
          {[0, 1].map((i) => (
            <div key={i} className="flex-1 h-1.5 rounded-full transition-all duration-500 overflow-hidden"
              style={{ background: 'rgba(255,255,255,.07)' }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: step > i ? '100%' : step === i ? '50%' : '0%', background: 'linear-gradient(90deg,#8b5cf6,#a78bfa)' }} />
            </div>
          ))}
        </div>

        {/* ── Step 0 ── */}
        {step === 0 && (
          <div className="animate-fadeIn">
            <div className="mb-8 text-center">
              <p className="label mb-3">Question 1 sur 2</p>
              <h1 className="font-display font-black text-3xl text-white leading-tight">
                Un dimanche après-midi libre,<br />
                <span className="text-gradient">tu fais quoi ?</span>
              </h1>
            </div>
            <div className="space-y-3">
              {Q1_OPTIONS.map((o) => (
                <button key={o.id} onClick={() => handleQ1(o.id)}
                  className="w-full text-left card card-hover rounded-2xl p-5 flex items-start gap-4 group transition-all duration-200">
                  <div className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-violet-400" style={{ background: 'rgba(139,92,246,.12)', border: '1px solid rgba(139,92,246,.2)' }}><Icon name={o.icon} size="xl" /></div>
                  <div>
                    <p className="font-bold text-white mb-1 group-hover:text-violet-300 transition-colors">{o.title}</p>
                    <p className="text-sm text-gray-500">{o.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 1 ── */}
        {step === 1 && (
          <div className="animate-fadeIn">
            <div className="mb-8 text-center">
              <p className="label mb-3">Question 2 sur 2</p>
              <h1 className="font-display font-black text-3xl text-white leading-tight">
                Un plan qui tombe à l'eau,<br />
                <span className="text-gradient">c'est comment pour toi ?</span>
              </h1>
            </div>
            <div className="space-y-3">
              {Q2_OPTIONS.map((o) => (
                <button key={o.id} onClick={() => handleQ2(o.id)}
                  className="w-full text-left card card-hover rounded-2xl p-5 flex items-start gap-4 group transition-all duration-200">
                  <div className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-violet-400" style={{ background: 'rgba(139,92,246,.12)', border: '1px solid rgba(139,92,246,.2)' }}><Icon name={o.icon} size="xl" /></div>
                  <div>
                    <p className="font-bold text-white mb-1 group-hover:text-violet-300 transition-colors">{o.title}</p>
                    <p className="text-sm text-gray-500">{o.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setStep(0)} className="w-full text-center text-xs text-gray-600 hover:text-gray-400 transition-colors mt-5">
              ← Revenir
            </button>
          </div>
        )}

        {/* ── Step 2: Recap ── */}
        {step === 2 && profile && (
          <div className="animate-fadeIn text-center">
            <p className="label mb-4">Ton profil</p>
            <div className="flex justify-center mb-4"><Icon name={profile.icon as 'Zap' | 'Compass' | 'Drama' | 'Leaf'} size="2xl" className="text-violet-400 w-16 h-16" /></div>
            <h2 className="font-display font-black text-3xl text-white mb-3">
              {profile.label}
            </h2>
            <p className="text-gray-400 mb-8 leading-relaxed">{profile.desc}</p>

            <div className="card rounded-2xl p-5 mb-6 text-left space-y-3">
              <div className="flex items-center gap-3">
                <Icon name={explorer === 'explorer' ? 'Globe' : 'Home'} size="lg" className="text-violet-400 flex-shrink-0" />
                <span className="text-sm text-gray-300">
                  {explorer === 'explorer' ? 'Tu aimes explorer et bouger' : 'Tu aimes ta routine et ton espace'}
                </span>
              </div>
              <div className="divider" />
              <div className="flex items-center gap-3">
                <Icon name={risk === 'risktaker' ? 'Dices' : 'ClipboardList'} size="lg" className="text-violet-400 flex-shrink-0" />
                <span className="text-sm text-gray-300">
                  {risk === 'risktaker' ? 'Tu fonces dans l\'inconnu' : 'Tu préfères ce qui est rassurant'}
                </span>
              </div>
            </div>

            <div className="rounded-2xl px-5 py-4 mb-7 border-l-2 border-violet-500"
              style={{ background: 'rgba(139,92,246,.06)' }}>
              <p className="text-sm text-violet-300 italic">
                " Tes quêtes seront générées chaque matin en fonction de ce profil,
                de ta météo et de ta ville. "
              </p>
            </div>

            <button onClick={handleFinish} disabled={saving}
              className="btn btn-cta btn-lg w-full text-base disabled:opacity-60">
              {saving ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Un instant…
                </span>
              ) : 'Créer mon compte et voir ma première quête →'}
            </button>

            <button onClick={() => setStep(1)} className="w-full text-center text-xs text-gray-600 hover:text-gray-400 transition-colors mt-4">
              ← Modifier mes réponses
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
