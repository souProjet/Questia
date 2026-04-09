import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { DA } from '@questia/ui';

/**
 * Point d’entrée `/` : évite l’ambiguïté avec `(auth)/index` (même segment « index » dans Expo Router).
 * Les invité·e·s sont renvoyé·e·s vers `/onboarding` ; les comptes connectés vers l’accueil.
 */
export default function IndexGate() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={DA.cyan} />
      </View>
    );
  }

  if (isSignedIn) {
    return <Redirect href="/home" />;
  }

  return <Redirect href={'/onboarding' as never} />;
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: DA.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
