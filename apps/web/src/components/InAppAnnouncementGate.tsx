'use client';

import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@/components/Icons';
import {
  IN_APP_ANNOUNCEMENT_SEEN_STORAGE_KEY,
  type InAppAnnouncementPayload,
} from '@questia/shared';

/**
 * Modale d’annonce produit : une fois par `id` (localStorage).
 */
export function InAppAnnouncementGate() {
  const [open, setOpen] = useState(false);
  const [announcement, setAnnouncement] = useState<InAppAnnouncementPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/announcement?platform=web', { cache: 'no-store' });
        const j = (await res.json()) as { announcement?: InAppAnnouncementPayload | null };
        if (cancelled) return;
        const a = j.announcement ?? null;
        if (!a) return;
        const seen =
          typeof window !== 'undefined'
            ? window.localStorage.getItem(IN_APP_ANNOUNCEMENT_SEEN_STORAGE_KEY)
            : null;
        if (seen === a.id) return;
        setAnnouncement(a);
        setOpen(true);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = useCallback(() => {
    if (announcement && typeof window !== 'undefined') {
      window.localStorage.setItem(IN_APP_ANNOUNCEMENT_SEEN_STORAGE_KEY, announcement.id);
    }
    setOpen(false);
    setAnnouncement(null);
  }, [announcement]);

  if (!open || !announcement) return null;

  const titleId = 'in-app-announcement-title';

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end md:items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="quest-modal-backdrop absolute inset-0 cursor-default border-0 bg-transparent p-0"
        aria-label="Fermer"
        onClick={dismiss}
      />
      <div className="quest-modal-panel relative z-10 flex max-h-[min(88vh,560px)] w-full max-w-lg flex-col overflow-hidden motion-safe:animate-fade-up-slow motion-reduce:animate-none">
        <div className="quest-modal-panel-accent h-1.5" />
        <div className="flex flex-col flex-1 min-h-0 px-5 pt-5 pb-5 sm:px-7 sm:pt-6 sm:pb-6">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-100/90 to-amber-50/90 border border-cyan-200/30 shadow-[0_8px_24px_rgba(34,211,238,.12)]">
                <Icon name="Sparkles" size="lg" className="text-[#0e7490]" />
              </div>
              <h2 id={titleId} className="font-display text-lg font-black text-[var(--on-cream)] leading-tight">
                {announcement.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="shrink-0 rounded-xl border border-[color:color-mix(in_srgb,var(--cyan)_35%,transparent)] bg-white/80 px-2.5 py-2 text-sm font-black text-[var(--on-cream-muted)] hover:bg-white"
              aria-label="Fermer"
            >
              <Icon name="X" size="md" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <p className="whitespace-pre-wrap text-sm font-semibold leading-relaxed text-[var(--on-cream-muted)]">
              {announcement.body}
            </p>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={dismiss}
              className="btn btn-primary btn-md min-w-[140px] font-black"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
