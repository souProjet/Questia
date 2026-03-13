'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { Navbar } from '@/components/Navbar';
import { Icon } from '@/components/Icons';
import type { EscalationPhase } from '@dopamode/shared';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DailyQuest {
  questDate: string;
  archetypeId: number;
  archetypeName: string;
  emoji: string;
  title: string;
  mission: string;
  hook: string;
  duration: string;
  safetyNote: string | null;
  isOutdoor: boolean;
  city: string | null;
  weather: string | null;
  weatherTemp: number | null;
  status: 'pending' | 'accepted' | 'completed' | 'rejected' | 'replaced';
  day: number;
  streak: number;
  phase: EscalationPhase;
  context?: {
    weatherIcon: string;
    weatherDescription: string;
    temp: number;
    city: string;
  };
}

// ── Phase → friendly label ─────────────────────────────────────────────────────

const PHASE_LABEL: Record<EscalationPhase, { text: string; pill: string; icon: string }> = {
  calibration: { text: 'Semaine de découverte',   pill: 'pill-calibration', icon: 'Leaf' },
  expansion:   { text: 'En mode exploration',     pill: 'pill-expansion',   icon: 'Moon' },
  rupture:     { text: 'Phase d\'intensité',      pill: 'pill-rupture',     icon: 'Zap' },
};

// ── Safety consent ─────────────────────────────────────────────────────────────

