'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { Navbar } from '@/components/Navbar';
import { Icon } from '@/components/Icons';
import type { EscalationPhase } from '@dopamode/shared';
import { questDisplayEmoji } from '@dopamode/shared';

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

const PHASE_LABEL: Record<EscalationPhase, { text: string; pill: string; emoji: string }> = {
  calibration: { text: 'Semaine de découverte', pill: 'pill-calibration', emoji: '🌱' },
  expansion:   { text: 'En mode exploration',   pill: 'pill-expansion',   emoji: '🧭' },
  rupture:     { text: 'Phase d\'intensité',    pill: 'pill-rupture',     emoji: '⚡' },
};

function weatherEmojiFromText(desc: string | null | undefined): string {
  const d = (desc ?? '').toLowerCase();
  if (d.includes('pluie') || d.includes('averses')) return '🌧️';
  if (d.includes('neige')) return '❄️';
  if (d.includes('orage')) return '⛈️';
  if (d.includes('brouillard')) return '🌫️';
  if (d.includes('nuage') || d.includes('couvert')) return '☁️';
  if (d.includes('soleil') || d.includes('clair')) return '☀️';
  return '🌤️';
}

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
      <div className="absolute inset-0 bg-slate-900/35 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md card rounded-3xl overflow-hidden shadow-xl">
        <div className="h-1 bg-gradient-to-r from-cyan-500 via-amber-400 to-orange-500" />
        <div className="p-7">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3"><Icon name="Shield" size="2xl" className="text-orange-500" /></div>
            <h3 className="font-display font-black text-xl text-[var(--text)] mb-1">🛡️ Avant de partir…</h3>
            <p className="text-sm text-[var(--muted)]">
              {quest.title} se passe en extérieur. Coche chaque point pour confirmer.
            </p>
          </div>
          <div className="space-y-2 mb-5">
            {rules.map((r, i) => (
              <button key={i} onClick={() => toggle(i)}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                style={{
                  background: checked.has(i) ? 'rgba(16,185,129,.1)' : 'rgba(15,23,42,.04)',
                  border: `1px solid ${checked.has(i) ? 'rgba(16,185,129,.35)' : 'rgba(15,23,42,.1)'}`,
                }}>
                <div className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center"
                  style={{ background: checked.has(i) ? '#10b981' : '#fff', border: `2px solid ${checked.has(i) ? '#10b981' : 'rgba(15,23,42,.2)'}` }}>
                  {checked.has(i) ? <Icon name="Check" size="xs" className="text-white" /> : null}
                </div>
                <span className={`text-sm ${checked.has(i) ? 'text-slate-800' : 'text-[var(--muted)]'}`}>{r}</span>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn btn-ghost btn-md flex-1">Pas aujourd'hui</button>
            <button onClick={() => ok && onConfirm()} disabled={!ok}
              className="btn btn-md flex-[2] text-white transition-all"
              style={{ background: ok ? 'linear-gradient(135deg,#f97316,#fbbf24)' : 'rgba(15,23,42,.08)', color: ok ? '#fff' : '#64748b', cursor: ok ? 'pointer' : 'not-allowed', boxShadow: ok ? '0 4px 20px rgba(249,115,22,.35)' : 'none' }}>
              <span className="flex items-center justify-center gap-2">C'est parti ! <Icon name="Map" size="sm" /></span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function AppPage() {
  const { user, isLoaded } = useUser();

  const [quest, setQuest] = useState<DailyQuest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [showSafety, setShowSafety] = useState(false);
  const [rerolling, setRerolling] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);

  // ── Ensure profile exists (get-or-create from onboarding localStorage) ───────

  const ensureProfile = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/profile', { method: 'GET' });
      if (res.ok) return true;
      if (res.status !== 404) return false;
      const explorer = typeof window !== 'undefined' ? localStorage.getItem('dopamode_explorer') : null;
      const risk = typeof window !== 'undefined' ? localStorage.getItem('dopamode_risk') : null;
      const createRes = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          explorerAxis: explorer === 'homebody' || explorer === 'explorer' ? explorer : undefined,
          riskAxis: risk === 'cautious' || risk === 'risktaker' ? risk : undefined,
        }),
      });
      return createRes.ok || createRes.status === 201;
    } catch {
      return false;
    }
  }, []);

  // ── Load daily quest ──────────────────────────────────────────────────────

  const loadQuest = useCallback(
    async (lat?: number, lon?: number, opts?: { silent?: boolean }): Promise<boolean> => {
      const silent = opts?.silent ?? false;
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const hasProfile = await ensureProfile();
        if (!hasProfile) {
          if (!silent) setError('Crée d\'abord ton profil via l\'onboarding.');
          return false;
        }
        const params = lat && lon ? `?lat=${lat}&lon=${lon}` : '';
        const res = await fetch(`/api/quest/daily${params}`);
        if (res.status === 404) {
          if (!silent) setError('Crée d\'abord ton profil via l\'onboarding.');
          return false;
        }
        if (!res.ok) throw new Error('Erreur serveur');
        const data = await res.json() as DailyQuest;
        setQuest(data);
        return true;
      } catch (e: unknown) {
        if (!silent) {
          const msg = e instanceof Error ? e.message : 'Erreur';
          setError(msg);
        }
        return false;
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [ensureProfile],
  );

  useEffect(() => {
    if (!isLoaded) return;
    let cancelled = false;
    (async () => {
      const ok = await loadQuest();
      if (cancelled || !ok) return;
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (cancelled) return;
          void loadQuest(pos.coords.latitude, pos.coords.longitude, { silent: true });
        },
        () => {},
        { maximumAge: 300_000, timeout: 2_500 },
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, loadQuest]);

  // ── Accept quest ──────────────────────────────────────────────────────────

  const doAccept = useCallback(async () => {
    if (!quest) return;
    setAccepting(true);
    setBannerError(null);
    try {
      const res = await fetch('/api/quest/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questDate: quest.questDate, safetyConsentGiven: quest.isOutdoor }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        setBannerError(err.error ?? 'Impossible d\'accepter la quête.');
        return;
      }
      const data = await res.json() as Partial<DailyQuest>;
      setQuest((prev) => (prev ? { ...prev, ...data, status: (data.status ?? prev.status) as DailyQuest['status'] } : null));
    } finally {
      setAccepting(false);
      setShowSafety(false);
    }
  }, [quest]);

  const doComplete = useCallback(async () => {
    if (!quest) return;
    setCompleting(true);
    setBannerError(null);
    try {
      const res = await fetch('/api/quest/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questDate: quest.questDate, action: 'complete' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        setBannerError(err.error ?? 'Impossible de valider la quête.');
        return;
      }
      const data = await res.json() as Partial<DailyQuest>;
      setQuest((prev) => (prev ? { ...prev, ...data, status: (data.status ?? 'completed') as DailyQuest['status'] } : null));
    } finally {
      setCompleting(false);
    }
  }, [quest]);

  const handleAccept = () => {
    if (quest?.isOutdoor) { setShowSafety(true); }
    else { doAccept(); }
  };

  // ── Reroll ────────────────────────────────────────────────────────────────

  const handleReroll = async () => {
    if (!quest || quest.status !== 'pending' || rerolling) return;
    setRerolling(true);
    try {
      const res = await fetch('/api/quest/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questDate: quest.questDate, action: 'reroll' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Erreur lors de la relance');
        return;
      }
      const geoParams = await new Promise<string>((resolve) => {
        navigator.geolocation?.getCurrentPosition(
          (pos) => resolve(`?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`),
          () => resolve(''),
          { timeout: 3000 },
        );
      });
      const reloadRes = await fetch(`/api/quest/daily${geoParams}`);
      if (reloadRes.ok) {
        const data = await reloadRes.json() as DailyQuest;
        setQuest(data);
      }
    } finally {
      setRerolling(false);
    }
  };

  // ── Phase label ───────────────────────────────────────────────────────────

  const phase = quest?.phase ?? 'calibration';
  const phaseInfo = PHASE_LABEL[phase];

  // ── Skeleton ──────────────────────────────────────────────────────────────

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-adventure">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 pt-24 pb-20">
          <div className="animate-pulse space-y-5 mt-4">
            <div className="h-5 bg-slate-200/90 rounded-xl w-40" />
            <div className="h-10 bg-slate-200/90 rounded-xl w-72" />
            <div className="h-80 bg-slate-200/80 rounded-3xl" />
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-adventure">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 pt-24 pb-20 flex flex-col items-center justify-center text-center gap-6">
          <Icon name="Frown" size="2xl" className="text-slate-500 mx-auto" />
          <h2 className="font-display font-black text-2xl text-[var(--text)]">Pas de quête pour l'instant</h2>
          <p className="text-[var(--muted)] max-w-md">{error}</p>
          {error.includes('onboarding') && (
            <a href="/onboarding" className="btn btn-primary btn-md">Créer mon profil →</a>
          )}
        </main>
      </div>
    );
  }

  const weatherLine = quest
    ? `${quest.context?.weatherDescription ?? quest.weather ?? 'Ciel variable'} · ${Math.round(quest.context?.temp ?? quest.weatherTemp ?? 18)}°C`
    : '';

  const questStatus = quest?.status;
  const isPending = questStatus === 'pending';
  const isAccepted = questStatus === 'accepted';
  const isCompleted = questStatus === 'completed';

  return (
    <div className="min-h-screen bg-adventure relative">
      <Navbar />

      {/* Décors « plateau » comme la landing */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden>
        <div className="absolute -top-16 left-1/2 w-[min(100rem,200%)] max-w-none -translate-x-1/2 h-[min(38vh,26rem)] rounded-[100%] bg-gradient-to-b from-cyan-200/25 via-orange-100/10 to-transparent blur-3xl motion-safe:animate-glow-soft opacity-70 motion-reduce:animate-none motion-reduce:opacity-45" />
        <div className="absolute top-28 left-[6%] text-5xl opacity-[0.22] select-none motion-safe:animate-float motion-reduce:animate-none">
          🧭
        </div>
        <div className="absolute top-32 right-[8%] text-[2.75rem] opacity-[0.2] select-none motion-safe:animate-float motion-reduce:animate-none [animation-delay:2s]">
          🎒
        </div>
        <div className="absolute top-[46%] left-[12%] text-4xl opacity-[0.18] select-none motion-safe:animate-float-delayed motion-reduce:animate-none">
          🎲
        </div>
        <div className="absolute bottom-24 right-[14%] text-5xl opacity-[0.2] select-none motion-safe:animate-float motion-reduce:animate-none [animation-delay:1s]">
          🗺️
        </div>
      </div>

      <main className="relative z-10 max-w-2xl mx-auto px-4 pt-24 pb-24">
        {bannerError && (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-red-200 bg-red-50/95 px-4 py-3 text-center text-sm font-semibold text-red-900 shadow-sm"
          >
            {bannerError}
            <button
              type="button"
              className="ml-2 underline decoration-red-400 underline-offset-2"
              onClick={() => setBannerError(null)}
            >
              OK
            </button>
          </div>
        )}

        {/* Bandeau joueur : une seule lecture, emojis comme la landing */}
        <section className="mb-8 mt-2 rounded-[1.75rem] border-2 border-orange-300/45 bg-gradient-to-br from-[#fffbeb] via-white/95 to-cyan-50/40 px-5 py-6 md:px-7 md:py-7 shadow-[0_10px_0_rgba(180,83,9,.1),0_22px_48px_rgba(249,115,22,.12)]">
          <p className="label mb-3 flex items-center gap-2 text-orange-900">
            <span aria-hidden>🎮</span> Carte du jour
          </p>
          <h1 className="font-display font-black text-2xl leading-[1.15] text-slate-900 sm:text-3xl md:text-[2.15rem]">
            Salut {user?.firstName ?? 'aventurier·e'} <span aria-hidden>👋</span>
            <br />
            <span className="text-gradient-pop text-[1.02em] md:text-[1.06em] tracking-[-0.02em]">
              Place à la quête du matin
            </span>{' '}
            <span aria-hidden className="text-[0.95em] not-italic">
              ⚔️
            </span>
          </h1>
          <p className="mt-3 text-sm font-semibold text-slate-600 md:text-base">
            🎯 Objectif : sortir du pilote automatique — mode aventure.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className={`${phaseInfo.pill} shadow-sm`}>
              <span aria-hidden>{phaseInfo.emoji}</span>
              {phaseInfo.text}
            </span>
            {(quest?.streak ?? 0) > 0 && (
              <span className="streak-badge text-xs shadow-sm">
                <span aria-hidden>🔥</span>
                {quest?.streak} jour{quest?.streak !== 1 ? 's' : ''}
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full border border-cyan-300/50 bg-white/90 px-3 py-1 text-xs font-black text-cyan-950 shadow-sm">
              <span aria-hidden>📍</span> Jour {quest?.day ?? 1}
            </span>
          </div>

          {quest && (quest.city || quest.weather) && (
            <p className="mt-5 border-t border-dashed border-orange-300/50 pt-4 text-sm font-medium text-slate-700">
              <span className="mr-1.5" aria-hidden>
                {weatherEmojiFromText(quest.context?.weatherDescription ?? quest.weather)}
              </span>
              {weatherLine}
              {quest.city && quest.city !== 'ta ville' && (
                <>
                  <span className="text-slate-400"> · </span>
                  <span className="font-bold text-cyan-900">📍 {quest.city}</span>
                </>
              )}
            </p>
          )}
        </section>

        {/* Carte quête — même ADN que QuestExamplesSlider (embedded) */}
        {quest && (
          <article
            className={`quest-slider-embedded relative overflow-hidden ring-1 transition-shadow duration-300 ${
              isAccepted || isCompleted
                ? 'ring-emerald-400/40 shadow-[0_12px_40px_-8px_rgba(16,185,129,.2)]'
                : 'ring-orange-400/25'
            }`}
          >
            <div
              className="absolute top-3 right-3 z-10 flex max-w-[min(100%,12rem)] items-center justify-end gap-1 rounded-xl border border-orange-200/80 bg-white/90 px-2.5 py-1 text-[11px] font-black text-orange-950 shadow-md sm:px-3"
              aria-label={
                isCompleted ? 'Quête terminée' : isAccepted ? 'Quête en cours' : 'Date du jour'
              }
            >
              {isCompleted ? (
                <>
                  <span aria-hidden>🏆</span> Terminée
                </>
              ) : isAccepted ? (
                <>
                  <span aria-hidden>✅</span> En cours
                </>
              ) : (
                <time dateTime={quest.questDate} className="capitalize">
                  {new Date(quest.questDate).toLocaleDateString('fr-FR', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </time>
              )}
            </div>

            <div className="px-4 pb-5 pt-10 sm:px-6 sm:pt-10">
              {/* Bloc 1 — mission : premier regard, plus gros que tout le reste */}
              <section
                className="mb-6 rounded-2xl border-2 border-cyan-400/55 bg-gradient-to-br from-white via-cyan-50/50 to-white p-5 shadow-[0_8px_28px_-6px_rgba(34,211,238,0.22)] ring-1 ring-cyan-200/70 sm:p-6"
                aria-labelledby="mission-heading"
              >
                <p
                  id="mission-heading"
                  className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-cyan-950"
                >
                  <span className="text-base leading-none" aria-hidden>
                    ⚡
                  </span>
                  Ta mission — quoi faire
                </p>
                <p className="font-display text-[1.15rem] font-black leading-[1.35] text-slate-900 sm:text-xl md:text-[1.35rem] md:leading-snug">
                  {quest.mission}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-cyan-200/60 pt-4">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-orange-300/70 bg-orange-100/95 px-3 py-1.5 text-xs font-black text-orange-950">
                    <span aria-hidden>⏱️</span>
                    {quest.duration}
                  </span>
                  {quest.isOutdoor && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-100/90 px-2.5 py-1 text-[11px] font-bold text-emerald-900">
                      🌿 Extérieur
                    </span>
                  )}
                </div>
              </section>

              {/* Bloc 2 — titre & contexte (secondaire) */}
              <div className="mb-5 flex items-start gap-3 border-b border-orange-200/40 pb-5">
                <span className="text-3xl leading-none select-none sm:text-4xl" aria-hidden>
                  {questDisplayEmoji(quest.emoji)}
                </span>
                <div className="min-w-0 flex-1 pr-8">
                  <p className="text-[10px] font-black uppercase tracking-widest text-orange-800/90">Nom de la carte</p>
                  <h2 className="font-display text-lg font-black leading-tight text-slate-800 sm:text-xl">
                    {quest.title}
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="rounded-full border border-slate-200/90 bg-white/90 px-2.5 py-0.5 font-semibold text-slate-600 shadow-sm">
                      {quest.archetypeName}
                    </span>
                  </div>
                </div>
              </div>

              <div className="quest-sticker mb-1 rounded-xl px-3.5 py-3 text-center text-sm font-semibold italic leading-relaxed text-[var(--text)]">
                « {quest.hook} »
              </div>

              {quest.safetyNote && isPending && (
                <div className="mt-5 flex items-start gap-2 rounded-2xl border border-amber-200/70 bg-amber-50/95 p-3.5 text-sm text-amber-950 shadow-sm">
                  <span aria-hidden className="text-lg leading-none">
                    ⚠️
                  </span>
                  <span>{quest.safetyNote}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t-2 border-orange-300/35 bg-gradient-to-r from-white/75 via-amber-50/50 to-cyan-50/40 px-4 py-4 sm:px-5">
              {isCompleted ? (
                <div className="text-center">
                  <p className="font-display text-lg font-black text-emerald-900">
                    🏆 Quête validée — belle perf, à demain !
                  </p>
                  <p className="mt-2 text-sm text-[var(--muted)]">Ta série et ton parcours sont à jour.</p>
                </div>
              ) : isAccepted ? (
                completing ? (
                  <div className="flex items-center justify-center gap-3 py-4">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                    <p className="font-bold text-emerald-900">Enregistrement…</p>
                  </div>
                ) : (
                  <>
                    <button type="button" onClick={doComplete} className="btn btn-primary btn-lg w-full text-base font-black">
                      ✅ J&apos;ai fait la quête — valider
                    </button>
                    <p className="text-center text-xs text-[var(--muted)]">
                      Quand c&apos;est fait dans la vraie vie, valide ici pour cocher ta mission.
                    </p>
                  </>
                )
              ) : accepting ? (
                <div className="flex items-center justify-center gap-3 py-4">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                  <p className="font-bold text-orange-900">Confirmation…</p>
                </div>
              ) : (
                <>
                  <button type="button" onClick={handleAccept} className="btn btn-cta btn-lg w-full text-base font-black">
                    ⚔️ Je relève le défi !
                  </button>
                  <button type="button" onClick={handleReroll} disabled={rerolling} className="btn btn-ghost btn-md w-full font-bold disabled:opacity-40">
                    {rerolling ? '…' : '🎲 Changer de quête (1× / jour)'}
                  </button>
                </>
              )}
            </div>
          </article>
        )}

        {isPending && quest && (
          <p className="mt-6 text-center text-xs font-medium text-[var(--muted)]">
            Demain matin : nouvelle carte sur ton plateau 🌅
          </p>
        )}
      </main>

      {showSafety && quest && (
        <SafetySheet quest={quest} onConfirm={doAccept} onClose={() => setShowSafety(false)} />
      )}
    </div>
  );
}
