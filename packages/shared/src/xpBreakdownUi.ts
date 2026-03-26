import type { EscalationPhase } from './types';
import type { XpBreakdown } from './engine/xp';
import { XP_AFTER_REROLL_MULT, XP_PER_QUEST_CAP, XP_STREAK_BONUS_CAP } from './engine/xp';

const PHASE_FR: Record<EscalationPhase, string> = {
  calibration: 'Découverte',
  expansion: 'Exploration',
  rupture: 'Intensité',
};

export type XpBreakdownRowFr = {
  key: string;
  label: string;
  value: string;
  detail: string;
};

/**
 * Lignes lisibles pour l’écran de récompense (détail du calcul d’XP).
 */
export function xpBreakdownRowsFr(b: XpBreakdown): XpBreakdownRowFr[] {
  const phase = PHASE_FR[b.basePhase];
  const profil =
    b.explorerAxis === 'explorer'
      ? b.riskAxis === 'risktaker'
        ? 'profil explorateur · audacieux'
        : 'profil explorateur · prudent'
      : b.riskAxis === 'risktaker'
        ? 'profil casanier · audacieux'
        : 'profil casanier · prudent';

  const rows: XpBreakdownRowFr[] = [
    {
      key: 'base',
      label: 'XP de base',
      value: `${b.baseAfterArchetype} XP`,
      detail: `Ta phase au moment de la quête : « ${phase} ». Brut de phase : ${b.baseRaw} XP, puis ajustement selon ton ${profil} (multiplicateurs d’archétype).`,
    },
    {
      key: 'streak',
      label: 'Bonus de série',
      value: b.streakBonus > 0 ? `+${b.streakBonus} XP` : '+0 XP',
      detail: `Ta série actuelle : ${b.streakDays} jour(s). +3 XP par jour, plafonné à +${XP_STREAK_BONUS_CAP} XP.`,
    },
  ];

  if (b.outdoorBonus > 0) {
    rows.push({
      key: 'outdoor',
      label: 'Bonus extérieur',
      value: `+${b.outdoorBonus} XP`,
      detail: 'Quête marquée et réalisée en extérieur.',
    });
  }

  if (b.fallbackPenalty > 0) {
    rows.push({
      key: 'fallback',
      label: 'Repli météo',
      value: `−${b.fallbackPenalty} XP`,
      detail: 'Malus sur une quête de repli (conditions météo défavorables).',
    });
  }

  if (b.afterReroll) {
    rows.push({
      key: 'reroll',
      label: 'Après changement de carte',
      value: `×${XP_AFTER_REROLL_MULT} → ${b.subtotalAfterReroll} XP`,
      detail: `Tu avais relancé la quête du jour : le sous-total (base + bonus − malus) était ${b.subtotalBeforeReroll} XP, puis multiplié par ${XP_AFTER_REROLL_MULT}.`,
    });
  }

  if (b.cappedTotal < b.subtotalAfterReroll) {
    rows.push({
      key: 'cap',
      label: 'Plafond par quête',
      value: `${b.cappedTotal} XP retenus`,
      detail: `Le maximum par validation est ${XP_PER_QUEST_CAP} XP (avant bonus boutique éventuel).`,
    });
  }

  if (b.shopBonusXp != null && b.shopBonusXp > 0) {
    rows.push({
      key: 'shop',
      label: 'Bonus boutique',
      value: `+${b.shopBonusXp} XP`,
      detail: 'Une charge XP boutique a été consommée et ajoutée au total de cette validation.',
    });
  }

  return rows;
}
