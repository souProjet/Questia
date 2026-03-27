import React, { useEffect, useMemo, useRef } from 'react';
import { Tabs } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { QuestiaTabBar } from '../../components/QuestiaTabBar';
import { useAppLocale } from '../../contexts/AppLocaleContext';
import { getTabTitles } from '../../lib/tabTitles';
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
