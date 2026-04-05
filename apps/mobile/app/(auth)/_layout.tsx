import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect, Slot } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { DA } from '@questia/ui';

export default function AuthGroupLayout() {
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

  return <Slot />;
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: DA.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
