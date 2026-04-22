import { useEffect } from 'react';
import { AccessibilityInfo, AppState, Platform, type AppStateStatus } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import type { SharedValue } from 'react-native-reanimated';

const UPDATE_MS = 100;
/** Lissage exponentiel (0–1), plus petit = plus fluide / plus lent. */
const SMOOTH = 0.14;
/** Amplitude max des rotations (deg) — rester discret pour la lecture et le swipe. */
const MAX_TILT_DEG = 4.5;

type Args = {
  enabled: boolean;
  /** `rotateX` CSS/RN (inclinaison avant/arrière). */
  rotateXDeg: SharedValue<number>;
  /** `rotateY` (gauche/droite). */
  rotateYDeg: SharedValue<number>;
};

/**
 * Suit l’inclinaison du téléphone (vecteur gravité via accéléromètre) pour un léger tilt 3D.
 * Le gyroscope seul donne une vitesse angulaire ; pour un effet « carte qui suit la gravité »,
 * l’accéléromètre est le capteur adapté (effet perçu type parallax / gyro pour l’utilisateur).
 */
export function useQuestCardDeviceTilt({ enabled, rotateXDeg, rotateYDeg }: Args): void {
  useEffect(() => {
    if (!enabled || Platform.OS === 'web') {
      rotateXDeg.value = 0;
      rotateYDeg.value = 0;
      return;
    }

    let subscription: { remove: () => void } | null = null;
    let reduceMotion = false;
    let appActive = AppState.currentState === 'active';
    let cancelled = false;

    let smoothRx = 0;
    let smoothRy = 0;

    const resetOutputs = () => {
      smoothRx = 0;
      smoothRy = 0;
      rotateXDeg.value = 0;
      rotateYDeg.value = 0;
    };

    const onAccel = ({ x, y }: { x: number; y: number }) => {
      if (reduceMotion || !appActive || cancelled) return;

      const nx = Math.max(-1, Math.min(1, x));
      const ny = Math.max(-1, Math.min(1, y));

      const targetRy = -nx * MAX_TILT_DEG;
      const targetRx = ny * MAX_TILT_DEG;

      smoothRy += SMOOTH * (targetRy - smoothRy);
      smoothRx += SMOOTH * (targetRx - smoothRx);

      rotateYDeg.value = smoothRy;
      rotateXDeg.value = smoothRx;
    };

    const start = async () => {
      subscription?.remove();
      subscription = null;

      try {
        reduceMotion = await AccessibilityInfo.isReduceMotionEnabled();
      } catch {
        reduceMotion = false;
      }
      if (cancelled || reduceMotion) {
        if (reduceMotion) resetOutputs();
        return;
      }

      const ok = await Accelerometer.isAvailableAsync();
      if (cancelled || !ok) return;

      Accelerometer.setUpdateInterval(UPDATE_MS);
      subscription = Accelerometer.addListener(onAccel);
    };

    const reduceSub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v: boolean) => {
      reduceMotion = v;
      if (v) {
        subscription?.remove();
        subscription = null;
        resetOutputs();
      } else if (appActive && !cancelled) {
        void start();
      }
    });

    const onAppState = (state: AppStateStatus) => {
      appActive = state === 'active';
      if (!appActive) {
        subscription?.remove();
        subscription = null;
        resetOutputs();
      } else if (!reduceMotion && !cancelled) {
        void start();
      }
    };

    const appSub = AppState.addEventListener('change', onAppState);

    void start();

    return () => {
      cancelled = true;
      subscription?.remove();
      reduceSub.remove();
      appSub.remove();
      resetOutputs();
    };
  }, [enabled, rotateXDeg, rotateYDeg]);
}
