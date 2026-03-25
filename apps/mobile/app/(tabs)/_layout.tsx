import React, { useEffect, useRef } from 'react';
import { Tabs } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { QuestiaTabBar } from '../../components/QuestiaTabBar';
import { syncPushRemindersWithServer } from '../../lib/syncPushReminders';

function PushRemindersSync() {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const ran = useRef(false);
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      ran.current = false;
      return;
    }
    if (ran.current) return;
    ran.current = true;
    void syncPushRemindersWithServer(() => getToken());
  }, [isLoaded, isSignedIn, getToken]);
  return null;
}

export default function MainTabsLayout() {
  return (
    <>
      <PushRemindersSync />
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
    </>
  );
}
