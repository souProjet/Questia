import React, { useCallback, useMemo, useRef } from 'react';
import { Tabs, useFocusEffect } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { QuestiaTabBar } from '../../components/QuestiaTabBar';
import { useAppLocale } from '../../contexts/AppLocaleContext';
import { getTabTitles } from '../../lib/tabTitles';
import { syncPushRemindersWithServer } from '../../lib/syncPushReminders';

const PUSH_SYNC_MAX_ATTEMPTS = 12;

function PushRemindersSync() {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const syncOkRef = useRef(false);
  const attemptsRef = useRef(0);

  useFocusEffect(
    useCallback(() => {
      if (!isLoaded) return;
      if (!isSignedIn) {
        syncOkRef.current = false;
        attemptsRef.current = 0;
        return;
      }
      if (syncOkRef.current) return;
      if (attemptsRef.current >= PUSH_SYNC_MAX_ATTEMPTS) return;
      attemptsRef.current += 1;
      void syncPushRemindersWithServer(() => getToken()).then((ok) => {
        if (ok) syncOkRef.current = true;
      });
    }, [isLoaded, isSignedIn, getToken]),
  );
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
