/** Identifiant de quête stable sans PII : date + archetype. */
export function questAnalyticsId(quest: { questDate: string; archetypeId: number }): string {
  return `${quest.questDate}_${quest.archetypeId}`;
}
