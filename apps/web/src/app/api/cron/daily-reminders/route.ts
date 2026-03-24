import { NextRequest, NextResponse } from 'next/server';
import { runDailyReminders } from '@/lib/reminders/run-daily-reminders';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorize(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization');
  if (!auth) return false;
  const expected = `Bearer ${secret}`;
  return auth === expected;
}

/**
 * GET — déclenché par Vercel Cron (ou manuellement avec Authorization: Bearer CRON_SECRET).
 * Envoie rappels push / e-mail pour la quête du jour selon les préférences utilisateur.
 */
export async function GET(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const stats = await runDailyReminders(new Date());
    return NextResponse.json({ ok: true, ...stats });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
