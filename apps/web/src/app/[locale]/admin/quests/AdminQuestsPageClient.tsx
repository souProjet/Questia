'use client';

import { useCallback, useEffect, useState } from 'react';

type Row = {
  id: number;
  title: string;
  description: string;
  titleEn: string;
  descriptionEn: string;
  category: string;
  comfortLevel: string;
  requiresOutdoor: boolean;
  requiresSocial: boolean;
  minimumDurationMinutes: number;
  fallbackQuestId: number | null;
  questPace: string;
  published: boolean;
};

export function AdminQuestsPageClient() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setErr(null);
    const res = await fetch('/api/admin/quest-archetypes');
    if (!res.ok) {
      setErr(`Erreur ${res.status}`);
      return;
    }
    const data = (await res.json()) as Row[];
    setRows(data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [category, setCategory] = useState('exploratory_sociability');
  const [comfortLevel, setComfortLevel] = useState('moderate');
  const [requiresOutdoor, setRequiresOutdoor] = useState(false);
  const [requiresSocial, setRequiresSocial] = useState(false);
  const [minimumDurationMinutes, setMinimumDurationMinutes] = useState(45);
  const [fallbackQuestId, setFallbackQuestId] = useState<number | ''>('');
  const [questPace, setQuestPace] = useState<'instant' | 'planned'>('instant');

  const analyze = async () => {
    if (!title.trim() || !description.trim()) {
      setErr('Renseigne au moins le titre et la description FR.');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/admin/quest-archetypes/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titleFr: title, descriptionFr: description }),
      });
      if (!res.ok) {
        setErr('Analyse impossible.');
        return;
      }
      const j = (await res.json()) as Record<string, unknown>;
      setTitleEn(String(j.titleEn ?? ''));
      setDescriptionEn(String(j.descriptionEn ?? ''));
      setCategory(String(j.category ?? category));
      setComfortLevel(String(j.comfortLevel ?? comfortLevel));
      setRequiresOutdoor(Boolean(j.requiresOutdoor));
      setRequiresSocial(Boolean(j.requiresSocial));
      setMinimumDurationMinutes(Number(j.minimumDurationMinutes) || 45);
      setQuestPace(String(j.questPace) === 'planned' ? 'planned' : 'instant');
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/admin/quest-archetypes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          titleEn,
          descriptionEn,
          category,
          targetTraits: { openness: 0.5 },
          comfortLevel,
          requiresOutdoor,
          requiresSocial,
          minimumDurationMinutes,
          fallbackQuestId: fallbackQuestId === '' ? null : fallbackQuestId,
          questPace,
          published: true,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        setErr(t || `Erreur ${res.status}`);
        return;
      }
      setTitle('');
      setDescription('');
      setTitleEn('');
      setDescriptionEn('');
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
      <section className="rounded-2xl border-2 border-white/60 bg-white/90 p-5 shadow-sm">
        <h2 className="font-display text-lg font-black text-[var(--on-cream)]">Nouvel archétype</h2>
        <p className="mt-1 text-sm font-semibold text-[var(--on-cream-muted)]">
          Saisis FR puis « Analyser (IA) » pour remplir catégorie, flags et texte EN — vérifie avant création.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
            Titre FR
            <input
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="block text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
            Catégorie
            <input
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </label>
        </div>
        <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
          Description FR
          <textarea
            className="mt-1 min-h-[88px] w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-md font-black"
            disabled={busy}
            onClick={() => void analyze()}
          >
            Analyser (IA)
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
            Titre EN
            <input
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold"
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
            />
          </label>
          <label className="block text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
            Confort
            <select
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold"
              value={comfortLevel}
              onChange={(e) => setComfortLevel(e.target.value)}
            >
              <option value="low">low</option>
              <option value="moderate">moderate</option>
              <option value="high">high</option>
              <option value="extreme">extreme</option>
            </select>
          </label>
        </div>
        <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
          Description EN
          <textarea
            className="mt-1 min-h-[88px] w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold"
            value={descriptionEn}
            onChange={(e) => setDescriptionEn(e.target.value)}
          />
        </label>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" checked={requiresOutdoor} onChange={(e) => setRequiresOutdoor(e.target.checked)} />
            Extérieur
          </label>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" checked={requiresSocial} onChange={(e) => setRequiresSocial(e.target.checked)} />
            Social
          </label>
          <label className="block text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
            Durée min
            <input
              type="number"
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold"
              value={minimumDurationMinutes}
              min={5}
              max={1440}
              onChange={(e) => setMinimumDurationMinutes(parseInt(e.target.value, 10) || 45)}
            />
          </label>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
            Rythme
            <select
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold"
              value={questPace}
              onChange={(e) => setQuestPace(e.target.value as 'instant' | 'planned')}
            >
              <option value="instant">instant</option>
              <option value="planned">planned</option>
            </select>
          </label>
          <label className="block text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
            Fallback archetype id (optionnel)
            <input
              type="number"
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold"
              value={fallbackQuestId}
              placeholder="ex. 9"
              onChange={(e) => {
                const v = e.target.value;
                setFallbackQuestId(v === '' ? '' : parseInt(v, 10));
              }}
            />
          </label>
        </div>
        {err && <p className="mt-3 text-sm font-bold text-red-600">{err}</p>}
        <button
          type="button"
          className="btn btn-cta btn-md mt-4 font-black"
          disabled={busy}
          onClick={() => void create()}
        >
          Créer en base
        </button>
      </section>

      <section className="rounded-2xl border-2 border-white/60 bg-white/90 p-5 shadow-sm">
        <h2 className="font-display text-lg font-black text-[var(--on-cream)]">Archétypes ({rows?.length ?? '…'})</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="py-2 pr-2 font-black">ID</th>
                <th className="py-2 pr-2 font-black">Titre</th>
                <th className="py-2 pr-2 font-black">Cat.</th>
                <th className="py-2 pr-2 font-black">Publié</th>
                <th className="py-2 font-black">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows?.map((r) => (
                <tr key={r.id} className="border-b border-[var(--border)]/60">
                  <td className="py-2 pr-2 font-mono text-xs">{r.id}</td>
                  <td className="py-2 pr-2 font-semibold">{r.title}</td>
                  <td className="py-2 pr-2 text-xs">{r.category}</td>
                  <td className="py-2 pr-2">{r.published ? 'oui' : 'non'}</td>
                  <td className="py-2">
                    <button
                      type="button"
                      className="text-xs font-black text-cyan-700 underline"
                      disabled={busy}
                      onClick={() => void togglePublished(r)}
                    >
                      {r.published ? 'Dépublier' : 'Publier'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
