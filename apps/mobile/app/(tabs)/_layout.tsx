import React from 'react';
import { Tabs } from 'expo-router';
import { QuestiaTabBar } from '../../components/QuestiaTabBar';

export default function MainTabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <QuestiaTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Accueil' }} />
      <Tabs.Screen name="shop" options={{ title: 'Boutique' }} />
      <Tabs.Screen name="history" options={{ title: 'Journal' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil' }} />
    </Tabs>
  );
}
