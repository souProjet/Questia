import { NextResponse } from 'next/server';
import type { ExplorerAxis, Profile, QuestStatus, RiskAxis } from '@prisma/client';
import { prisma } from '@/lib/db';
import { BADGE_DEFINITIONS, getThemeIds, TITLE_IDS } from '@questia/shared';
import { parseBadgesEarned } from '@/lib/progression';
import { parseStringArray } from '@/lib/shop/parse';

const BADGE_ID_SET = new Set<string>(BADGE_DEFINITIONS.map((b) => b.id));
const THEME_ID_SET = new Set(getThemeIds());
const TITLE_ID_SET = new Set(TITLE_IDS);

export type GodmodeBody = {
  action:
    | 'reset_quest_flags'
    | 'delete_today_quest'
    | 'grant_coins'
    | 'set_rerolls'
    | 'set_streak'
    | 'set_total_xp'
    | 'reset_last_quest_date'
    | 'set_phase_day'
    | 'set_congruence_delta'
    | 'set_xp_bonus_charges'
    | 'reset_badges'
    | 'grant_badge'
    | 'set_badges_json'
    | 'set_active_theme'
    | 'add_owned_theme'
    | 'set_owned_themes'
    | 'reset_refinement'
    | 'set_reminders'
    | 'set_quest_status'
    | 'set_explorer_risk'
    | 'set_owned_titles'
    | 'set_equipped_title'
    | 'reset_reminder_dates';
  targetClerkId?: string;
  amount?: number;
  daily?: number;
  bonus?: number;
  streak?: number;
  totalXp?: number;
  currentDay?: number;
  currentPhase?: 'calibration' | 'expansion' | 'rupture';
  congruenceDelta?: number;
  xpBonusCharges?: number;
  badgeId?: string;
  badgesJson?: unknown;
  themeId?: string;
  ownedThemes?: string[];
  reminderPushEnabled?: boolean;
  reminderEmailEnabled?: boolean;
  reminderTimeMinutes?: number;
  reminderTimezone?: string;
  lastReminderPushDate?: string | null;
  lastReminderEmailDate?: string | null;
  questStatus?: QuestStatus;
  explorerAxis?: ExplorerAxis;
  riskAxis?: RiskAxis;
  ownedTitleIds?: string[];
  equippedTitleId?: string | null;
};

function isValidTimeZone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return tz.length > 1 && tz.length < 120;
  } catch {
    return false;
  }
}

function validateBadgesJson(raw: unknown): { id: string; unlockedAt: string }[] | null {
  if (!Array.isArray(raw)) return null;
  const out: { id: string; unlockedAt: string }[] = [];
  for (const x of raw) {
    if (x == null || typeof x !== 'object') return null;
    const id = (x as { id?: string }).id;
    const unlockedAt = (x as { unlockedAt?: string }).unlockedAt;
    if (typeof id !== 'string' || typeof unlockedAt !== 'string') return null;
    if (!BADGE_ID_SET.has(id)) return null;
    out.push({ id, unlockedAt });
  }
  return out;
}

