import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRequest } from '@/lib/auth/admin';
import {
  analyzeQuestArchetypeFromFreeform,
  analyzeQuestArchetypeSuggestion,
  deriveQuestPaceFromFlags,
} from '@/lib/actions/analyzeArchetypeSuggestion';

export async function POST(request: NextRequest) {
  const gate = await requireAdminRequest();
  if (!gate.ok) return gate.response;

  const body = (await request.json()) as {
    content?: string;
    contentFr?: string;
    titleFr?: string;
    descriptionFr?: string;
  };
  const freeform = String(body.content ?? body.contentFr ?? '').trim();

  try {
    if (freeform.length >= 8) {
      const suggestion = await analyzeQuestArchetypeFromFreeform(freeform);
      const questPace = deriveQuestPaceFromFlags({
        requiresSocial: suggestion.requiresSocial,
        minimumDurationMinutes: suggestion.minimumDurationMinutes,
      });
      return NextResponse.json({ ...suggestion, questPace });
    }

    const titleFr = String(body.titleFr ?? '').trim();
    const descriptionFr = String(body.descriptionFr ?? '').trim();
    if (!titleFr || !descriptionFr) {
      return NextResponse.json(
        { error: 'Fournis un texte de quête en FR ou EN (au moins 8 caractères) ou titre + description FR.' },
        { status: 400 },
      );
    }

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
