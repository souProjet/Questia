'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { Icon } from '@/components/Icons';
import {
  QUEST_SHARE_BACKGROUNDS,
  buildQuestShareMessage,
  buildWebAppQuestUrl,
  formatQuestDateFr,
  getQuestShareBackgroundById,
  questDisplayEmoji,
  type QuestShareBackground,
} from '@questia/shared';
import { siteUrl } from '@/config/marketing';
import { QuestiaLogo } from '@/components/QuestiaLogo';

export interface QuestSharePayload {
  questDate: string;
  emoji: string;
  title: string;
  mission: string;
  hook: string;
  duration: string;
  streak: number;
  day: number;
}

const CARD_W = 360;
const CARD_H = 640;

function truncate(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function QuestShareCardFrame({
  payload,
  userFirstName,
  background,
  photoUrl,
}: {
  payload: QuestSharePayload;
  userFirstName: string;
  background: QuestShareBackground;
  photoUrl: string | null;
}) {
  const panelDark = background.darkForeground && !photoUrl;
  const panelBorder = panelDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.55)';
  const panelBg = panelDark ? 'rgba(15,23,42,0.72)' : 'rgba(255,255,255,0.74)';
  const titleColor = panelDark ? '#f8fafc' : '#0f172a';
  const mutedColor = panelDark ? 'rgba(226,232,240,0.88)' : '#475569';
  const accentColor = panelDark ? '#22d3ee' : '#0e7490';
  const dateLabel = formatQuestDateFr(payload.questDate);
  const fontSans = 'var(--font-inter), ui-sans-serif, system-ui, sans-serif';
  const fontDisplay = 'var(--font-space), var(--font-inter), ui-sans-serif, system-ui, sans-serif';

  return (
    <div
      style={{
        width: CARD_W,
        height: CARD_H,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 24,
        boxShadow: '0 24px 48px rgba(15,23,42,0.2)',
      }}
    >
      {/* Fond pleine carte (dégradé / photo continue sous l’overlay) */}
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt=""
          crossOrigin="anonymous"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      ) : (
        <>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: background.cssGradient,
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0.38,
              backgroundImage: `
                radial-gradient(circle at 50% 42%, rgba(255,255,255,0.38) 0%, transparent 44%),
                repeating-linear-gradient(
                  -18deg,
                  transparent,
                  transparent 38px,
                  rgba(34, 211, 238, 0.07) 38px,
                  rgba(34, 211, 238, 0.07) 39px
                ),
                radial-gradient(circle at 1px 1px, rgba(255,255,255,0.35) 1px, transparent 0)
              `,
              backgroundSize: 'auto, auto, 28px 28px',
            }}
          />
        </>
      )}

      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            photoUrl != null
              ? 'linear-gradient(to top, rgba(15,23,42,0.82) 0%, transparent 48%, rgba(15,23,42,0.18) 100%)'
              : 'linear-gradient(180deg, rgba(15,23,42,0.1) 0%, transparent 30%, transparent 58%, rgba(15,23,42,0.2) 100%)',
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            padding: '14px 16px 6px',
          }}
        >
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <QuestiaLogo variant="card" />
            <span
              style={{
                fontFamily: fontDisplay,
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                color: panelDark ? 'rgba(248,250,252,0.96)' : '#0f172a',
                textShadow: photoUrl ? '0 1px 10px rgba(0,0,0,0.55)' : '0 1px 0 rgba(255,255,255,0.4)',
              }}
            >
              QUESTIA
            </span>
          </div>
          <span
            style={{
              fontFamily: fontSans,
              fontSize: 11,
              fontWeight: 600,
              fontFeatureSettings: '"tnum"',
              letterSpacing: '0.01em',
              color: panelDark ? 'rgba(248,250,252,0.92)' : '#334155',
              textAlign: 'right',
              maxWidth: 200,
              lineHeight: 1.35,
              textShadow: photoUrl ? '0 1px 10px rgba(0,0,0,0.5)' : '0 1px 0 rgba(255,255,255,0.35)',
            }}
          >
            {dateLabel}
          </span>
        </div>

        {!photoUrl ? (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              padding: '8px 12px 0',
            }}
          >
            <div
              style={{
                position: 'relative',
                width: 200,
                height: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  width: 200,
                  height: 200,
                  borderRadius: '50%',
                  border: '2px solid rgba(249,115,22,0.22)',
                  boxShadow: '0 0 0 8px rgba(34,211,238,0.08)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  width: 156,
                  height: 156,
                  borderRadius: '50%',
                  border: '1px dashed rgba(15,23,42,0.12)',
                }}
              />
              <span
                data-share-emoji-decor
                style={{
                  fontSize: 88,
                  lineHeight: 1,
                  filter: 'drop-shadow(0 4px 12px rgba(15,23,42,0.12))',
                  opacity: 0.92,
                }}
              >
                {questDisplayEmoji(payload.emoji)}
              </span>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, minHeight: 0 }} />
        )}

        <div
          data-share-panel={panelDark ? 'dark' : 'light'}
          style={{
            flexShrink: 0,
            margin: '0 14px 14px',
            padding: '16px 16px 15px',
            borderRadius: 20,
            border: `1px solid ${panelBorder}`,
            background: panelBg,
            backdropFilter: 'blur(14px) saturate(1.15)',
            WebkitBackdropFilter: 'blur(14px) saturate(1.15)',
            boxShadow: panelDark
              ? '0 12px 36px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)'
              : '0 14px 40px rgba(15,23,42,0.12), inset 0 1px 0 rgba(255,255,255,0.85)',
          }}
        >
          {/* Mission = action accomplie (texte principal) ; titre = repère court */}
          <div
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
              marginBottom: 12,
            }}
          >
            <span
              style={{
                fontSize: 40,
                lineHeight: 1,
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              {questDisplayEmoji(payload.emoji)}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontFamily: fontSans,
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: panelDark ? 'rgba(148,163,184,0.95)' : '#64748b',
                  marginBottom: 8,
                  lineHeight: 1.3,
                }}
              >
                {truncate(payload.title, 56)}
              </p>
              <p
                style={{
                  fontFamily: fontDisplay,
                  fontSize: 19,
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  lineHeight: 1.28,
                  color: titleColor,
                  margin: 0,
                }}
              >
                {truncate(payload.mission, 118)}
              </p>
            </div>
          </div>

          <p
            style={{
              fontFamily: fontSans,
              fontSize: 11,
              fontWeight: 600,
              color: mutedColor,
              textAlign: 'left',
              marginBottom: 0,
              paddingTop: 10,
              borderTop: `1px solid ${panelDark ? 'rgba(255,255,255,0.1)' : 'rgba(148,163,184,0.28)'}`,
              marginTop: 2,
            }}
          >
            Jour {payload.day}
            {payload.streak > 0 ? (
              <>
                {' · '}
                <span style={{ fontWeight: 700 }}>🔥 {payload.streak}</span> jour
                {payload.streak !== 1 ? 's' : ''} de suite
              </>
            ) : null}
          </p>

          <p
            style={{
              fontFamily: fontSans,
              fontSize: 12,
              fontStyle: 'italic',
              color: panelDark ? 'rgba(226,232,240,0.82)' : '#64748b',
              lineHeight: 1.5,
              marginTop: 12,
              marginBottom: 12,
              textAlign: 'left',
            }}
          >
            « {truncate(payload.hook, 96)} »
          </p>
          <p
            style={{
              fontFamily: fontDisplay,
              fontSize: 13,
              fontWeight: 800,
              color: accentColor,
              textAlign: 'center',
              letterSpacing: '-0.02em',
            }}
          >
            {userFirstName} · Quête validée ✓
          </p>
        </div>
      </div>
    </div>
  );
}

