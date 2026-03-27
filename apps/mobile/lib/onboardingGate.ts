import AsyncStorage from '@react-native-async-storage/async-storage';

/** Les 2 axes doivent être en local (aligné sur le web) avant inscription. */
export async function hasOnboardingAnswers(): Promise<boolean> {
  try {
    const [explorer, risk] = await Promise.all([
      AsyncStorage.getItem('questia_explorer'),
      AsyncStorage.getItem('questia_risk'),
    ]);
    return Boolean(explorer && risk);
  } catch {
    return false;
  }
}
