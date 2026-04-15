import { NextRequest, NextResponse } from 'next/server';
import { getQuestTaxonomy } from '@/lib/quest-taxonomy/cache';
import { findArchetypeById } from '@/lib/quest-taxonomy/map-prisma';

/** Lecture publique d’un archétype (mobile / fiches). */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await context.params;
  const id = parseInt(idStr, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
  }

  const taxonomy = await getQuestTaxonomy();
  const q = findArchetypeById(taxonomy, id);
  if (!q) {
    return NextResponse.json({ error: 'Archétype introuvable' }, { status: 404 });
  }

  return NextResponse.json(q);
}