export function QuestShareComposer({
  open,
  onOpenChange,
  payload,
  userFirstName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payload: QuestSharePayload;
  userFirstName: string;
}) {
  const [bgId, setBgId] = useState(QUEST_SHARE_BACKGROUNDS[0].id);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  /** Couche modal montée (pour animation de sortie) */
  const [layerMounted, setLayerMounted] = useState(() => open);
  /** État « ouvert » pour transitions (backdrop + sheet) */
  const [sheetActive, setSheetActive] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);
  const bgStripRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const background = getQuestShareBackgroundById(bgId);
  const shareWebUrl = buildWebAppQuestUrl(siteUrl, payload.questDate);
  const [linkCopied, setLinkCopied] = useState(false);

  useLayoutEffect(() => {
    if (open) {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      setLayerMounted(true);
      setSheetActive(false);
      // setTimeout plutôt que double rAF : en React Strict Mode le cleanup annulait la 1re frame
      // et sheetActive restait false → overlay visible mais panneau en opacity:0 (écran « noir »).
      const t = window.setTimeout(() => setSheetActive(true), 20);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (open) return;
    setSheetActive(false);
    closeTimeoutRef.current = setTimeout(() => {
      setLayerMounted(false);
      closeTimeoutRef.current = null;
    }, 440);
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, [open]);

  useEffect(() => {
    if (!layerMounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [layerMounted]);

  useEffect(() => {
    if (!layerMounted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [layerMounted, onOpenChange]);

  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  /** Molette verticale → défilement horizontal (sinon la liste semble « bloquée » sur desktop). */
  useEffect(() => {
    if (!layerMounted) return;
    const el = bgStripRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth + 2) return;
      if (e.shiftKey) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [layerMounted, open]);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoUrl(URL.createObjectURL(f));
  };

  const clearPhoto = () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const exportPng = useCallback(async () => {
    const el = captureRef.current;
    if (!el) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(el, {
        scale: 3,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: null,
        /** html2canvas ne reproduit pas backdrop-filter / filter comme le navigateur — on aplatit pour coller à la preview. */
        onclone: (_documentClone, cloned) => {
          cloned.querySelectorAll<HTMLElement>('[data-share-panel]').forEach((node) => {
            const mode = node.getAttribute('data-share-panel');
            node.style.backdropFilter = 'none';
            node.style.setProperty('-webkit-backdrop-filter', 'none');
            if (mode === 'dark') {
              node.style.background = 'rgba(15, 23, 42, 0.88)';
            } else {
              node.style.background = 'rgba(255, 255, 255, 0.92)';
            }
          });
          cloned.querySelectorAll<HTMLElement>('[data-share-emoji-decor]').forEach((node) => {
            node.style.filter = 'none';
            node.style.textShadow = '0 4px 14px rgba(15, 23, 42, 0.2)';
          });
        },
      });
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/png', 1),
      );
      if (!blob) return;
      const filename = `questia-quete-${payload.questDate}.png`;
      const file = new File([blob], filename, { type: 'image/png' });

      const shareText = buildQuestShareMessage({
        title: payload.title,
        webUrl: shareWebUrl,
      });
      if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Ma quête Questia',
          text: shareText,
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setExporting(false);
    }
  }, [payload.questDate, payload.title, shareWebUrl]);

  const copyShareLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareWebUrl);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      /* navigateur sans presse-papiers */
    }
  }, [shareWebUrl]);

  if (!layerMounted && !open) return null;

  const panelInner = (
    <>
      {/* Handle façon story / Instagram */}
      <div className="flex justify-center pt-2 pb-1 md:pt-0 md:pb-0 md:hidden">
        <div
          className="h-1.5 w-12 rounded-full bg-gradient-to-r from-slate-300/90 via-slate-200 to-slate-300/90 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)]"
          aria-hidden
        />
      </div>

      <div className="relative min-w-0 px-5 pt-3 pb-8 md:px-7 md:pt-7 md:pb-9">
        {/* Halo décoratif DA */}
        <div
          className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[120%] -translate-x-1/2 rounded-[100%] bg-gradient-to-b from-cyan-300/25 via-orange-200/15 to-transparent blur-3xl motion-safe:animate-share-shimmer motion-reduce:animate-none"
          aria-hidden
        />

        <div className="relative text-center mb-6">
          <h2 id="share-card-title" className="font-display text-[1.35rem] font-black text-slate-900 sm:text-2xl tracking-tight">
            Ta carte à partager
          </h2>
          <p className="mt-2 text-sm text-slate-600 max-w-[20rem] mx-auto leading-relaxed">
            Fond ou photo, puis export — prêt pour Insta, Stories ou la galerie.
          </p>
        </div>

        <div className="mb-6 min-w-0 pt-1">
          <div className="mb-2 flex flex-wrap items-end justify-between gap-x-3 gap-y-1 px-0.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Fonds</p>
          </div>
          <div className="relative w-full min-w-0 max-w-full rounded-2xl border border-slate-200/70 bg-gradient-to-b from-slate-50/95 to-white/90 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
            <div
              className="pointer-events-none absolute inset-y-2 left-1 z-[1] w-5 bg-gradient-to-r from-slate-50/95 to-transparent sm:w-7"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-y-2 right-1 z-[1] w-5 bg-gradient-to-l from-slate-50/95 to-transparent sm:w-7"
              aria-hidden
            />
            <div
              ref={bgStripRef}
              className="share-bg-strip flex w-full min-w-0 max-w-full select-none gap-2 overflow-x-auto overflow-y-hidden px-1.5 py-1.5 [-webkit-overflow-scrolling:touch]"
            >
              {QUEST_SHARE_BACKGROUNDS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBgId(b.id)}
                  className={`flex h-10 min-w-[5.75rem] shrink-0 items-center justify-center rounded-xl border-2 px-3 text-[10px] font-extrabold uppercase tracking-wide transition-[border-color,box-shadow] duration-150 ${
                    bgId === b.id
                      ? 'border-cyan-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]'
                      : b.darkForeground
                        ? 'border-white/25 hover:border-white/50'
                        : 'border-slate-900/[0.12] hover:border-slate-900/25'
                  }`}
                  style={{
                    backgroundImage: b.cssGradient,
                    backgroundSize: '100% 100%',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                  }}
                >
                  <span
                    className={
                      b.darkForeground ? 'text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]' : 'text-slate-900'
                    }
                  >
                    {b.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-6 min-w-0">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
          <div className="rounded-2xl border border-amber-200/55 bg-gradient-to-br from-amber-50/90 via-white to-cyan-50/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_28px_-12px_rgba(249,115,22,0.12)] sm:p-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-x-8 lg:gap-y-4">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Photo</p>
                <p className="mt-1.5 text-sm font-semibold leading-snug text-slate-700">
                  Mets un cliché de ton moment : ta carte raconte mieux ton histoire.
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 lg:w-[min(100%,15.5rem)] lg:justify-self-end lg:items-stretch">
                <button
                  type="button"
                  className="group relative inline-flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl border-2 border-cyan-400/70 bg-gradient-to-r from-cyan-50 via-white to-amber-50 px-5 py-3.5 text-base font-black text-cyan-950 shadow-[0_10px_36px_-10px_rgba(34,211,238,0.5),inset_0_1px_0_rgba(255,255,255,0.95)] ring-1 ring-cyan-300/35 transition-all duration-200 hover:border-cyan-500/85 hover:shadow-[0_14px_44px_-10px_rgba(34,211,238,0.55)] motion-safe:hover:-translate-y-0.5 motion-safe:active:scale-[0.99]"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span
                    className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:opacity-0"
                    aria-hidden
                  />
                  <Icon name="Camera" size="lg" className="relative shrink-0 text-cyan-700 drop-shadow-sm" />
                  <span className="relative">Ajouter une photo</span>
                </button>
                {photoUrl ? (
                  <button
                    type="button"
                    className="py-1 text-center text-sm font-bold text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-slate-700 lg:text-right"
                    onClick={clearPhoto}
                  >
                    Retirer la photo
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center mb-6">
          <div
            ref={captureRef}
            className="rounded-[24px] overflow-hidden shadow-[0_20px_50px_-12px_rgba(15,23,42,0.35),0_0_0_1px_rgba(255,255,255,0.12)] ring-1 ring-white/30"
          >
            <QuestShareCardFrame
              payload={payload}
              userFirstName={userFirstName}
              background={background}
              photoUrl={photoUrl}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            className="w-full overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 py-4 text-base font-black text-white shadow-[0_12px_32px_-8px_rgba(249,115,22,0.55),inset_0_1px_0_rgba(255,255,255,0.25)] transition-all duration-300 enabled:hover:brightness-105 enabled:hover:shadow-[0_16px_40px_-8px_rgba(249,115,22,0.6)] enabled:active:scale-[0.99] disabled:opacity-60 motion-safe:hover:scale-[1.01]"
            disabled={exporting}
            onClick={() => void exportPng()}
          >
            <span className="flex items-center justify-center gap-2">
              {exporting ? (
                '…'
              ) : (
                <>
                  <Icon name="Share2" size="sm" className="opacity-95" />
                  Partager ou enregistrer l’image
                </>
              )}
            </span>
          </button>
          <button
            type="button"
            className="w-full rounded-2xl border border-cyan-300/60 bg-cyan-50/90 py-3 text-sm font-black text-cyan-950 shadow-sm transition-colors hover:bg-cyan-100/90"
            onClick={() => void copyShareLink()}
          >
            {linkCopied ? 'Lien copié ✓' : 'Copier le lien (ouvre la quête sur questia.fr)'}
          </button>
          <button
            type="button"
            className="w-full rounded-xl py-3 text-sm font-bold text-slate-500 transition-colors hover:text-slate-800 hover:bg-slate-100/80"
            onClick={() => onOpenChange(false)}
          >
            Fermer
          </button>
        </div>
      </div>
    </>
  );

  const panel = (
    <div
      className="relative z-10 w-full min-w-0 max-w-md max-h-[min(92vh,52rem)] overflow-y-auto overflow-x-hidden rounded-t-[1.85rem] md:rounded-[1.85rem] share-sheet-scroll"
      role="dialog"
      aria-modal
      aria-labelledby="share-card-title"
    >
      {/* Barre gradient top — plus fine, type « highlight » */}
      <div className="h-[3px] bg-gradient-to-r from-cyan-400 via-amber-400 to-orange-500 md:rounded-t-[1.85rem]" />

      {/* Coque verre / papier — DA aventure */}
      <div className="relative border-x border-b border-white/60 md:border border-white/50 bg-white bg-gradient-to-b from-white via-white/98 to-cyan-50/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] md:rounded-b-[1.85rem] rounded-b-[1.85rem] md:shadow-[0_28px_80px_-20px_rgba(15,23,42,0.28),0_0_0_1px_rgba(255,255,255,0.6)_inset]">
        {/* Reflet coin */}
        <div
          className="pointer-events-none absolute inset-0 rounded-b-[1.85rem] bg-gradient-to-br from-white/40 via-transparent to-orange-100/20 md:rounded-[1.85rem]"
          aria-hidden
        />
        <div className="relative">{panelInner}</div>
      </div>
    </div>
  );

  const backdropActive = sheetActive;
  const sheetTransform = backdropActive
    ? 'translate-y-0 opacity-100 scale-100 md:translate-y-0 md:scale-100'
    : 'translate-y-[108%] opacity-0 md:translate-y-10 md:scale-[0.94]';

  return (
    <div
      className="fixed inset-0 z-[60] flex min-h-[100dvh] w-full flex-col justify-end md:justify-center md:p-5 md:pb-8"
      role="presentation"
    >
      {/* Couche plein écran : base opaque + flou (évite trous / bords du radial seuls) */}
      <button
        type="button"
        className={`absolute left-0 top-0 z-0 min-h-[100dvh] w-full cursor-pointer border-0 transition-opacity duration-300 ease-out motion-reduce:transition-none ${
          backdropActive ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        style={{
          background:
            'linear-gradient(180deg, rgba(15,23,42,0.72) 0%, rgba(15,23,42,0.78) 45%, rgba(15,23,42,0.82) 100%)',
          backdropFilter: 'saturate(1.1) blur(12px)',
          WebkitBackdropFilter: 'saturate(1.1) blur(12px)',
        }}
        aria-label="Fermer"
        onClick={() => onOpenChange(false)}
      />

      <div
        className={`pointer-events-none relative z-10 mx-auto w-full max-w-md px-3 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-0 md:pb-0 transition-[transform,opacity] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:!translate-y-0 motion-reduce:!scale-100 motion-reduce:!opacity-100 motion-reduce:!transition-none ${sheetTransform}`}
      >
        <div className="pointer-events-auto">{panel}</div>
      </div>
    </div>
  );
}
