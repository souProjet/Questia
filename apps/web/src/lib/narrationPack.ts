/** Directives injectées dans le prompt de génération (packs narration boutique) */
export const NARRATION_PACK_DIRECTIVES: Record<string, string> = {
  cinematic:
    'STYLE NARRATIF « CINÉMATIQUE » : pense la quête comme une courte scène de film (cadrage, tension douce, rebond visuel). Le hook et la mission peuvent évoquer lumière, mouvement, décor — sans jargon technique.',
  poetic:
    'STYLE NARRATIF « POÉTIQUE » : images concrètes, métaphores légères, rythme agréable à lire. Évite le pompeux et le cliché « motivation Instagram ».',
  noir:
    'STYLE NARRATIF « MYSTÈRE URBAIN » : ambiance film noir soft — rues, silhouettes, petit frisson — tout en restant bienveillant, réaliste et sans danger.',
};

export function getNarrationDirectiveForPack(packId: string | null | undefined): string | undefined {
  if (!packId) return undefined;
  return NARRATION_PACK_DIRECTIVES[packId];
}