export async function runGodmodeAction(profile: Profile, body: GodmodeBody, today: string): Promise<NextResponse> {
  try {
    switch (body.action) {
      case 'reset_quest_flags': {
        await prisma.profile.update({
          where: { id: profile.id },
          data: {
            flagNextQuestAfterReroll: false,
            flagNextQuestInstantOnly: false,
            deferredSocialUntil: null,
          },
        });
        return NextResponse.json({ ok: true, message: 'Flags quête réinitialisés.' });
      }
      case 'delete_today_quest': {
        const del = await prisma.questLog.deleteMany({
          where: { profileId: profile.id, questDate: today },
        });
        return NextResponse.json({ ok: true, deleted: del.count });
      }
      case 'grant_coins': {
        const amount = Math.trunc(Number(body.amount));
        if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 500_000) {
          return NextResponse.json({ error: 'Montant invalide (max ±500k).' }, { status: 400 });
        }
        await prisma.profile.update({
          where: { id: profile.id },
          data: { coinBalance: { increment: amount } },
        });
        return NextResponse.json({ ok: true, granted: amount });
      }
      case 'set_rerolls': {
        const daily = body.daily !== undefined ? Math.trunc(Number(body.daily)) : undefined;
        const bonus = body.bonus !== undefined ? Math.trunc(Number(body.bonus)) : undefined;
        if (daily !== undefined && (daily < 0 || daily > 50)) {
          return NextResponse.json({ error: 'Relances du jour : 0–50.' }, { status: 400 });
        }
        if (bonus !== undefined && (bonus < 0 || bonus > 500)) {
          return NextResponse.json({ error: 'Crédits bonus : 0–500.' }, { status: 400 });
        }
        await prisma.profile.update({
          where: { id: profile.id },
          data: {
            ...(daily !== undefined ? { rerollsRemaining: daily } : {}),
            ...(bonus !== undefined ? { bonusRerollCredits: bonus } : {}),
          },
        });
        return NextResponse.json({ ok: true, daily, bonus });
      }
      case 'set_streak': {
        const streak = Math.trunc(Number(body.streak));
        if (!Number.isFinite(streak) || streak < 0 || streak > 10_000) {
          return NextResponse.json({ error: 'Série invalide.' }, { status: 400 });
        }
        await prisma.profile.update({
          where: { id: profile.id },
          data: { streakCount: streak },
        });
        return NextResponse.json({ ok: true, streak });
      }
      case 'set_total_xp': {
        const totalXp = Math.trunc(Number(body.totalXp));
        if (!Number.isFinite(totalXp) || totalXp < 0 || totalXp > 99_999_999) {
          return NextResponse.json({ error: 'XP invalide.' }, { status: 400 });
        }
        await prisma.profile.update({
          where: { id: profile.id },
          data: { totalXp },
        });
        return NextResponse.json({ ok: true, totalXp });
      }
      case 'reset_last_quest_date': {
        await prisma.profile.update({
          where: { id: profile.id },
          data: { lastQuestDate: null },
        });
        return NextResponse.json({
          ok: true,
          message: "lastQuestDate effacé (simule « pas encore de quête aujourd'hui » côté série).",
        });
      }
      case 'set_phase_day': {
        const day = Math.trunc(Number(body.currentDay));
        const phase = body.currentPhase;
        if (!Number.isFinite(day) || day < 1 || day > 9999) {
          return NextResponse.json({ error: 'Jour invalide.' }, { status: 400 });
        }
        if (!phase || !['calibration', 'expansion', 'rupture'].includes(phase)) {
          return NextResponse.json({ error: 'Phase invalide.' }, { status: 400 });
        }
        await prisma.profile.update({
          where: { id: profile.id },
          data: { currentDay: day, currentPhase: phase },
        });
        return NextResponse.json({ ok: true, currentDay: day, currentPhase: phase });
      }
      case 'set_congruence_delta': {
        const v = Number(body.congruenceDelta);
        if (!Number.isFinite(v) || v < -5 || v > 5) {
          return NextResponse.json({ error: 'congruenceDelta : entre -5 et 5.' }, { status: 400 });
        }
        await prisma.profile.update({
          where: { id: profile.id },
          data: { congruenceDelta: v },
        });
        return NextResponse.json({ ok: true, congruenceDelta: v });
      }
      case 'set_xp_bonus_charges': {
        const n = Math.trunc(Number(body.xpBonusCharges));
        if (!Number.isFinite(n) || n < 0 || n > 99_999) {
          return NextResponse.json({ error: 'Charges XP bonus : 0–99999.' }, { status: 400 });
        }
        await prisma.profile.update({
          where: { id: profile.id },
          data: { xpBonusCharges: n },
        });
        return NextResponse.json({ ok: true, xpBonusCharges: n });
      }
      case 'reset_badges': {
        await prisma.profile.update({
          where: { id: profile.id },
          data: { badgesEarned: [] },
        });
        return NextResponse.json({ ok: true, message: 'Badges effacés.' });
      }
      case 'grant_badge': {
        const bid = body.badgeId;
        if (typeof bid !== 'string' || !BADGE_ID_SET.has(bid)) {
          return NextResponse.json({ error: 'badgeId inconnu.' }, { status: 400 });
        }
        const existing = parseBadgesEarned(profile.badgesEarned);
        if (existing.some((b) => b.id === bid)) {
          return NextResponse.json({ ok: true, message: 'Badge déjà présent.', skipped: true });
        }
        existing.push({ id: bid, unlockedAt: new Date().toISOString() });
        await prisma.profile.update({
          where: { id: profile.id },
          data: { badgesEarned: existing },
        });
        return NextResponse.json({ ok: true, badgeId: bid });
      }
      case 'set_badges_json': {
        const parsed = validateBadgesJson(body.badgesJson);
        if (!parsed) {
          return NextResponse.json(
            { error: 'badgesJson : tableau de { id, unlockedAt } avec ids valides.' },
            { status: 400 },
          );
        }
        await prisma.profile.update({
          where: { id: profile.id },
          data: { badgesEarned: parsed },
        });
        return NextResponse.json({ ok: true, count: parsed.length });
      }
      case 'set_active_theme': {
        const tid = body.themeId;
        if (typeof tid !== 'string' || !THEME_ID_SET.has(tid)) {
          return NextResponse.json({ error: 'themeId invalide.' }, { status: 400 });
        }
        const owned = new Set(parseStringArray(profile.ownedThemes));
        if (!owned.has(tid)) owned.add(tid);
        await prisma.profile.update({
          where: { id: profile.id },
          data: { activeThemeId: tid, ownedThemes: [...owned] },
        });
        return NextResponse.json({ ok: true, activeThemeId: tid, ownedThemes: [...owned] });
      }
      case 'add_owned_theme': {
        const tid = body.themeId;
        if (typeof tid !== 'string' || !THEME_ID_SET.has(tid)) {
          return NextResponse.json({ error: 'themeId invalide.' }, { status: 400 });
        }
        const owned = new Set(parseStringArray(profile.ownedThemes));
        owned.add(tid);
        await prisma.profile.update({
          where: { id: profile.id },
          data: { ownedThemes: [...owned] },
        });
        return NextResponse.json({ ok: true, ownedThemes: [...owned] });
      }
      case 'set_owned_themes': {
        const arr = body.ownedThemes;
        if (!Array.isArray(arr) || arr.length === 0) {
          return NextResponse.json({ error: 'ownedThemes : tableau non vide.' }, { status: 400 });
        }
        for (const t of arr) {
          if (typeof t !== 'string' || !THEME_ID_SET.has(t)) {
            return NextResponse.json({ error: 'Id de thème invalide dans ownedThemes.' }, { status: 400 });
          }
        }
        const uniq = [...new Set(arr)];
        if (!uniq.includes('default')) {
          return NextResponse.json({ error: 'ownedThemes doit inclure "default".' }, { status: 400 });
        }
        let active = profile.activeThemeId;
        if (!uniq.includes(active)) active = 'default';
        await prisma.profile.update({
          where: { id: profile.id },
          data: { ownedThemes: uniq, activeThemeId: active },
        });
        return NextResponse.json({ ok: true, ownedThemes: uniq, activeThemeId: active });
      }
      case 'reset_refinement': {
        await prisma.profile.update({
          where: { id: profile.id },
          data: {
            refinementAnswers: {},
            refinementSchemaVersion: 0,
            refinementCompletedAt: null,
            refinementSkippedAt: null,
            refinementConsentAt: null,
          },
        });
        return NextResponse.json({ ok: true, message: 'Questionnaire raffinement réinitialisé.' });
      }
      case 'set_reminders': {
        if (
          body.reminderPushEnabled === undefined &&
          body.reminderEmailEnabled === undefined &&
          body.reminderTimeMinutes === undefined &&
          body.reminderTimezone === undefined &&
          body.lastReminderPushDate === undefined &&
          body.lastReminderEmailDate === undefined
        ) {
          return NextResponse.json({ error: 'Aucun champ de rappel fourni.' }, { status: 400 });
        }
        let reminderTimeMinutes: number | undefined;
        if (body.reminderTimeMinutes !== undefined) {
          const m = Math.trunc(Number(body.reminderTimeMinutes));
          if (!Number.isFinite(m) || m < 0 || m > 1439) {
            return NextResponse.json({ error: 'reminderTimeMinutes : 0–1439.' }, { status: 400 });
          }
          reminderTimeMinutes = m;
        }
        let reminderTimezone: string | undefined;
        if (body.reminderTimezone !== undefined) {
          const tz = String(body.reminderTimezone).trim();
          if (!isValidTimeZone(tz)) {
            return NextResponse.json({ error: 'Fuseau IANA invalide.' }, { status: 400 });
          }
          reminderTimezone = tz;
        }
        await prisma.profile.update({
          where: { id: profile.id },
          data: {
            ...(body.reminderPushEnabled !== undefined ? { reminderPushEnabled: Boolean(body.reminderPushEnabled) } : {}),
            ...(body.reminderEmailEnabled !== undefined ? { reminderEmailEnabled: Boolean(body.reminderEmailEnabled) } : {}),
            ...(reminderTimeMinutes !== undefined ? { reminderTimeMinutes } : {}),
            ...(reminderTimezone !== undefined ? { reminderTimezone } : {}),
            ...(body.lastReminderPushDate !== undefined ? { lastReminderPushDate: body.lastReminderPushDate } : {}),
            ...(body.lastReminderEmailDate !== undefined ? { lastReminderEmailDate: body.lastReminderEmailDate } : {}),
          },
        });
        return NextResponse.json({
          ok: true,
          reminderPushEnabled: body.reminderPushEnabled,
          reminderEmailEnabled: body.reminderEmailEnabled,
          reminderTimeMinutes,
          reminderTimezone,
          lastReminderPushDate: body.lastReminderPushDate,
          lastReminderEmailDate: body.lastReminderEmailDate,
        });
      }
      case 'reset_reminder_dates': {
        await prisma.profile.update({
          where: { id: profile.id },
          data: { lastReminderPushDate: null, lastReminderEmailDate: null },
        });
        return NextResponse.json({ ok: true, message: 'Dates de dernier rappel effacées.' });
      }
      case 'set_quest_status': {
        const st = body.questStatus;
        const allowed: QuestStatus[] = ['pending', 'accepted', 'completed', 'rejected', 'replaced', 'abandoned'];
        if (!st || !allowed.includes(st)) {
          return NextResponse.json({ error: 'questStatus invalide.' }, { status: 400 });
        }
        const row = await prisma.questLog.findUnique({
          where: { profileId_questDate: { profileId: profile.id, questDate: today } },
        });
        if (!row) {
          return NextResponse.json(
            { error: "Aucune quête pour aujourd'hui — génère-en une (app) ou crée la ligne en BDD." },
            { status: 404 },
          );
        }
        await prisma.questLog.update({
          where: { id: row.id },
          data: { status: st },
        });
        return NextResponse.json({ ok: true, questStatus: st });
      }
      case 'set_explorer_risk': {
        const ex = body.explorerAxis;
        const rk = body.riskAxis;
        if (ex !== undefined && ex !== 'homebody' && ex !== 'explorer') {
          return NextResponse.json({ error: 'explorerAxis invalide.' }, { status: 400 });
        }
        if (rk !== undefined && rk !== 'cautious' && rk !== 'risktaker') {
          return NextResponse.json({ error: 'riskAxis invalide.' }, { status: 400 });
        }
        if (ex === undefined && rk === undefined) {
          return NextResponse.json({ error: 'Fournis explorerAxis et/ou riskAxis.' }, { status: 400 });
        }
        await prisma.profile.update({
          where: { id: profile.id },
          data: {
            ...(ex !== undefined ? { explorerAxis: ex } : {}),
            ...(rk !== undefined ? { riskAxis: rk } : {}),
          },
        });
        return NextResponse.json({ ok: true, explorerAxis: ex, riskAxis: rk });
      }
      case 'set_owned_titles': {
        const arr = body.ownedTitleIds;
        if (!Array.isArray(arr)) {
          return NextResponse.json({ error: 'ownedTitleIds : tableau attendu.' }, { status: 400 });
        }
        for (const t of arr) {
          if (typeof t !== 'string' || !TITLE_ID_SET.has(t)) {
            return NextResponse.json({ error: 'Id de titre inconnu.' }, { status: 400 });
          }
        }
        const uniq = [...new Set(arr)];
        await prisma.profile.update({
          where: { id: profile.id },
          data: { ownedTitleIds: uniq },
        });
        return NextResponse.json({ ok: true, ownedTitleIds: uniq });
      }
      case 'set_equipped_title': {
        const eq = body.equippedTitleId;
        if (eq !== null && (typeof eq !== 'string' || !TITLE_ID_SET.has(eq))) {
          return NextResponse.json({ error: 'equippedTitleId invalide.' }, { status: 400 });
        }
        const owned = new Set(parseStringArray(profile.ownedTitleIds));
        if (eq !== null && !owned.has(eq)) {
          return NextResponse.json({ error: 'Équipe un titre possédé (ownedTitleIds).' }, { status: 400 });
        }
        await prisma.profile.update({
          where: { id: profile.id },
          data: { equippedTitleId: eq },
        });
        return NextResponse.json({ ok: true, equippedTitleId: eq });
      }
      default:
        return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
