/** XP bonus par « charge » boutique consommée à la validation d'une quête */
export const XP_SHOP_BONUS_PER_CHARGE = 25;

/**
 * Nom d’événement pour rafraîchir l’écran quête après un achat boutique (relances bonus, etc.).
 * Web : `window.dispatchEvent(new Event(QUESTIA_SHOP_GRANTS_UPDATED))`.
 * React Native : `DeviceEventEmitter.emit(QUESTIA_SHOP_GRANTS_UPDATED)`.
 */
export const QUESTIA_SHOP_GRANTS_UPDATED = 'questia-shop-grants-updated';
