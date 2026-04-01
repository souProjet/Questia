'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { Icon } from '@/components/Icons';
import {
  QUEST_SHARE_BACKGROUNDS,
  buildQuestShareMessage,
  buildWebAppQuestUrl,
  formatQuestDateFr,
  formatQuestShareEquippedTitleLine,
  formatQuestShareProgressionLine,
  getQuestShareBackgroundById,
  questDisplayEmoji,
  type QuestShareBackground,
} from '@questia/shared';
import { siteUrl } from '@/config/marketing';
import { QuestiaLogo } from '@/components/QuestiaLogo';

function siteHostLabel(base: string): string {
  try {
    return new URL(base.startsWith('http') ? base : `https://${base}`).hostname.replace(/^www\./, '');
  } catch {
    return 'questia.fr';
  }
}

export interface QuestSharePayload {
  questDate: string;
  emoji: string;
  title: string;
  mission: string;
  hook: string;
  duration: string;
  streak: number;
  day: number;
  /** Titre boutique équipé (affiché sur la carte + texte de partage). */
  equippedTitleId?: string | null;
  /** Niveau / XP (réponse API `progression`). */
  progression?: {
    level: number;
    totalXp: number;
    xpIntoLevel: number;
    xpToNext: number;
    xpPerLevel: number;
  } | null;
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
  shareLocale = 'fr',
}: {
  payload: QuestSharePayload;
  userFirstName: string;
  background: QuestShareBackground;
  photoUrl: string | null;
  shareLocale?: 'fr' | 'en';
}) {
  const equippedTitleLine = formatQuestShareEquippedTitleLine(payload.equippedTitleId);
  const progressionLine =
    payload.progression &&
    formatQuestShareProgressionLine(
      { level: payload.progression.level, totalXp: payload.progression.totalXp },
      shareLocale,
    );
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
            justifyContent: photoUrl ? 'space-between' : 'flex-end',
            alignItems: 'center',
            gap: 12,
            padding: '14px 16px 6px',
          }}
        >
          {photoUrl ? (
            <>
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
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    justifyContent: 'center',
                  }}
                >
                  <span
                    style={{
                      fontFamily: fontDisplay,
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: '0.28em',
                      textTransform: 'uppercase',
                      color: panelDark ? 'rgba(248,250,252,0.96)' : '#0f172a',
                      textShadow: '0 1px 10px rgba(0,0,0,0.55)',
                    }}
                  >
                    QUESTIA
                  </span>
                  <span
                    style={{
                      fontFamily: fontSans,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      color: 'rgba(248,250,252,0.92)',
                      textShadow: '0 1px 8px rgba(0,0,0,0.65)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {siteHostLabel(siteUrl)}
                  </span>
                </div>
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
                  textShadow: '0 1px 10px rgba(0,0,0,0.5)',
                }}
              >
                {dateLabel}
              </span>
            </>
          ) : (
            <span
              style={{
                fontFamily: fontSans,
                fontSize: 11,
                fontWeight: 600,
                fontFeatureSettings: '"tnum"',
                letterSpacing: '0.01em',
                color: panelDark ? 'rgba(248,250,252,0.92)' : '#334155',
                textAlign: 'right',
                flex: 1,
                lineHeight: 1.35,
                textShadow: '0 1px 0 rgba(255,255,255,0.35)',
              }}
            >
              {dateLabel}
            </span>
          )}
        </div>

        {!photoUrl ? (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              padding: '8px 12px 0',
              gap: 10,
            }}
          >
            <QuestiaLogo variant="shareHero" />
            <span
              style={{
                fontFamily: fontDisplay,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                color: panelDark ? 'rgba(248,250,252,0.96)' : '#0f172a',
                textShadow: '0 1px 0 rgba(255,255,255,0.4)',
              }}
            >
              QUESTIA
            </span>
            <span
              style={{
                fontFamily: fontSans,
                fontSize: 12,
                fontWeight: 700,
                color: mutedColor,
                letterSpacing: '0.02em',
              }}
            >
              {siteHostLabel(siteUrl)}
            </span>
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

          {equippedTitleLine || progressionLine ? (
            <p
              style={{
                fontFamily: fontSans,
                fontSize: 10,
                fontWeight: 700,
                color: mutedColor,
                textAlign: 'left',
                marginTop: 10,
                marginBottom: 0,
                lineHeight: 1.45,
              }}
            >
              {equippedTitleLine ? <span>{equippedTitleLine}</span> : null}
              {equippedTitleLine && progressionLine ? <br /> : null}
              {progressionLine ? <span>{progressionLine}</span> : null}
            </p>
          ) : null}

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
            {shareLocale === 'en'
              ? `${userFirstName} · Quest complete`
              : `${userFirstName} · Quête accomplie`}
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
  shareLocale = 'fr',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payload: QuestSharePayload;
  userFirstName: string;
  /** Aligné sur la locale de l’app (libellés Nv./Lv. et format des nombres). */
  shareLocale?: 'fr' | 'en';
}) {
  const [bgId, setBgId] = useState(QUEST_SHARE_BACKGROUNDS[0].id);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [sharingLink, setSharingLink] = useState(false);
  const [linkFeedback, setLinkFeedback] = useState<'idle' | 'copied' | 'shared' | 'error'>('idle');
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  /** Couche modal montée (pour animation de sortie) */
  const [layerMounted, setLayerMounted] = useState(() => open);
  /** État « ouvert » pour transitions (backdrop + sheet) */
  const [sheetActive, setSheetActive] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);
  const bgStripRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewViewportRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(1);

  const background = getQuestShareBackgroundById(bgId);
  const fallbackWebUrl = buildWebAppQuestUrl(siteUrl);

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
    if (open) {
      setLinkFeedback('idle');
    }
  }, [open]);

  useEffect(() => {
    setShareUrl(null);
  }, [payload.questDate]);

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

  useLayoutEffect(() => {
    if (!layerMounted) return;
    const el = previewViewportRef.current;
    if (!el) return;

    const updateScale = () => {
      const byWidth = el.clientWidth > 0 ? el.clientWidth / CARD_W : 1;
      const byHeight = el.clientHeight > 0 ? el.clientHeight / CARD_H : 1;
      const next = Math.min(1, byWidth, byHeight);
      // Evite des micro-renders dus aux flottants.
      setPreviewScale((prev) => (Math.abs(prev - next) < 0.001 ? prev : next));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(el);
    return () => observer.disconnect();
  }, [layerMounted]);

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

  const resolveShareUrl = useCallback(async (): Promise<string> => {
    if (shareUrl) return shareUrl;
    try {
      const res = await fetch('/api/quest/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questDate: payload.questDate }),
      });
      if (!res.ok) return fallbackWebUrl;
      const json = (await res.json()) as { webUrl?: string };
      const url = typeof json.webUrl === 'string' && json.webUrl.trim() ? json.webUrl.trim() : fallbackWebUrl;
      setShareUrl(url);
      return url;
    } catch {
      return fallbackWebUrl;
    }
  }, [shareUrl, payload.questDate, fallbackWebUrl]);

  const exportPng = useCallback(async () => {
    const el = captureRef.current;
    if (!el) return;
    setExporting(true);
    try {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
      const images = Array.from(el.querySelectorAll('img'));
      await Promise.all(
        images.map(async (img) => {
          if (img.complete && img.naturalWidth > 0) return;
          try {
            await img.decode();
          } catch {
            // Fallback silencieux : on laisse html2canvas tenter le rendu.
          }
        }),
      );
      const canvas = await html2canvas(el, {
        scale: 3,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: null,
        width: CARD_W,
        height: CARD_H,
        windowWidth: CARD_W,
        windowHeight: CARD_H,
        scrollX: 0,
        scrollY: 0,
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
      const webUrl = await resolveShareUrl();

      const shareText = buildQuestShareMessage({
        title: payload.title,
        webUrl,
        equippedTitleLine: formatQuestShareEquippedTitleLine(payload.equippedTitleId),
        progressionLine: payload.progression
          ? formatQuestShareProgressionLine(
              {
                level: payload.progression.level,
                totalXp: payload.progression.totalXp,
              },
              shareLocale,
            )
          : null,
      });
      if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Ma quête Questia',
          text: shareText,
          url: webUrl,
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
  }, [
    payload.questDate,
    payload.title,
    payload.equippedTitleId,
    payload.progression,
    shareLocale,
    resolveShareUrl,
  ]);

  const shareLink = useCallback(async () => {
    if (typeof navigator === 'undefined') return;
    setSharingLink(true);
    setLinkFeedback('idle');
    try {
      const webUrl = await resolveShareUrl();
      if (navigator.share) {
        await navigator.share({
          title: 'Ma quête Questia',
          text: payload.title,
          url: webUrl,
        });
        setLinkFeedback('shared');
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(webUrl);
        setLinkFeedback('copied');
        return;
      }

      setLinkFeedback('error');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      setLinkFeedback('error');
    } finally {
      setSharingLink(false);
    }
  }, [payload.title, resolveShareUrl]);

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
            <div className="flex min-w-0 flex-col gap-4">
              <div className="min-w-0 w-full">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Photo</p>
                <p className="mt-1.5 text-sm font-semibold leading-relaxed text-slate-700">
                  Mets un cliché de ton moment : ta carte raconte mieux ton histoire.
                </p>
              </div>
              <div className="flex w-full min-w-0 flex-col gap-2">
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
                    className="py-1 text-center text-sm font-bold text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-slate-700"
                    onClick={clearPhoto}
                  >
                    Retirer la photo
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 flex min-w-0 w-full justify-center">
          <div
            ref={previewViewportRef}
            className="w-full min-w-0 h-[min(56dvh,34rem)] md:h-[min(52dvh,34rem)] flex items-center justify-center"
          >
            <div
              className="mx-auto"
              style={{
                width: CARD_W * previewScale,
                height: CARD_H * previewScale,
              }}
            >
              <div
                style={{
                  width: CARD_W,
                  height: CARD_H,
                  transform: `scale(${previewScale})`,
                  transformOrigin: 'top left',
                }}
              >
                <div
                  ref={captureRef}
                  className="inline-block rounded-[24px] overflow-hidden shadow-[0_20px_50px_-12px_rgba(15,23,42,0.35),0_0_0_1px_rgba(255,255,255,0.12)] ring-1 ring-white/30"
                >
                  <QuestShareCardFrame
                    payload={payload}
                    userFirstName={userFirstName}
                    background={background}
                    photoUrl={photoUrl}
                    shareLocale={shareLocale}
                  />
                </div>
              </div>
            </div>
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
            className="w-full rounded-2xl border border-cyan-300/70 bg-cyan-50/70 py-3.5 text-sm font-extrabold text-cyan-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-all duration-200 hover:bg-cyan-100/80 hover:border-cyan-400/75 disabled:opacity-60"
            disabled={sharingLink}
            onClick={() => void shareLink()}
          >
            {sharingLink
              ? 'Partage du lien...'
              : linkFeedback === 'copied'
                ? 'Lien copie'
                : linkFeedback === 'shared'
                  ? 'Lien partage'
                  : linkFeedback === 'error'
                    ? 'Impossible de partager le lien'
                    : 'Partager le lien unique'}
          </button>
          <button
            type="button"
            className="w-full rounded-xl py-3 text-sm font-bold text-[var(--subtle)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--text)]"
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
      className="relative z-10 flex min-h-0 w-full min-w-0 max-w-md max-h-[min(calc(100dvh-1rem),52rem)] flex-col overflow-y-auto overflow-x-hidden overscroll-contain rounded-t-[1.85rem] md:max-h-[min(calc(100vh-2.5rem),52rem)] md:rounded-[1.85rem] share-sheet-scroll"
      role="dialog"
      aria-modal
      aria-labelledby="share-card-title"
    >
      {/* Barre gradient — même langage que les autres modales quête */}
      <div className="quest-modal-panel-accent h-[3px] shrink-0 md:rounded-t-[1.85rem]" />

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
      className="fixed inset-0 z-[60] flex h-[100dvh] max-h-[100dvh] w-full flex-col justify-end overflow-hidden md:justify-center md:p-5 md:pb-8"
      role="presentation"
    >
      {/* Couche plein écran : base opaque + flou (évite trous / bords du radial seuls) */}
      <button
        type="button"
        className={`quest-modal-backdrop absolute inset-0 z-0 h-full w-full cursor-pointer border-0 transition-opacity duration-300 ease-out motion-reduce:transition-none ${
          backdropActive ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-label="Fermer"
        onClick={() => onOpenChange(false)}
      />

      <div
        className={`pointer-events-none relative z-10 mx-auto flex min-h-0 w-full max-w-md max-h-full flex-1 flex-col justify-end px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.25rem,env(safe-area-inset-top))] md:max-h-none md:flex-none md:px-0 md:pb-0 md:pt-0 transition-[transform,opacity] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:!translate-y-0 motion-reduce:!scale-100 motion-reduce:!opacity-100 motion-reduce:!transition-none ${sheetTransform}`}
      >
        <div className="pointer-events-auto">{panel}</div>
      </div>
    </div>
  );
}
