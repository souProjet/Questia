'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { ChevronDown } from 'lucide-react';

type Row = {
  id: number;
  title: string;
  description: string;
  titleEn: string;
  descriptionEn: string;
  category: string;
  targetTraits: Record<string, unknown>;
  comfortLevel: string;
  requiresOutdoor: boolean;
  requiresSocial: boolean;
  minimumDurationMinutes: number;
  fallbackQuestId: number | null;
  questPace: string;
  published: boolean;
  createdAt?: string;
  updatedAt?: string;
};

function formatTraits(traits: Record<string, unknown>): { key: string; value: string }[] {
  const entries = Object.entries(traits).filter(([, v]) => typeof v === 'number' && !Number.isNaN(v));
  return entries.map(([key, v]) => ({
    key,
    value: typeof v === 'number' ? v.toFixed(2) : String(v),
  }));
}

function formatIsoDate(iso: string | undefined, locale: string) {
  if (!iso) return '—';
  try {
    const tag = locale === 'en' ? 'en-GB' : 'fr-FR';
    return new Intl.DateTimeFormat(tag, {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function pickQuestCopy(row: Row, locale: string) {
  const en = locale === 'en';
  return {
    title: en ? row.titleEn : row.title,
    description: en ? row.descriptionEn : row.description,
  };
}

const inputClass =
  'mt-2 w-full min-w-0 rounded-xl border-2 border-[color:color-mix(in_srgb,var(--cyan)_42%,transparent)] bg-white px-3 py-2.5 text-sm font-semibold text-[var(--text)] shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/40';

const cardClass =
  'relative overflow-hidden rounded-[1.75rem] border-2 border-orange-300/45 bg-gradient-to-br from-[#fffbeb] via-white/95 to-cyan-50/40 px-5 py-6 shadow-[0_10px_0_rgba(180,83,9,.08),0_22px_48px_rgba(249,115,22,.1)] sm:px-6';

export function AdminQuestsPageClient() {
  const locale = useLocale();
  const listUi = useMemo(
    () =>
      locale === 'en'
        ? {
            archetypesTitle: 'Published archetypes',
            archetypesHint:
              'Unpublishing hides the archetype from future draws. Use “Detail” to see traits and engine fields.',
            colCategory: 'Category',
            colDuration: 'Duration',
            colPace: 'Pace',
            colComfort: 'Comfort',
            colExtSoc: 'Out. / soc.',
            colActions: 'Actions',
            colTitle: 'Title',
            colPublished: 'Published',
            yes: 'yes',
            no: 'no',
            detailTitle: 'Title & description',
            expandShow: 'Show detail',
            expandHide: 'Hide detail',
            fallbackLabel: 'Fallback archetype id',
            createdLabel: 'Created',
            updatedLabel: 'Updated',
            traitsHeading: 'Target traits (0–1)',
            traitsEmpty: 'No traits set.',
            unpublish: 'Unpublish',
            publish: 'Publish',
          }
        : {
            archetypesTitle: 'Archétypes publiés',
            archetypesHint:
              'Dépublier masque l’archétype pour les tirages futurs. Utilise « Détail » pour voir textes, traits et paramètres moteur.',
            colCategory: 'Catégorie',
            colDuration: 'Durée',
            colPace: 'Rythme',
            colComfort: 'Confort',
            colExtSoc: 'Ext. / soc.',
            colActions: 'Actions',
            colTitle: 'Titre',
            colPublished: 'Publié',
            yes: 'oui',
            no: 'non',
            detailTitle: 'Titre & description',
            expandShow: 'Afficher le détail',
            expandHide: 'Replier le détail',
            fallbackLabel: 'Archétype de secours (fallback)',
            createdLabel: 'Créé',
            updatedLabel: 'Mis à jour',
            traitsHeading: 'Traits cibles (0–1)',
            traitsEmpty: 'Aucun trait renseigné.',
            unpublish: 'Dépublier',
            publish: 'Publier',
          },
    [locale],
  );

  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [freeformContent, setFreeformContent] = useState('');
  const [fallbackQuestId, setFallbackQuestId] = useState<number | ''>('');

  const load = useCallback(async () => {
    setErr(null);
    const res = await fetch('/api/admin/quest-archetypes');
    if (!res.ok) {
      setErr(`Erreur ${res.status}`);
      return;
    }
    const raw = (await res.json()) as unknown[];
    const data = raw.map((r) => {
      const o = r as Record<string, unknown>;
      const tt = o.targetTraits;
      const targetTraits =
        tt && typeof tt === 'object' && tt !== null && !Array.isArray(tt)
          ? (tt as Record<string, unknown>)
          : {};
      return { ...o, targetTraits } as Row;
    });
    setRows(data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createFromContent = async () => {
    const raw = freeformContent.trim();
    if (raw.length < 8) {
      setErr('Décris la quête en quelques phrases (au moins 8 caractères).');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/admin/quest-archetypes/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: raw }),
      });
      if (!res.ok) {
        setErr('L’analyse automatique a échoué. Vérifie la clé OpenAI ou réessaie plus tard.');
        return;
      }
      const j = (await res.json()) as Record<string, unknown>;
      const traits =
        j.targetTraits && typeof j.targetTraits === 'object' && j.targetTraits !== null
          ? (j.targetTraits as object)
          : { openness: 0.5 };

      const post = await fetch('/api/admin/quest-archetypes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: String(j.titleFr ?? ''),
          description: String(j.descriptionFr ?? ''),
          titleEn: String(j.titleEn ?? ''),
          descriptionEn: String(j.descriptionEn ?? ''),
          category: String(j.category ?? 'exploratory_sociability'),
          targetTraits: traits,
          comfortLevel: String(j.comfortLevel ?? 'moderate'),
          requiresOutdoor: Boolean(j.requiresOutdoor),
          requiresSocial: Boolean(j.requiresSocial),
          minimumDurationMinutes: Math.max(5, Math.min(1440, Number(j.minimumDurationMinutes) || 45)),
          fallbackQuestId: fallbackQuestId === '' ? null : fallbackQuestId,
          questPace: String(j.questPace) === 'planned' ? 'planned' : 'instant',
          published: true,
        }),
      });
      if (!post.ok) {
        const t = await post.text();
        setErr(t || `Erreur ${post.status}`);
        return;
      }
      setFreeformContent('');
      await load();
    } finally {
      setBusy(false);
    }
  };

  const togglePublished = async (r: Row) => {
    setBusy(true);
    try {
      await fetch(`/api/admin/quest-archetypes/${r.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !r.published }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className={cardClass}>
        <div
          className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-gradient-to-br from-cyan-200/35 to-orange-200/25 blur-2xl"
          aria-hidden
        />
        <div className="relative">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--muted)]">Archétypes</p>
          <h2 className="font-display mt-1 text-xl font-black tracking-tight text-gradient-pop md:text-2xl">
            Nouvelle quête
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-[var(--on-cream-muted)]">
            Colle le texte en français ou en anglais (consignes, idée, ton). L’autre langue est traduite automatiquement ; la taxonomie, la durée et les drapeaux sont aussi déduits avant enregistrement.
          </p>

          <label className="mt-6 block text-xs font-black uppercase tracking-wide text-[var(--on-cream)]">
            Contenu de la quête (FR ou EN)
            <textarea
              className={`${inputClass} min-h-[160px] resize-y leading-relaxed`}
              value={freeformContent}
              placeholder="FR : « Marche 20 minutes sans téléphone… » — EN : « Walk for 20 minutes without your phone… »"
              onChange={(e) => setFreeformContent(e.target.value)}
              disabled={busy}
            />
          </label>

          <details className="mt-4 rounded-2xl border border-cyan-200/50 bg-white/50 px-4 py-3 text-sm">
            <summary className="cursor-pointer font-black text-[var(--on-cream)]">Réglages optionnels</summary>
            <p className="mt-2 text-xs font-semibold text-[var(--on-cream-muted)]">
              Rarement utile : lier un archétype de secours si le moteur doit proposer un repli.
            </p>
            <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
              ID archétype de secours
              <input
                type="number"
                className={inputClass}
                value={fallbackQuestId}
                placeholder="ex. 9"
                disabled={busy}
                onChange={(e) => {
                  const v = e.target.value;
                  setFallbackQuestId(v === '' ? '' : parseInt(v, 10));
                }}
              />
            </label>
          </details>

          {err ? (
            <p className="mt-4 rounded-xl border border-amber-300/80 bg-amber-50/95 px-4 py-3 text-sm font-semibold text-amber-950">
              {err}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="btn btn-cta btn-md font-black"
              disabled={busy}
              onClick={() => void createFromContent()}
            >
              {busy ? 'Analyse et création…' : 'Créer la quête'}
            </button>
            <span className="text-xs font-semibold text-[var(--on-cream-subtle)]">
              Un appel IA puis enregistrement en base
            </span>
          </div>
        </div>
      </section>

      <section className={cardClass}>
        <div
          className="pointer-events-none absolute -left-4 bottom-0 h-24 w-24 rounded-full bg-gradient-to-tr from-orange-200/20 to-transparent blur-2xl"
          aria-hidden
        />
        <div className="relative">
          <h2 className="font-display text-lg font-black text-[var(--on-cream)] md:text-xl">
            {listUi.archetypesTitle} ({rows?.length ?? '…'})
          </h2>
          <p className="mt-1 text-sm font-semibold text-[var(--on-cream-muted)]">{listUi.archetypesHint}</p>
          <div className="mt-5 overflow-x-auto rounded-2xl border border-cyan-200/40 bg-white/70">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-cyan-50/50">
                  <th className="py-3 pl-4 pr-1 font-black text-[var(--on-cream)] w-10" />
                  <th className="py-3 pr-2 font-black text-[var(--on-cream)]">ID</th>
                  <th className="py-3 pr-2 font-black text-[var(--on-cream)] min-w-[10rem]">{listUi.colTitle}</th>
                  <th className="py-3 pr-2 font-black text-[var(--on-cream)]">{listUi.colCategory}</th>
                  <th className="py-3 pr-2 font-black text-[var(--on-cream)]">{listUi.colDuration}</th>
                  <th className="py-3 pr-2 font-black text-[var(--on-cream)]">{listUi.colPace}</th>
                  <th className="py-3 pr-2 font-black text-[var(--on-cream)]">{listUi.colComfort}</th>
                  <th className="py-3 pr-2 font-black text-[var(--on-cream)]">{listUi.colExtSoc}</th>
                  <th className="py-3 pr-2 font-black text-[var(--on-cream)]">{listUi.colPublished}</th>
                  <th className="py-3 pr-4 font-black text-[var(--on-cream)]">{listUi.colActions}</th>
                </tr>
              </thead>
              <tbody>
                {rows?.map((r) => {
                  const open = expandedId === r.id;
                  const traitRows = formatTraits(r.targetTraits ?? {});
                  const copy = pickQuestCopy(r, locale);
                  return (
                    <Fragment key={r.id}>
                      <tr
                        className="border-b border-[var(--border)]/50 transition hover:bg-cyan-50/30"
                      >
                        <td className="py-2 pl-3 pr-1 align-middle">
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-200/70 bg-white text-cyan-900 shadow-sm transition hover:bg-cyan-50/90"
                            aria-expanded={open}
                            aria-label={open ? listUi.expandHide : listUi.expandShow}
                            disabled={busy}
                            onClick={() => setExpandedId((id) => (id === r.id ? null : r.id))}
                          >
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
                              strokeWidth={2.25}
                              aria-hidden
                            />
                          </button>
                        </td>
                        <td className="py-3 pr-2 font-mono text-xs font-semibold text-[var(--muted)]">{r.id}</td>
                        <td className="py-3 pr-2 font-semibold text-[var(--text)] max-w-[14rem]">
                          <span className="line-clamp-2" title={copy.title}>
                            {copy.title}
                          </span>
                        </td>
                        <td className="py-3 pr-2 text-xs font-medium text-[var(--on-cream-muted)] max-w-[9rem] break-words">
                          {r.category}
                        </td>
                        <td className="py-3 pr-2 tabular-nums text-[var(--text)]">{r.minimumDurationMinutes} min</td>
                        <td className="py-3 pr-2 text-xs font-semibold uppercase text-slate-600">{r.questPace}</td>
                        <td className="py-3 pr-2 text-xs font-semibold text-slate-600">{r.comfortLevel}</td>
                        <td className="py-3 pr-2 text-xs font-semibold text-slate-700">
                          {r.requiresOutdoor ? 'ext.' : '—'}
                          {' · '}
                          {r.requiresSocial ? 'soc.' : '—'}
                        </td>
                        <td className="py-3 pr-2 text-sm font-semibold">
                          {r.published ? listUi.yes : listUi.no}
                        </td>
                        <td className="py-3 pr-4">
                          <button
                            type="button"
                            className="rounded-xl border-2 border-cyan-300/60 bg-white px-3 py-1.5 text-xs font-black text-cyan-900 shadow-sm transition hover:border-cyan-400 hover:bg-cyan-50/80"
                            disabled={busy}
                            onClick={() => void togglePublished(r)}
                          >
                            {r.published ? listUi.unpublish : listUi.publish}
                          </button>
                        </td>
                      </tr>
                      {open ? (
                        <tr key={`${r.id}-detail`} className="border-b border-[var(--border)]/50 bg-gradient-to-b from-cyan-50/40 to-white/80">
                          <td colSpan={10} className="px-4 py-5 sm:px-6">
                            <div className="grid gap-6 lg:grid-cols-2">
                              <div className="space-y-4">
                                <div>
                                  <p className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">
                                    {listUi.detailTitle}
                                  </p>
                                  <p className="mt-1 font-display text-base font-black text-[var(--on-cream)]">
                                    {copy.title}
                                  </p>
                                  <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-relaxed text-[var(--text)]">
                                    {copy.description}
                                  </p>
                                </div>
                              </div>
                              <div className="space-y-4">
                                <div>
                                  <p className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">
                                    {listUi.traitsHeading}
                                  </p>
                                  {traitRows.length ? (
                                    <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                                      {traitRows.map(({ key, value }) => (
                                        <li
                                          key={key}
                                          className="flex items-center justify-between gap-3 rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2 text-xs font-semibold"
                                        >
                                          <span className="font-mono text-slate-600">{key}</span>
                                          <span className="tabular-nums font-bold text-cyan-900">{value}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="mt-2 text-sm font-medium text-slate-500">{listUi.traitsEmpty}</p>
                                  )}
                                </div>
                                <dl className="grid gap-2 rounded-xl border border-orange-200/50 bg-white/60 px-4 py-3 text-sm">
                                  <div className="flex flex-wrap justify-between gap-2">
                                    <dt className="font-bold text-[var(--muted)]">{listUi.fallbackLabel}</dt>
                                    <dd className="font-mono font-semibold text-[var(--text)]">
                                      {r.fallbackQuestId ?? '—'}
                                    </dd>
                                  </div>
                                  <div className="flex flex-wrap justify-between gap-2">
                                    <dt className="font-bold text-[var(--muted)]">{listUi.createdLabel}</dt>
                                    <dd className="font-semibold text-slate-700">{formatIsoDate(r.createdAt, locale)}</dd>
                                  </div>
                                  <div className="flex flex-wrap justify-between gap-2">
                                    <dt className="font-bold text-[var(--muted)]">{listUi.updatedLabel}</dt>
                                    <dd className="font-semibold text-slate-700">{formatIsoDate(r.updatedAt, locale)}</dd>
                                  </div>
                                </dl>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
