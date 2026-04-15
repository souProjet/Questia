import React, { useEffect, useMemo } from 'react';
import { Tabs } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { QuestiaTabBar } from '../../components/QuestiaTabBar';
import { useAppLocale } from '../../contexts/AppLocaleContext';
import { getTabTitles } from '../../lib/tabTitles';
import { syncPushRemindersWithServer } from '../../lib/syncPushReminders';

/**
 * Garde module : survit au remontage React (ex. Strict Mode en dev) — évite deux appels à
 * requestPermissionsAsync() pour les mêmes onglets.
 */
let pushRemindersSyncScheduled = false;

function PushRemindersSync() {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      pushRemindersSyncScheduled = false;
      return;
    }
    if (pushRemindersSyncScheduled) return;
    pushRemindersSyncScheduled = true;
    void syncPushRemindersWithServer(() => getToken());
  }, [isLoaded, isSignedIn, getToken]);
  return null;
}

export default function MainTabsLayout() {
  const { locale: appLocale } = useAppLocale();
  const tab = useMemo(() => getTabTitles(appLocale), [appLocale]);
  return (
    <>
      <PushRemindersSync />
    <Tabs
      tabBar={(props) => <QuestiaTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="home" options={{ title: tab.home }} />
      <Tabs.Screen name="shop" options={{ title: tab.shop }} />
      <Tabs.Screen name="history" options={{ title: tab.history }} />
      <Tabs.Screen name="profile" options={{ title: tab.profile }} />
    </Tabs>
    </>
  );
}
