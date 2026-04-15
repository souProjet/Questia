import { NextResponse } from 'next/server';
import { getQuestTaxonomy } from '@/lib/quest-taxonomy/cache';

/** Liste publique des archétypes publiés (UI démo / dashboard). */
export async function GET() {
  const taxonomy = await getQuestTaxonomy();
  return NextResponse.json(taxonomy);
}