function SafetySheet({ quest, onConfirm, onClose }: {
  quest: DailyQuest;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const rules = [
    "Je reste dans des lieux publics et accessibles.",
    "Je n'entrerai pas dans des propriétés privées.",
    "Je vérifierai les conditions météo avant de partir.",
    "Je fais confiance à mon instinct — si ça semble risqué, je passe.",
    "J'ai informé quelqu'un de mon itinéraire (optionnel mais recommandé).",
  ];
  const toggle = (i: number) =>
    setChecked((p) => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; });
  const ok = checked.size === rules.length;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md card rounded-3xl overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
        <div className="p-7">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3"><Icon name="Shield" size="2xl" className="text-amber-400" /></div>
            <h3 className="font-display font-black text-xl text-white mb-1">Avant de partir…</h3>
            <p className="text-sm text-gray-400">
              {quest.title} se passe en extérieur. Coche chaque point pour confirmer.
            </p>
          </div>
          <div className="space-y-2 mb-5">
            {rules.map((r, i) => (
              <button key={i} onClick={() => toggle(i)}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                style={{
                  background: checked.has(i) ? 'rgba(16,185,129,.08)' : 'rgba(255,255,255,.03)',
                  border: `1px solid ${checked.has(i) ? 'rgba(16,185,129,.3)' : 'rgba(255,255,255,.07)'}`,
                }}>
                <div className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center"
                  style={{ background: checked.has(i) ? '#10b981' : 'rgba(255,255,255,.05)', border: `2px solid ${checked.has(i) ? '#10b981' : 'rgba(255,255,255,.15)'}` }}>
                  {checked.has(i) ? <Icon name="Check" size="xs" className="text-white" /> : null}
                </div>
                <span className={`text-sm ${checked.has(i) ? 'text-gray-200' : 'text-gray-500'}`}>{r}</span>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn btn-ghost btn-md flex-1">Pas aujourd'hui</button>
            <button onClick={() => ok && onConfirm()} disabled={!ok}
              className="btn btn-md flex-[2] text-white transition-all"
              style={{ background: ok ? 'linear-gradient(135deg,#f97316,#fbbf24)' : 'rgba(255,255,255,.05)', color: ok ? '#fff' : '#4a4a6a', cursor: ok ? 'pointer' : 'not-allowed', boxShadow: ok ? '0 4px 20px rgba(249,115,22,.35)' : 'none' }}>
              <span className="flex items-center justify-center gap-2">C'est parti ! <Icon name="Map" size="sm" /></span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, isLoaded } = useUser();

  const [quest, setQuest] = useState<DailyQuest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [showSafety, setShowSafety] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [rerolling, setRerolling] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'asking' | 'granted' | 'denied' | 'idle'>('idle');

  // ── Load daily quest ──────────────────────────────────────────────────────

  const loadQuest = useCallback(async (lat?: number, lon?: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = lat && lon ? `?lat=${lat}&lon=${lon}` : '';
      const res = await fetch(`/api/quest/daily${params}`);
      if (res.status === 404) {
        setError('Crée d\'abord ton profil via l\'onboarding.');
        return;
      }
      if (!res.ok) throw new Error('Erreur serveur');
      const data = await res.json() as DailyQuest;
      setQuest(data);
      setAccepted(data.status === 'accepted' || data.status === 'completed');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    setLocationStatus('asking');
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setLocationStatus('granted');
        loadQuest(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setLocationStatus('denied');
        loadQuest();
      },
      { timeout: 5000 },
    );
  }, [isLoaded, loadQuest]);

  // ── Accept quest ──────────────────────────────────────────────────────────

  const doAccept = useCallback(async () => {
    if (!quest) return;
    setAccepting(true);
    try {
      await fetch('/api/quest/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questDate: quest.questDate, safetyConsentGiven: quest.isOutdoor }),
      });
      setAccepted(true);
    } finally {
      setAccepting(false);
      setShowSafety(false);
    }
  }, [quest]);

  const handleAccept = () => {
    if (quest?.isOutdoor) { setShowSafety(true); }
    else { doAccept(); }
  };

  // ── Reroll ────────────────────────────────────────────────────────────────

  const handleReroll = async () => {
    if (!quest || accepted || rerolling) return;
    setRerolling(true);
    // Mark current quest as replaced and generate a new one
    await fetch('/api/quest/daily', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questDate: quest.questDate, status: 'replaced' }),
    });
    // Delete today's cached quest so a new one is generated
    // For MVP: just reload with a small delay (the API will return cached; in full impl add ?force=true)
    setTimeout(() => {
      setRerolling(false);
      // In MVP: show "reroll used" message, full impl: call /api/quest/daily?force=true
    }, 800);
  };

  // ── Phase label ───────────────────────────────────────────────────────────

  const phase = quest?.phase ?? 'calibration';
  const phaseInfo = PHASE_LABEL[phase];

  // ── Skeleton ──────────────────────────────────────────────────────────────

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 pt-24 pb-20">
          <div className="animate-pulse space-y-5 mt-4">
            <div className="h-5 bg-white/5 rounded-xl w-40" />
            <div className="h-10 bg-white/5 rounded-xl w-72" />
            {locationStatus === 'asking' && (
              <div className="card rounded-2xl p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
                <p className="text-sm text-gray-400">Récupération de ta localisation…</p>
              </div>
            )}
            <div className="h-80 bg-white/5 rounded-3xl" />
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 pt-24 pb-20 flex flex-col items-center justify-center text-center gap-6">
          <Icon name="Frown" size="2xl" className="text-gray-500 mx-auto" />
          <h2 className="font-display font-black text-2xl text-white">Pas de quête pour l'instant</h2>
          <p className="text-gray-400">{error}</p>
          {error.includes('onboarding') && (
            <a href="/onboarding" className="btn btn-primary btn-md">Créer mon profil →</a>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 pt-24 pb-24">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 mb-8 mt-4">
          <div>
            <p className="label mb-2 flex items-center gap-2"><Icon name={phaseInfo.icon as 'Leaf' | 'Moon' | 'Zap'} size="sm" /> {phaseInfo.text}</p>
            <h1 className="font-display text-3xl md:text-4xl font-black text-white leading-tight">
              Bonjour {user?.firstName ?? ''}<br />
              <span className="text-gradient">c'est l'heure de l'aventure.</span>
            </h1>
          </div>
          <div className="flex-shrink-0 flex flex-col items-end gap-2">
            {(quest?.streak ?? 0) > 0 && (
              <div className="streak-badge flex items-center gap-1.5">
                <Icon name="Flame" size="sm" /> {quest?.streak} jour{quest?.streak !== 1 ? 's' : ''} d'affilée
              </div>
            )}
            <p className="text-xs text-gray-600">Jour {quest?.day ?? 1}</p>
          </div>
        </div>

        {/* ── Context bar (weather + location) ── */}
        {quest && (quest.city || quest.weather) && (
          <div className="flex items-center gap-2 mb-6 px-4 py-2.5 rounded-2xl text-sm text-gray-400"
            style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
            <Icon name={(quest.context?.weatherIcon ?? 'CloudSun') as 'Sun' | 'CloudSun' | 'Cloud' | 'CloudRain' | 'CloudSnow' | 'CloudFog' | 'CloudLightning'} size="sm" className="text-gray-400 flex-shrink-0" />
            <span>
              {quest.context?.weatherDescription ?? quest.weather ?? 'Variable'},
              {' '}{Math.round(quest.context?.temp ?? quest.weatherTemp ?? 18)}°C
            </span>
            {quest.city && quest.city !== 'ta ville' && (
              <>
                <span className="text-gray-600">·</span>
                <span className="text-violet-300 font-medium flex items-center gap-1"><Icon name="MapPin" size="sm" /> {quest.city}</span>
              </>
            )}
          </div>
        )}

        {/* ── Quest card ── */}
        {quest && (
          <div className={`card rounded-3xl overflow-hidden mb-4 ${accepted ? '' : 'quest-glow'}`}
            style={{ borderColor: accepted ? 'rgba(16,185,129,.3)' : 'rgba(139,92,246,.2)' }}>

            {/* Color stripe */}
            <div className="h-2"
              style={{ background: accepted
                ? 'linear-gradient(90deg,#10b981,#059669)'
                : 'linear-gradient(90deg,#8b5cf6,#a78bfa,#8b5cf6)' }} />

            <div className="p-6 md:p-8">
              {/* Category + accepted tag */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Icon name={quest.emoji as 'Swords' | 'Camera' | 'Target' | string} size="lg" className="text-violet-400 flex-shrink-0" />
                  <span className="text-xs text-violet-400 font-semibold">{quest.archetypeName}</span>
                </div>
                {accepted
                  ? <span className="text-xs font-bold text-emerald-400 px-2.5 py-1 rounded-full flex items-center gap-1" style={{ background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.25)' }}><Icon name="Check" size="xs" /> En cours</span>
                  : <span className="text-xs text-gray-500">
                      {new Date(quest.questDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </span>
                }
              </div>

              {/* Title */}
              <h2 className="font-display font-black text-2xl md:text-3xl text-white leading-tight mb-4">
                {quest.title}
              </h2>

              {/* Mission */}
              <p className="text-gray-300 leading-relaxed text-base mb-5">
                {quest.mission}
              </p>

              {/* Hook */}
              <div className="rounded-2xl px-4 py-3 mb-5 border-l-2 border-violet-500"
                style={{ background: 'rgba(139,92,246,.06)' }}>
                <p className="text-violet-300 text-sm italic font-medium">
                  " {quest.hook} "
                </p>
              </div>

              {/* Meta tags */}
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl font-medium"
                  style={{ background: 'rgba(255,255,255,.04)', color: '#9991b8', border: '1px solid rgba(255,255,255,.07)' }}>
                  <Icon name="Clock" size="xs" /> {quest.duration}
                </span>
                {quest.isOutdoor && (
                  <span className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl font-medium"
                    style={{ background: 'rgba(16,185,129,.08)', color: '#10b981', border: '1px solid rgba(16,185,129,.2)' }}>
                    <Icon name="TreePine" size="xs" /> Extérieur
                  </span>
                )}
              </div>

              {/* Safety note */}
              {quest.safetyNote && !accepted && (
                <div className="flex items-start gap-2 rounded-xl p-3 mb-5 text-sm text-amber-300"
                  style={{ background: 'rgba(251,191,36,.06)', border: '1px solid rgba(251,191,36,.15)' }}>
                  <Icon name="AlertTriangle" size="sm" className="flex-shrink-0 mt-0.5 text-amber-400" />
                  <span>{quest.safetyNote}</span>
                </div>
              )}

              {/* CTA */}
              {accepted ? (
                <div className="text-center py-5 rounded-2xl"
                  style={{ background: 'rgba(16,185,129,.06)', border: '1px solid rgba(16,185,129,.15)' }}>
                  <p className="text-emerald-400 font-bold text-base mb-1">Quête en cours !</p>
                  <p className="text-xs text-gray-500">Ta prochaine aventure sera générée demain matin.</p>
                </div>
              ) : accepting ? (
                <div className="flex items-center justify-center gap-3 py-5">
                  <div className="w-5 h-5 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
                  <p className="text-violet-300 font-medium">Confirmation…</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <button onClick={handleAccept}
                    className="btn btn-cta btn-lg w-full text-base">
                    C'est ma quête — je relève le défi !
                  </button>
                  <button onClick={handleReroll} disabled={rerolling}
                    className="btn btn-ghost btn-md w-full disabled:opacity-40">
                    {rerolling ? '…' : <><Icon name="Dices" size="sm" /> Proposer une autre quête</>}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tip */}
        {!accepted && quest && (
          <p className="text-center text-xs text-gray-600 mt-2">
            Tu peux proposer une autre quête une fois par jour · La quête change automatiquement chaque matin
          </p>
        )}

      </main>

      {showSafety && quest && (
        <SafetySheet quest={quest} onConfirm={doAccept} onClose={() => setShowSafety(false)} />
      )}
    </div>
  );
}
