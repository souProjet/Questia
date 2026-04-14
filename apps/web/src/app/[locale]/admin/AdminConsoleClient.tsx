'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { BADGE_DEFINITIONS, getThemeIds, TITLE_IDS } from '@questia/shared';
import type { OverviewJson } from './adminOverviewTypes';

const THEME_IDS = getThemeIds();

const PHASE_LIB: Record<string, string> = {
  calibration: 'Étalonnage',
  expansion: 'Expansion',
  rupture: 'Rupture',
};

const STATUT_QUETE_LIB: Record<string, string> = {
  pending: 'en attente',
  accepted: 'acceptée',
  completed: 'terminée',
  rejected: 'refusée',
  replaced: 'remplacée',
  abandoned: 'abandonnée',
};

const THEME_LIB: Record<string, string> = {
  default: 'Par défaut',
  midnight: 'Minuit',
  aurora: 'Aurore',
  parchment: 'Parchemin',
};

function libelleStatutQuete(s: string) {
  return STATUT_QUETE_LIB[s] ?? s;
}

function titreStatutQuete(s: string) {
  const t = libelleStatutQuete(s);
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : s;
}

function libellePhase(p: string) {
  return PHASE_LIB[p] ?? p;
}

const AXE_EXPL_FR: Record<string, string> = {
  homebody: 'Casanier',
  explorer: 'Explorateur',
};

const AXE_RISQUE_FR: Record<string, string> = {
  cautious: 'Prudent',
  risktaker: 'Audacieux',
};

const inputClass =
  'min-w-0 flex-1 rounded-xl border-2 border-[color:color-mix(in_srgb,var(--cyan)_42%,transparent)] bg-white px-3 py-2.5 text-sm font-semibold text-[var(--text)] shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/40';

type UserSearchHit = {
  clerkId: string;
  label: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  profileId: string | null;
  hasQuestiaProfile: boolean;
  role: string | null;
};

type GodFeedback = { tone: 'success' | 'error'; body: string };

