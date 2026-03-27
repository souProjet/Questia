import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import {
  hapticLight,
  hapticMedium,
  hapticSuccess,
  hapticError,
} from './haptics';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: {
    Light: 'Light',
    Medium: 'Medium',
    Heavy: 'Heavy',
  },
  NotificationFeedbackType: {
    Success: 'Success',
    Warning: 'Warning',
    Error: 'Error',
  },
}));

describe('haptics', () => {
  const impactAsync = Haptics.impactAsync as jest.Mock;
  const notificationAsync = Haptics.notificationAsync as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      writable: true,
      value: 'ios',
    });
  });

  it('appelle impactAsync sur plateforme native (léger)', () => {
    hapticLight();
    expect(impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
  });

  it('appelle impactAsync (moyen)', () => {
    hapticMedium();
    expect(impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
  });

  it('appelle notificationAsync pour succès et erreur', () => {
    hapticSuccess();
    expect(notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
    jest.clearAllMocks();
    hapticError();
    expect(notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Error);
  });

  it('ne déclenche pas les haptics sur le web', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, writable: true, value: 'web' });
    hapticLight();
    hapticSuccess();
    expect(impactAsync).not.toHaveBeenCalled();
    expect(notificationAsync).not.toHaveBeenCalled();
  });
});
