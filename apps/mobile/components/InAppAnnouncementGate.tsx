import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  Platform,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  IN_APP_ANNOUNCEMENT_SEEN_STORAGE_KEY,
  type InAppAnnouncementPayload,
} from '@questia/shared';
import { DA } from '@questia/ui';
import { API_BASE_URL } from '../lib/api';

const platformParam = Platform.OS === 'ios' ? 'ios' : 'android';

export function InAppAnnouncementGate() {
  const { width } = useWindowDimensions();
  const maxW = Math.min(400, width - 32);
  const [open, setOpen] = useState(false);
  const [announcement, setAnnouncement] = useState<InAppAnnouncementPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/announcement?platform=${platformParam}`,
          { cache: 'no-store' },
        );
        const j = (await res.json()) as { announcement?: InAppAnnouncementPayload | null };
        if (cancelled) return;
        const a = j.announcement ?? null;
        if (!a) return;
        const seen = await AsyncStorage.getItem(IN_APP_ANNOUNCEMENT_SEEN_STORAGE_KEY);
        if (seen === a.id) return;
        setAnnouncement(a);
        setOpen(true);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = useCallback(async () => {
    if (announcement) {
      await AsyncStorage.setItem(IN_APP_ANNOUNCEMENT_SEEN_STORAGE_KEY, announcement.id);
    }
    setOpen(false);
    setAnnouncement(null);
  }, [announcement]);

  if (!announcement) return null;

  return (
    <Modal visible={open} animationType="fade" transparent onRequestClose={dismiss}>
      <Pressable style={styles.backdrop} onPress={dismiss}>
        <Pressable
          style={[styles.panel, { maxWidth: maxW }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.accent} />
          <View style={styles.headerRow}>
            <Text style={styles.title} numberOfLines={3}>
              {announcement.title}
            </Text>
            <Pressable
              onPress={dismiss}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Fermer"
              style={styles.closeBtn}
            >
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.body}>{announcement.body}</Text>
          </ScrollView>
          <Pressable style={styles.okBtn} onPress={dismiss}>
            <Text style={styles.okText}>OK</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  panel: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 20,
    backgroundColor: DA.bg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(34, 211, 238, 0.35)',
  },
  accent: {
    height: 6,
    backgroundColor: '#22d3ee',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: DA.text,
  },
  closeBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  closeText: {
    fontSize: 16,
    color: DA.muted,
    fontWeight: '700',
  },
  scroll: {
    maxHeight: 320,
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    color: DA.muted,
  },
  okBtn: {
    marginHorizontal: 18,
    marginVertical: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#c2410c',
    alignItems: 'center',
  },
  okText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
});
