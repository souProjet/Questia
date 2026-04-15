import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRequest } from '@/lib/auth/admin';
import {
  analyzeQuestArchetypeSuggestion,
  deriveQuestPaceFromFlags,
} from '@/lib/actions/analyzeArchetypeSuggestion';

export async function POST(request: NextRequest) {
  const gate = await requireAdminRequest();
  if (!gate.ok) return gate.response;

  const body = (await request.json()) as { titleFr?: string; descriptionFr?: string };
  const titleFr = String(body.titleFr ?? '').trim();
  const descriptionFr = String(body.descriptionFr ?? '').trim();
  if (!titleFr || !descriptionFr) {
    return NextResponse.json({ error: 'titleFr et descriptionFr requis.' }, { status: 400 });
  }

  try {
    const suggestion = await analyzeQuestArchetypeSuggestion({ titleFr, descriptionFr });
    const questPace = deriveQuestPaceFromFlags({
      requiresSocial: suggestion.requiresSocial,
      minimumDurationMinutes: suggestion.minimumDurationMinutes,
    });
    return NextResponse.json({ ...suggestion, questPace });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Analyse IA indisponible.' }, { status: 502 });
  }
}