export default function AdminConsoleClient() {
  const [data, setData] = useState<OverviewJson | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [godFeedback, setGodFeedback] = useState<GodFeedback | null>(null);
  const [godBusy, setGodBusy] = useState(false);

  const [targetClerkId, setTargetClerkId] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchHit[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchErr, setSearchErr] = useState<string | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);

  const [coinsAmount, setCoinsAmount] = useState('500');
  const [rerollDaily, setRerollDaily] = useState('1');
  const [rerollBonus, setRerollBonus] = useState('0');
  const [streakVal, setStreakVal] = useState('0');
  const [xpVal, setXpVal] = useState('0');
  const [dayVal, setDayVal] = useState('1');
  const [phaseVal, setPhaseVal] = useState<'calibration' | 'expansion' | 'rupture'>('expansion');
  const [congruenceVal, setCongruenceVal] = useState('0');
  const [xpBonusVal, setXpBonusVal] = useState('0');
  const [badgeGrantId, setBadgeGrantId] = useState<string>(BADGE_DEFINITIONS[0]?.id ?? 'premiere_quete');
  const [badgesJson, setBadgesJson] = useState('[]');
  const [themePick, setThemePick] = useState('default');
  const [explorerAxis, setExplorerAxis] = useState<'homebody' | 'explorer'>('explorer');
  const [riskAxis, setRiskAxis] = useState<'cautious' | 'risktaker'>('cautious');
  const [ownedTitlesCsv, setOwnedTitlesCsv] = useState('');
  const [equipTitle, setEquipTitle] = useState('');
  const [questStatusPick, setQuestStatusPick] = useState<
    'pending' | 'accepted' | 'completed' | 'rejected' | 'replaced' | 'abandoned'
  >('pending');
  const [remPush, setRemPush] = useState(false);
  const [remEmail, setRemEmail] = useState(false);
  const [remMin, setRemMin] = useState('540');
  const [remTz, setRemTz] = useState('Europe/Paris');
  const [manualPushTitle, setManualPushTitle] = useState('Questia');
  const [manualPushBody, setManualPushBody] = useState('');
  const [manualEmailSubject, setManualEmailSubject] = useState('');
  const [manualEmailText, setManualEmailText] = useState('');

  const [globalPushTitle, setGlobalPushTitle] = useState('Questia');
  const [globalPushBody, setGlobalPushBody] = useState('');
  const [globalEmailSubject, setGlobalEmailSubject] = useState('');
  const [globalEmailText, setGlobalEmailText] = useState('');
  const [globalBroadcastConfirm, setGlobalBroadcastConfirm] = useState(false);
  const [broadcastBusy, setBroadcastBusy] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState<string | null>(null);

  const textareaClass = `${inputClass} min-h-[88px] resize-y font-mono text-xs`;

  const targetPayload = useCallback(() => {
    const t = targetClerkId.trim();
    return t ? { targetClerkId: t } : {};
  }, [targetClerkId]);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      const t = targetClerkId.trim();
      if (t) qs.set('targetClerkId', t);
      const q = qs.toString();
      const res = await fetch(`/api/admin/overview${q ? `?${q}` : ''}`, { cache: 'no-store' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (res.status === 404 && t) {
          setTargetClerkId('');
          const res2 = await fetch('/api/admin/overview', { cache: 'no-store' });
          if (!res2.ok) {
            const j2 = await res2.json().catch(() => ({}));
            throw new Error((j2 as { error?: string }).error ?? `Réponse serveur ${res2.status}`);
          }
          setData(await res2.json());
          setErr(
            (j as { error?: string }).error ??
              'Cible invalide — retour sur ton compte admin.',
          );
          return;
        }
        throw new Error((j as { error?: string }).error ?? `Réponse serveur ${res.status}`);
      }
      setData(await res.json());
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [targetClerkId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(userSearchQuery.trim()), 380);
    return () => clearTimeout(t);
  }, [userSearchQuery]);

  useEffect(() => {
    if (debouncedSearch.length < 2) {
      setSearchResults([]);
      setSearchErr(null);
      setSearchLoading(false);
      return;
    }
    let cancelled = false;
    setSearchLoading(true);
    setSearchErr(null);
    void fetch(`/api/admin/users/search?q=${encodeURIComponent(debouncedSearch)}`, { cache: 'no-store' })
      .then(async (res) => {
        const j = (await res.json().catch(() => ({}))) as {
          error?: string;
          results?: UserSearchHit[];
        };
        if (!res.ok) throw new Error(j.error ?? `Réponse serveur ${res.status}`);
        if (!cancelled) setSearchResults(j.results ?? []);
      })
      .catch((e: unknown) => {
        if (!cancelled) setSearchErr(e instanceof Error ? e.message : 'Erreur');
      })
      .finally(() => {
        if (!cancelled) setSearchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch]);

  useEffect(() => {
    if (!data) return;
    const s = data.snapshot;
    setStreakVal(String(s.streak));
    setXpVal(String(s.totalXp));
    setDayVal(String(s.currentDay));
    setPhaseVal(s.phase as typeof phaseVal);
    setRerollDaily(String(s.rerollsDaily));
    setRerollBonus(String(s.rerollsBonus));
    setCongruenceVal(String(s.congruenceDelta));
    setXpBonusVal(String(s.xpBonusCharges));
    setExplorerAxis(s.explorerAxis === 'homebody' ? 'homebody' : 'explorer');
    setRiskAxis(s.riskAxis === 'risktaker' ? 'risktaker' : 'cautious');
    setRemPush(s.reminderPushEnabled);
    setRemEmail(s.reminderEmailEnabled);
    setRemMin(String(s.reminderTimeMinutes));
    setRemTz(s.reminderTimezone);
  }, [data]);

  const loadProfilePreview = async () => {
    setProfilePreview(null);
    try {
      const q = targetClerkId.trim();
      const url = q ? `/api/admin/profile?clerkId=${encodeURIComponent(q)}` : '/api/admin/profile';
      const res = await fetch(url, { cache: 'no-store' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((j as { error?: string }).error ?? `Réponse serveur ${res.status}`);
      setProfilePreview(JSON.stringify(j, null, 2));
    } catch (e) {
      setProfilePreview(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const broadcastGlobal = async (kind: 'push' | 'email') => {
    if (!globalBroadcastConfirm) {
      setBroadcastMsg('Coche la case de confirmation avant d’envoyer à tout le monde.');
      return;
    }
    setBroadcastBusy(true);
    setBroadcastMsg(null);
    try {
      const payload =
        kind === 'push'
          ? {
              kind: 'push' as const,
              confirm: true,
              pushTitle: globalPushTitle.trim(),
              pushBody: globalPushBody.trim(),
            }
          : {
              kind: 'email' as const,
              confirm: true,
              emailSubject: globalEmailSubject.trim(),
              emailText: globalEmailText.trim(),
            };
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((j as { error?: string }).error ?? `Réponse serveur ${res.status}`);
      setBroadcastMsg(JSON.stringify(j, null, 2));
    } catch (e) {
      setBroadcastMsg(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBroadcastBusy(false);
    }
  };

  const god = async (body: Record<string, unknown>) => {
    setGodBusy(true);
    setGodFeedback(null);
    try {
      const res = await fetch('/api/admin/godmode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...targetPayload(), ...body }),
      });
      const raw = await res.text();
      let j: unknown = {};
      try {
        j = raw ? JSON.parse(raw) : {};
      } catch {
        j = { _raw: raw.slice(0, 500) };
      }
      if (!res.ok) {
        const errMsg =
          typeof (j as { error?: string }).error === 'string'
            ? (j as { error: string }).error
            : `Réponse serveur ${res.status}`;
        setGodFeedback({ tone: 'error', body: errMsg });
        return;
      }
      setGodFeedback({
        tone: 'success',
        body: JSON.stringify(j, null, 2),
      });
      await load();
    } catch (e) {
      setGodFeedback({ tone: 'error', body: e instanceof Error ? e.message : 'Erreur' });
    } finally {
      setGodBusy(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-[1.75rem] border-2 border-orange-200/60 bg-white/80 px-6 py-16 shadow-inner">
        <div
          className="h-12 w-12 animate-spin rounded-full border-[3px] border-cyan-200 border-t-cyan-500"
          role="status"
          aria-label="Chargement"
        />
        <p className="text-sm font-bold text-[var(--muted)]">Chargement des métriques…</p>
      </div>
    );
  }

  if (err && !data) {
    return (
      <div className="rounded-[1.75rem] border-2 border-red-200/80 bg-gradient-to-br from-red-50 to-amber-50/50 px-6 py-8 shadow-inner">
        <p className="font-display text-lg font-black text-red-900">Impossible de charger la console</p>
        <p className="mt-2 text-sm font-semibold text-red-800/90">{err}</p>
      </div>
    );
  }

  const d = data!;
  const phasePillClass =
    d.snapshot.phase === 'calibration'
      ? 'pill-calibration'
      : d.snapshot.phase === 'rupture'
        ? 'pill-rupture'
        : 'pill-expansion';
  const focusTitle =
    d.snapshotScope === 'target' && d.snapshotLabel
      ? d.snapshotLabel
      : 'Toi (compte admin)';
  const focusSubtitle =
    d.snapshotScope === 'target'
      ? 'Les chiffres ci-dessous et le mode intervention en dessous concernent ce joueur.'
      : 'Les chiffres ci-dessous et le mode intervention en dessous concernent ton compte administrateur.';

  return (
    <div className="space-y-8">
      <div
        className={`rounded-[1.75rem] border-2 px-5 py-4 sm:px-6 sm:py-5 ${
          d.snapshotScope === 'target'
            ? 'border-amber-400/90 bg-gradient-to-br from-amber-50 via-[#fffbeb] to-orange-50/90 shadow-[0_6px_24px_-8px_rgba(245,158,11,0.35)]'
            : 'border-cyan-300/55 bg-gradient-to-br from-cyan-50/80 via-white to-white'
        }`}
      >
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--muted)]">
          ① · Compte concerné (état du jeu et interventions)
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-display text-xl font-black text-[var(--on-cream)] sm:text-2xl">{focusTitle}</p>
            <p className="mt-1 max-w-2xl text-sm font-semibold text-[var(--on-cream-muted)]">{focusSubtitle}</p>
            <p className="mt-2 text-xs font-mono font-semibold text-[var(--on-cream-subtle)]">
              Toi connecté (admin) : {d.adminClerkIdSuffix}
              {d.snapshotScope === 'target' && d.snapshotClerkSuffix ? (
                <> · profil affiché : {d.snapshotClerkSuffix}</>
              ) : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {targetClerkId ? (
              <button
                type="button"
                className="btn btn-ghost btn-sm font-black"
                onClick={() => {
                  setTargetClerkId('');
                  setProfilePreview(null);
                }}
              >
                Revenir sur mon compte
              </button>
            ) : null}
            <button type="button" className="btn btn-cta btn-sm font-black" onClick={() => void loadProfilePreview()}>
              Données techniques brutes
            </button>
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-[1.75rem] border-2 border-violet-300/50 bg-gradient-to-br from-violet-50/70 via-white to-fuchsia-50/30 p-6 shadow-[0_12px_40px_-16px_rgba(139,92,246,0.25)] sm:p-7">
        <h2 className="font-display text-lg font-black text-[var(--on-cream)]">② · Changer de joueur</h2>
        <p className="mt-1 text-xs font-semibold leading-relaxed text-[var(--on-cream-muted)]">
          Saisis un prénom, un nom, un pseudo ou une partie d'e-mail : la recherche interroge le service qui héberge les
          comptes joueurs. Dès qu'un joueur est choisi, les blocs « État du jeu » et « Mode intervention » affichent{' '}
          <strong className="text-[var(--on-cream)]">ses</strong> données.
        </p>

        <div className="mt-5">
          <label className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--muted)]" htmlFor="admin-user-search">
            Recherche
          </label>
          <div className="relative mt-2">
            <span
              className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 select-none text-[1.15rem] opacity-55"
              aria-hidden
            >
              🔍
            </span>
            <input
              id="admin-user-search"
              className="w-full rounded-2xl border-2 border-[color:color-mix(in_srgb,var(--violet)_40%,transparent)] bg-white py-3.5 pl-12 pr-4 text-sm font-semibold text-[var(--text)] shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)] ring-1 ring-violet-100/90 transition placeholder:font-medium placeholder:text-[var(--muted)] focus:border-violet-400/80 focus:outline-none focus:ring-2 focus:ring-violet-400/35"
              placeholder="Au moins 2 caractères…"
              value={userSearchQuery}
              onChange={(e) => {
                setUserSearchQuery(e.target.value);
                setSearchErr(null);
              }}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Rechercher un joueur"
            />
          </div>
          {searchLoading ? (
            <p className="mt-3 flex items-center gap-2 text-xs font-bold text-violet-800/90">
              <span
                className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600"
                aria-hidden
              />
              Recherche en cours…
            </p>
          ) : null}
          {searchErr ? (
            <p className="mt-3 rounded-xl border border-red-200/90 bg-red-50/95 px-3 py-2 text-xs font-bold text-red-900">
              {searchErr}
            </p>
          ) : null}
          {debouncedSearch.length >= 2 && !searchLoading && searchResults.length === 0 && !searchErr ? (
            <p className="mt-3 text-xs font-semibold text-[var(--muted)]">Aucun compte ne correspond.</p>
          ) : null}
          {userSearchQuery.trim().length > 0 && userSearchQuery.trim().length < 2 ? (
            <p className="mt-2 text-[11px] font-semibold text-[var(--on-cream-subtle)]">
              Encore {2 - userSearchQuery.trim().length} caractère{userSearchQuery.trim().length === 1 ? '' : 's'} pour
              lancer la recherche.
            </p>
          ) : null}
          {searchResults.length > 0 ? (
            <ul className="mt-4 max-h-52 divide-y divide-violet-100 overflow-y-auto rounded-2xl border-2 border-violet-200/80 bg-white shadow-inner">
              {searchResults.map((h) => (
                <li key={h.clerkId}>
                  <button
                    type="button"
                    className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold text-[var(--text)] transition hover:bg-violet-50/95 active:bg-violet-100/80"
                    onClick={() => {
                      if (!h.hasQuestiaProfile) {
                        setSearchErr(
                          "Aucun profil Questia pour ce compte — le joueur doit ouvrir l'application au moins une fois.",
                        );
                        return;
                      }
                      setSearchErr(null);
                      setTargetClerkId(h.clerkId);
                      setProfilePreview(null);
                    }}
                  >
                    <span className="font-bold">{h.label}</span>
                    <span className="text-[11px] font-bold text-[var(--muted)]">
                      {h.username ? `@${h.username}` : '—'}
                      {h.hasQuestiaProfile ? ' · compte Questia' : ' · sans profil'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {profilePreview ? (
          <pre className="mt-4 max-h-56 overflow-auto rounded-2xl border border-violet-200/80 bg-white/95 p-4 font-mono text-[11px] font-semibold text-violet-950 shadow-inner">
            {profilePreview}
          </pre>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-[1.75rem] border-2 border-orange-300/40 bg-gradient-to-br from-[#fffbeb] via-white to-amber-50/30 p-6 shadow-sm sm:p-7">
        <h2 className="font-display text-lg font-black text-[var(--on-cream)]">③ · État du jeu (temps réel)</h2>
        <p className="mt-1 text-xs font-semibold text-[var(--on-cream-muted)]">
          Ces valeurs viennent de la base pour le profil du bandeau — ce sont celles que le mode intervention modifiera
          en dessous.
        </p>
        <div className="mt-4 space-y-3 rounded-2xl border border-orange-200/70 bg-white/90 p-5 text-sm font-semibold text-[var(--on-cream)] shadow-sm">
          <div className="flex flex-wrap gap-2">
            <span className="pill-indoor font-mono text-[11px]">
              Compte {d.snapshotScope === 'target' && d.snapshotClerkSuffix ? d.snapshotClerkSuffix : d.adminClerkIdSuffix}
            </span>
            <span className="pill-indoor font-mono text-[11px]">Identifiant {d.snapshot.profileId}</span>
            <span className="pill-indoor text-[11px]">
              {AXE_EXPL_FR[d.snapshot.explorerAxis] ?? d.snapshot.explorerAxis} ·{' '}
              {AXE_RISQUE_FR[d.snapshot.riskAxis] ?? d.snapshot.riskAxis}
            </span>
          </div>
          <p className="leading-relaxed text-[var(--on-cream-muted)]">
            Jour <strong className="text-[var(--on-cream)]">{d.snapshot.currentDay}</strong> ·{' '}
            <span className={phasePillClass}>{libellePhase(d.snapshot.phase)}</span> · δ {d.snapshot.congruenceDelta} ·{' '}
            <strong className="text-[var(--on-cream)]">{d.snapshot.totalXp}</strong> XP · charges bonus{' '}
            {d.snapshot.xpBonusCharges} · série{' '}
            <strong className="text-[var(--on-cream)]">{d.snapshot.streak}</strong> ·{' '}
            <strong className="text-[var(--on-cream)]">{d.snapshot.coins}</strong> QC · relances{' '}
            {d.snapshot.rerollsDaily}+{d.snapshot.rerollsBonus} · thème{' '}
            <span className="font-mono text-xs">{THEME_LIB[d.snapshot.activeThemeId] ?? d.snapshot.activeThemeId}</span>
          </p>
          <p className="text-xs font-bold text-amber-900/90">
            Raffinement v{d.snapshot.refinementSchemaVersion} · rappel notification{' '}
            {d.snapshot.reminderPushEnabled ? 'activé' : 'désactivé'} · courriel{' '}
            {d.snapshot.reminderEmailEnabled ? 'activé' : 'désactivé'} · {d.snapshot.reminderTimeMinutes} min ·{' '}
            {d.snapshot.reminderTimezone}
          </p>
          <p className="text-xs font-bold text-amber-900/90">
            Indicateurs : après relance {d.snapshot.flags.nextAfterReroll ? 'oui' : 'non'} · quête instantanée suivante{' '}
            {d.snapshot.flags.nextInstantOnly ? 'oui' : 'non'} · report social le{' '}
            {d.snapshot.flags.deferredSocialUntil ?? '—'}
          </p>
          <p className="border-t border-dashed border-orange-200/80 pt-3 text-[var(--on-cream-muted)]">
            Quête du jour :{' '}
            {d.snapshot.questToday ? (
              <>
                <span className="font-black text-[var(--on-cream)]">
                  {libelleStatutQuete(d.snapshot.questToday.status)}
                </span>{' '}
                · archétype {d.snapshot.questToday.archetypeId}
                {d.snapshot.questToday.wasRerolled ? ' · relancée' : ''}
              </>
            ) : (
              <span className="italic">
                aucune ligne — ouvrir l'application sur ce compte pour générer la quête du jour
              </span>
            )}
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.75rem] border-2 border-orange-300/45 bg-gradient-to-br from-white via-amber-50/40 to-cyan-50/40 p-6 shadow-[0_8px_28px_-6px_rgba(249,115,22,0.12)] sm:p-7">
        <h2 className="font-display text-lg font-black text-gradient-pop">④ · Mode intervention</h2>
        <p className="mt-2 text-sm font-semibold text-[var(--on-cream-muted)]">
          Actions sur le compte « {focusTitle} » (même que le bandeau et l'état du jeu). Pour les cas limites, utilise
          l'interface graphique Prisma.
        </p>

        {(godBusy || godFeedback) && (
          <output
            aria-live="polite"
            className={`mt-4 block rounded-2xl border-2 p-4 text-sm shadow-inner ${
              godBusy
                ? 'border-cyan-300/70 bg-cyan-50/90 text-cyan-950'
                : godFeedback?.tone === 'error'
                  ? 'border-red-400/80 bg-red-50/95 text-red-950'
                  : 'border-emerald-400/80 bg-emerald-50/95 text-emerald-950'
            }`}
          >
            {godBusy ? (
              <p className="font-black">Exécution en cours…</p>
            ) : godFeedback ? (
              <>
                <p className="font-display text-xs font-black uppercase tracking-wide text-[var(--muted)]">
                  {godFeedback.tone === 'success' ? 'Succès' : 'Erreur'}
                </p>
                <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words font-mono text-xs font-semibold">
                  {godFeedback.body}
                </pre>
              </>
            ) : null}
          </output>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={godBusy}
            onClick={() => void god({ action: 'reset_quest_flags' })}
            className="btn btn-ghost btn-md font-black"
          >
            Réinitialiser les indicateurs de quête
          </button>
          <button
            type="button"
            disabled={godBusy}
            onClick={() => void god({ action: 'delete_today_quest' })}
            className="btn btn-ghost btn-md font-black"
          >
            Supprimer la quête du jour
          </button>
          <button
            type="button"
            disabled={godBusy}
            onClick={() => void god({ action: 'reset_last_quest_date' })}
            className="btn btn-ghost btn-md font-black"
          >
            Effacer la date de dernière quête
          </button>
          <button
            type="button"
            disabled={godBusy}
            onClick={() => void god({ action: 'reset_refinement' })}
            className="btn btn-ghost btn-md font-black"
          >
            Réinitialiser le questionnaire de raffinement
          </button>
          <button
            type="button"
            disabled={godBusy}
            onClick={() => void god({ action: 'reset_badges' })}
            className="btn btn-ghost btn-md font-black"
          >
            Réinitialiser les insignes
          </button>
          <button
            type="button"
            disabled={godBusy}
            onClick={() => void god({ action: 'reset_reminder_dates' })}
            className="btn btn-ghost btn-md font-black"
          >
            Effacer les dates de derniers rappels
          </button>
        </div>

        {d.snapshotScope === 'self' ? (
          <div className="mt-8 rounded-2xl border-2 border-red-300/50 bg-gradient-to-br from-red-50/90 via-white to-amber-50/50 p-4 sm:p-5">
            <h3 className="font-display text-base font-black text-red-900">Diffusion globale (tous les comptes)</h3>
            <p className="mt-1 text-xs font-semibold text-red-900/80">
              Push : chaque jeton Expo distinct en base (~{d.pushDevicesCount} appareils). E-mail : une lettre par
              adresse Clerk unique pour chaque profil (~{d.totalProfiles} profils). Peut prendre du temps ; prévoir
              limites Vercel / Resend / Clerk sur les gros volumes.
            </p>
            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-red-200/80 bg-white/80 p-3 text-sm font-bold text-red-950">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 shrink-0 accent-red-600"
                checked={globalBroadcastConfirm}
                onChange={(e) => setGlobalBroadcastConfirm(e.target.checked)}
              />
              <span>
                Je confirme vouloir envoyer ce message à <strong>tous les utilisateurs</strong> Questia (action
                irréversible pour les destinataires).
              </span>
            </label>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="space-y-2 rounded-xl border border-cyan-200/60 bg-white/90 p-3">
                <p className="text-xs font-black uppercase tracking-wide text-cyan-900/80">Push — tous les appareils</p>
                <label className="block text-xs font-bold text-[var(--on-cream-muted)]">
                  Titre
                  <input
                    className={`${inputClass} mt-1 w-full`}
                    value={globalPushTitle}
                    onChange={(e) => setGlobalPushTitle(e.target.value)}
                    maxLength={100}
                  />
                </label>
                <label className="block text-xs font-bold text-[var(--on-cream-muted)]">
                  Corps
                  <textarea
                    className={`${textareaClass} mt-1 w-full`}
                    value={globalPushBody}
                    onChange={(e) => setGlobalPushBody(e.target.value)}
                    maxLength={280}
                    rows={3}
                  />
                </label>
                <button
                  type="button"
                  disabled={broadcastBusy || godBusy}
                  onClick={() => void broadcastGlobal('push')}
                  className="btn btn-md w-full border-2 border-red-400/70 bg-red-600 font-black text-white hover:bg-red-700"
                >
                  Diffuser le push à tout le monde
                </button>
              </div>
              <div className="space-y-2 rounded-xl border border-amber-200/60 bg-white/90 p-3">
                <p className="text-xs font-black uppercase tracking-wide text-amber-900/80">E-mail — toutes les adresses</p>
                <label className="block text-xs font-bold text-[var(--on-cream-muted)]">
                  Objet
                  <input
                    className={`${inputClass} mt-1 w-full`}
                    value={globalEmailSubject}
                    onChange={(e) => setGlobalEmailSubject(e.target.value)}
                    maxLength={200}
                  />
                </label>
                <label className="block text-xs font-bold text-[var(--on-cream-muted)]">
                  Corps (texte)
                  <textarea
                    className={`${textareaClass} mt-1 w-full`}
                    value={globalEmailText}
                    onChange={(e) => setGlobalEmailText(e.target.value)}
                    maxLength={20000}
                    rows={6}
                  />
                </label>
                <button
                  type="button"
                  disabled={broadcastBusy || godBusy}
                  onClick={() => void broadcastGlobal('email')}
                  className="btn btn-md w-full border-2 border-red-400/70 bg-red-600 font-black text-white hover:bg-red-700"
                >
                  Diffuser l’e-mail à tout le monde
                </button>
              </div>
            </div>
            {broadcastMsg ? (
              <pre className="mt-4 max-h-48 overflow-auto rounded-xl border border-red-200/60 bg-black/5 p-3 text-xs font-mono text-red-950">
                {broadcastMsg}
              </pre>
            ) : null}
          </div>
        ) : null}

        {d.snapshotScope === 'target' || d.snapshotScope === 'self' ? (
          <div className="mt-8 rounded-2xl border-2 border-dashed border-cyan-400/40 bg-white/70 p-4 sm:p-5">
            <h3 className="font-display text-base font-black text-[var(--on-cream)]">
              {d.snapshotScope === 'target' ? 'Message personnalisé au joueur' : 'Message personnalisé (test sur toi)'}
            </h3>
            <p className="mt-1 text-xs font-semibold text-[var(--on-cream-muted)]">
              {d.snapshotScope === 'target' ? (
                <>
                  Prise de compte : <strong className="text-[var(--on-cream)]">{focusTitle}</strong>. Push = appareils
                  enregistrés pour ce profil ; e-mail = adresse Clerk via Resend.
                </>
              ) : (
                <>
                  Tu es sur <strong className="text-[var(--on-cream)]">ton compte admin</strong> : tu peux t’envoyer un
                  push / un e-mail pour tester, sans sélectionner un autre joueur.
                </>
              )}
            </p>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="space-y-2 rounded-xl border border-cyan-200/60 bg-cyan-50/30 p-3">
                <p className="text-xs font-black uppercase tracking-wide text-cyan-900/80">Notification push</p>
                <label className="block text-xs font-bold text-[var(--on-cream-muted)]">
                  Titre
                  <input
                    className={`${inputClass} mt-1 w-full`}
                    value={manualPushTitle}
                    onChange={(e) => setManualPushTitle(e.target.value)}
                    maxLength={100}
                  />
                </label>
                <label className="block text-xs font-bold text-[var(--on-cream-muted)]">
                  Corps
                  <textarea
                    className={`${textareaClass} mt-1 w-full`}
                    value={manualPushBody}
                    onChange={(e) => setManualPushBody(e.target.value)}
                    maxLength={280}
                    rows={3}
                    placeholder="Message affiché sur le téléphone…"
                  />
                </label>
                <button
                  type="button"
                  disabled={godBusy}
                  onClick={() =>
                    void god({
                      action: 'send_manual_push',
                      pushTitle: manualPushTitle.trim(),
                      pushBody: manualPushBody.trim(),
                    })
                  }
                  className="btn btn-primary btn-md w-full font-black"
                >
                  Envoyer le push
                </button>
              </div>
              <div className="space-y-2 rounded-xl border border-amber-200/60 bg-amber-50/30 p-3">
                <p className="text-xs font-black uppercase tracking-wide text-amber-900/80">Courriel</p>
                <label className="block text-xs font-bold text-[var(--on-cream-muted)]">
                  Objet
                  <input
                    className={`${inputClass} mt-1 w-full`}
                    value={manualEmailSubject}
                    onChange={(e) => setManualEmailSubject(e.target.value)}
                    maxLength={200}
                  />
                </label>
                <label className="block text-xs font-bold text-[var(--on-cream-muted)]">
                  Corps (texte — retours à la ligne conservés)
                  <textarea
                    className={`${textareaClass} mt-1 w-full`}
                    value={manualEmailText}
                    onChange={(e) => setManualEmailText(e.target.value)}
                    maxLength={20000}
                    rows={6}
                    placeholder="Message au joueur…"
                  />
                </label>
                <button
                  type="button"
                  disabled={godBusy}
                  onClick={() =>
                    void god({
                      action: 'send_manual_email',
                      emailSubject: manualEmailSubject.trim(),
                      emailText: manualEmailText.trim(),
                    })
                  }
                  className="btn btn-primary btn-md w-full font-black"
                >
                  Envoyer l’e-mail
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <GodField label="Créditer des pièces (QC)">
            <input className={inputClass} value={coinsAmount} onChange={(e) => setCoinsAmount(e.target.value)} inputMode="numeric" />
            <button
              type="button"
              disabled={godBusy}
              onClick={() => void god({ action: 'grant_coins', amount: Number(coinsAmount) })}
              className="btn btn-primary btn-md shrink-0 font-black"
            >
              Appliquer
            </button>
          </GodField>
          <GodField label="Relances (jour / bonus)">
            <input
              className={`${inputClass} w-16 !flex-none`}
              value={rerollDaily}
              onChange={(e) => setRerollDaily(e.target.value)}
              aria-label="Relances du jour"
            />
            <input
              className={`${inputClass} w-16 !flex-none`}
              value={rerollBonus}
              onChange={(e) => setRerollBonus(e.target.value)}
              aria-label="Relances bonus"
            />
            <button
              type="button"
              disabled={godBusy}
              onClick={() =>
                void god({
                  action: 'set_rerolls',
                  daily: Number(rerollDaily),
                  bonus: Number(rerollBonus),
                })
              }
              className="btn btn-primary btn-md shrink-0 font-black"
            >
              Appliquer
            </button>
          </GodField>
          <GodField label="Série">
            <input className={inputClass} value={streakVal} onChange={(e) => setStreakVal(e.target.value)} inputMode="numeric" />
            <button
              type="button"
              disabled={godBusy}
              onClick={() => void god({ action: 'set_streak', streak: Number(streakVal) })}
              className="btn btn-primary btn-md shrink-0 font-black"
            >
              Appliquer
            </button>
          </GodField>
          <GodField label="XP total">
            <input className={inputClass} value={xpVal} onChange={(e) => setXpVal(e.target.value)} inputMode="numeric" />
            <button
              type="button"
              disabled={godBusy}
              onClick={() => void god({ action: 'set_total_xp', totalXp: Number(xpVal) })}
              className="btn btn-primary btn-md shrink-0 font-black"
            >
              Appliquer
            </button>
          </GodField>
          <GodField label="Charges XP bonus">
            <input className={inputClass} value={xpBonusVal} onChange={(e) => setXpBonusVal(e.target.value)} inputMode="numeric" />
            <button
              type="button"
              disabled={godBusy}
              onClick={() => void god({ action: 'set_xp_bonus_charges', xpBonusCharges: Number(xpBonusVal) })}
              className="btn btn-primary btn-md shrink-0 font-black"
            >
              Appliquer
            </button>
          </GodField>
          <GodField label="Congruence δ">
            <input
              className={inputClass}
              value={congruenceVal}
              onChange={(e) => setCongruenceVal(e.target.value)}
              inputMode="decimal"
            />
            <button
              type="button"
              disabled={godBusy}
              onClick={() => void god({ action: 'set_congruence_delta', congruenceDelta: Number(congruenceVal) })}
              className="btn btn-primary btn-md shrink-0 font-black"
            >
              Appliquer
            </button>
          </GodField>
          <div className="sm:col-span-2">
            <GodField label="Jour / phase">
              <input
                className={`${inputClass} w-20 !flex-none`}
                value={dayVal}
                onChange={(e) => setDayVal(e.target.value)}
                inputMode="numeric"
              />
              <select
                className={`${inputClass} !w-auto`}
                value={phaseVal}
                onChange={(e) => setPhaseVal(e.target.value as typeof phaseVal)}
              >
                <option value="calibration">{PHASE_LIB.calibration}</option>
                <option value="expansion">{PHASE_LIB.expansion}</option>
                <option value="rupture">{PHASE_LIB.rupture}</option>
              </select>
              <button
                type="button"
                disabled={godBusy}
                onClick={() =>
                  void god({
                    action: 'set_phase_day',
                    currentDay: Number(dayVal),
                    currentPhase: phaseVal,
                  })
                }
                className="btn btn-cta btn-md shrink-0 font-black"
              >
                Appliquer
              </button>
            </GodField>
          </div>
          <div className="sm:col-span-2">
            <GodField label="Axes explorateur / risque">
              <select
                className={`${inputClass} !w-auto`}
                value={explorerAxis}
                onChange={(e) => setExplorerAxis(e.target.value as 'homebody' | 'explorer')}
              >
                <option value="homebody">{AXE_EXPL_FR.homebody}</option>
                <option value="explorer">{AXE_EXPL_FR.explorer}</option>
              </select>
              <select
                className={`${inputClass} !w-auto`}
                value={riskAxis}
                onChange={(e) => setRiskAxis(e.target.value as 'cautious' | 'risktaker')}
              >
                <option value="cautious">{AXE_RISQUE_FR.cautious}</option>
                <option value="risktaker">{AXE_RISQUE_FR.risktaker}</option>
              </select>
              <button
                type="button"
                disabled={godBusy}
                onClick={() => void god({ action: 'set_explorer_risk', explorerAxis, riskAxis })}
                className="btn btn-primary btn-md shrink-0 font-black"
              >
                Appliquer
              </button>
            </GodField>
          </div>
        </div>

        <h3 className="mt-10 font-display text-sm font-black uppercase tracking-[0.12em] text-[var(--muted)]">Insignes</h3>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            className={`${inputClass} !w-auto max-w-[min(100%,20rem)]`}
            value={badgeGrantId}
            onChange={(e) => setBadgeGrantId(e.target.value)}
          >
            {BADGE_DEFINITIONS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={godBusy}
            onClick={() => void god({ action: 'grant_badge', badgeId: badgeGrantId })}
            className="btn btn-primary btn-md font-black"
          >
            Attribuer l'insigne
          </button>
        </div>
        <div className="mt-4">
          <label className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
            Tableau d'insignes (saisie avancée, format structuré)
          </label>
          <textarea
            className="mt-2 min-h-[88px] w-full rounded-2xl border border-orange-200/80 bg-white p-3 font-mono text-xs font-semibold text-[var(--text)]"
            value={badgesJson}
            onChange={(e) => setBadgesJson(e.target.value)}
          />
          <button
            type="button"
            disabled={godBusy}
            className="btn btn-ghost btn-sm mt-2 font-black"
            onClick={() => {
              try {
                const parsed = JSON.parse(badgesJson) as unknown;
                void god({ action: 'set_badges_json', badgesJson: parsed });
              } catch {
                setGodFeedback({ tone: 'error', body: 'Format de données invalide pour les insignes.' });
              }
            }}
          >
            Appliquer le tableau
          </button>
        </div>

        <h3 className="mt-10 font-display text-sm font-black uppercase tracking-[0.12em] text-[var(--muted)]">Thèmes</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <select className={`${inputClass} !w-auto`} value={themePick} onChange={(e) => setThemePick(e.target.value)}>
            {THEME_IDS.map((t) => (
              <option key={t} value={t}>
                {THEME_LIB[t] ?? t}
              </option>
            ))}
          </select>
          <button type="button" disabled={godBusy} onClick={() => void god({ action: 'set_active_theme', themeId: themePick })} className="btn btn-primary btn-md font-black">
            Actif + possédé
          </button>
          <button type="button" disabled={godBusy} onClick={() => void god({ action: 'add_owned_theme', themeId: themePick })} className="btn btn-ghost btn-md font-black">
            + possédé
          </button>
        </div>
        <p className="mt-3 text-xs font-semibold text-[var(--on-cream-muted)]">
          Possédés complets :{' '}
          <button
            type="button"
            className="underline"
            disabled={godBusy}
            onClick={() => void god({ action: 'set_owned_themes', ownedThemes: [...THEME_IDS] })}
          >
            tout débloquer
          </button>
        </p>

        <h3 className="mt-10 font-display text-sm font-black uppercase tracking-[0.12em] text-[var(--muted)]">Titres boutique</h3>
        <GodField label="Identifiants de titres (séparés par des virgules)">
          <input
            className={inputClass}
            placeholder="ex. titre_1, titre_2"
            value={ownedTitlesCsv}
            onChange={(e) => setOwnedTitlesCsv(e.target.value)}
          />
          <button
            type="button"
            disabled={godBusy}
            onClick={() => {
              const ids = ownedTitlesCsv
                .split(/[,\s]+/)
                .map((s) => s.trim())
                .filter(Boolean);
              void god({ action: 'set_owned_titles', ownedTitleIds: ids });
            }}
            className="btn btn-primary btn-md shrink-0 font-black"
          >
            Enregistrer les titres possédés
          </button>
        </GodField>
        <p className="mt-1 text-[11px] text-[var(--muted)]">
          Identifiants reconnus (extrait) : {TITLE_IDS.slice(0, 6).join(', ')}…
        </p>
        <GodField label="Titre affiché">
          <select className={`${inputClass} !w-auto`} value={equipTitle} onChange={(e) => setEquipTitle(e.target.value)}>
            <option value="">(aucun)</option>
            {TITLE_IDS.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={godBusy}
            onClick={() => void god({ action: 'set_equipped_title', equippedTitleId: equipTitle || null })}
            className="btn btn-primary btn-md shrink-0 font-black"
          >
            Appliquer
          </button>
        </GodField>

        <h3 className="mt-10 font-display text-sm font-black uppercase tracking-[0.12em] text-[var(--muted)]">Rappels</h3>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm font-semibold">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={remPush} onChange={(e) => setRemPush(e.target.checked)} /> Notification push
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={remEmail} onChange={(e) => setRemEmail(e.target.checked)} /> Courriel
          </label>
          <input className={`${inputClass} w-24 !flex-none`} value={remMin} onChange={(e) => setRemMin(e.target.value)} />
          <input className={inputClass} value={remTz} onChange={(e) => setRemTz(e.target.value)} placeholder="Europe/Paris" />
          <button
            type="button"
            disabled={godBusy}
            onClick={() =>
              void god({
                action: 'set_reminders',
                reminderPushEnabled: remPush,
                reminderEmailEnabled: remEmail,
                reminderTimeMinutes: Number(remMin),
                reminderTimezone: remTz,
              })
            }
            className="btn btn-primary btn-md font-black"
          >
            Appliquer rappels
          </button>
        </div>

        <h3 className="mt-10 font-display text-sm font-black uppercase tracking-[0.12em] text-[var(--muted)]">Quête du jour (ligne existante)</h3>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            className={`${inputClass} !w-auto`}
            value={questStatusPick}
            onChange={(e) => setQuestStatusPick(e.target.value as typeof questStatusPick)}
          >
            <option value="pending">{titreStatutQuete('pending')}</option>
            <option value="accepted">{titreStatutQuete('accepted')}</option>
            <option value="completed">{titreStatutQuete('completed')}</option>
            <option value="rejected">{titreStatutQuete('rejected')}</option>
            <option value="replaced">{titreStatutQuete('replaced')}</option>
            <option value="abandoned">{titreStatutQuete('abandoned')}</option>
          </select>
          <button
            type="button"
            disabled={godBusy}
            onClick={() => void god({ action: 'set_quest_status', questStatus: questStatusPick })}
            className="btn btn-cta btn-md font-black"
          >
            Forcer statut
          </button>
        </div>

        <p className="mt-6 text-xs font-medium text-[var(--on-cream-subtle)]">
          Accès réservé aux comptes avec le rôle administrateur en base de données (interface graphique Prisma ou
          requête directe) — aucune variable d'environnement pour ce rôle.
        </p>
      </section>

      {err && data ? (
        <p className="rounded-xl border border-amber-300/80 bg-amber-50/95 px-4 py-3 text-sm font-semibold text-amber-950">
          {err}
        </p>
      ) : null}
    </div>
  );
}

function GodField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[color:color-mix(in_srgb,var(--orange)_35%,transparent)] bg-white/95 p-4 shadow-sm">
      <label className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">{label}</label>
      <div className="mt-3 flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
