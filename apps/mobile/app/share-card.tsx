import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth, useUser } from '@clerk/expo';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';
import { captureRef } from 'react-native-view-shot';
import {
  QUEST_SHARE_BACKGROUNDS,
  formatQuestDateFr,
  getQuestShareBackgroundById,
  questDisplayEmoji,
} from '@questia/shared';
import { colorWithAlpha, type ThemePalette } from '@questia/ui';
import { useAppTheme } from '../contexts/AppThemeContext';

interface DailyQuest {
  questDate: string;
  title: string;
  mission: string;
  hook: string;
  duration: string;
  emoji: string;
  status: string;
  day: number;
  streak: number;
}

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

async function apiFetch(
  url: string,
  token: string | null,
  options?: RequestInit,
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
}

function truncate(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export default function ShareCardScreen() {
  const { width: screenW } = useWindowDimensions();
  const compact = screenW < 400;
  const horizPad = compact ? 14 : 20;
  const cardW = Math.min(360, screenW - horizPad * 2);
  const cardH = Math.round((cardW * 16) / 9);
  const { questDate: questDateParam } = useLocalSearchParams<{ questDate?: string | string[] }>();
  const questDate = Array.isArray(questDateParam) ? questDateParam[0] : questDateParam;
  const router = useRouter();
  const { getToken, isLoaded: authLoaded } = useAuth();
  const { user } = useUser();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const [quest, setQuest] = useState<DailyQuest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bgId, setBgId] = useState(QUEST_SHARE_BACKGROUNDS[0].id);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const captureRefView = useRef<View>(null);

  const { palette, themeId } = useAppTheme();
  const styles = useMemo(() => createShareStyles(palette, themeId), [palette, themeId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getTokenRef.current();
      const qs =
        questDate && questDate.length >= 8
          ? `?questDate=${encodeURIComponent(questDate)}`
          : '';
      const res = await apiFetch(`${API_BASE_URL}/api/quest/daily${qs}`, token);
      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { error?: string };
        setError(j.error ?? 'Impossible de charger la quête.');
        setQuest(null);
        return;
      }
      const data = await res.json() as DailyQuest;
      if (data.status !== 'completed') {
        setError('Valide d’abord la quête — la carte sera disponible ensuite.');
        setQuest(null);
        return;
      }
      setQuest(data);
    } catch {
      setError('Impossible de joindre l’API.');
      setQuest(null);
    } finally {
      setLoading(false);
    }
  }, [questDate]);

  useEffect(() => {
    if (!authLoaded) return;
    void load();
  }, [authLoaded, questDate, load]);

  const pickerOptions = {
    mediaTypes: ['images'] as ImagePicker.MediaType[],
    allowsEditing: true,
    aspect: [9, 16] as [number, number],
    quality: 0.92,
  };

  const pickFromLibrary = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Accès refusé', 'Autorise l’accès à la photothèque pour choisir une image.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync(pickerOptions);
    if (!res.canceled && res.assets[0]) {
      setPhotoUri(res.assets[0].uri);
    }
  }, []);

  const takePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Accès refusé', 'Autorise l’accès à l’appareil photo pour prendre une image.');
      return;
    }
    try {
      const res = await ImagePicker.launchCameraAsync(pickerOptions);
      if (!res.canceled && res.assets[0]) {
        setPhotoUri(res.assets[0].uri);
      }
    } catch (e) {
      Alert.alert(
        'Appareil photo',
        e instanceof Error ? e.message : 'Impossible d’ouvrir l’appareil photo sur cet appareil.',
      );
    }
  }, []);

  const choosePhotoSource = useCallback(() => {
    Alert.alert('Image de fond', 'Tu préfères importer ou prendre une photo ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Galerie', onPress: () => void pickFromLibrary() },
      { text: 'Appareil photo', onPress: () => void takePhoto() },
    ]);
  }, [pickFromLibrary, takePhoto]);

  const shareImage = async () => {
    if (!captureRefView.current || !quest) return;
    setExporting(true);
    try {
      const uri = await captureRef(captureRefView, {
        format: 'png',
        quality: 1,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Partager ma quête Questia',
        });
      } else {
        Alert.alert('Partage indisponible', 'Le partage n’est pas disponible sur cet appareil.');
      }
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Export impossible');
    } finally {
      setExporting(false);
    }
  };

  const first = user?.firstName ?? 'Aventurier·e';
  const bg = getQuestShareBackgroundById(bgId);
  const panelDark = bg.darkForeground && !photoUri;
  const panelBg = panelDark ? 'rgba(15,23,42,0.76)' : 'rgba(255,255,255,0.78)';
  const panelBorder = panelDark ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.65)';
  const scrollBottomPad = 28;

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator color={palette.cyan} size="large" />
          <Text style={styles.muted}>Préparation de ta carte…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !quest) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.err}>{error ?? 'Erreur'}</Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.replace('/home')}>
            <Text style={styles.primaryBtnText}>Retour</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>← Retour</Text>
        </Pressable>
        <Text style={styles.topTitle}>Carte à partager</Text>
        <View style={{ width: 72 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          compact && styles.scrollCompact,
          { paddingBottom: scrollBottomPad },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>Fonds</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bgRow}>
          {QUEST_SHARE_BACKGROUNDS.map((b) => (
            <Pressable
              key={b.id}
              onPress={() => setBgId(b.id)}
              style={[styles.bgChip, bgId === b.id && styles.bgChipOn]}
            >
              <LinearGradient
                colors={[...b.colors]}
                locations={b.locations as readonly [number, number, ...number[]] | undefined}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.bgChipGrad}
              >
                <Text style={[styles.bgChipText, b.darkForeground && styles.bgChipTextLight]}>
                  {b.label}
                </Text>
              </LinearGradient>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.sectionLabel}>Photo</Text>
        <View style={styles.actions}>
          <Pressable style={styles.secondaryBtn} onPress={choosePhotoSource}>
            <Text style={styles.secondaryBtnText}>📷 Ajouter une photo</Text>
          </Pressable>
          {photoUri ? (
            <Pressable onPress={() => setPhotoUri(null)}>
              <Text style={styles.clearPhoto}>Retirer</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.cardWrap}>
          <View
            ref={captureRefView}
            collapsable={false}
            style={[styles.cardOuter, { width: cardW, height: cardH }]}
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
            ) : (
              <LinearGradient
                colors={[...bg.colors]}
                locations={bg.locations as readonly [number, number, ...number[]] | undefined}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
            )}
            <LinearGradient
              colors={
                photoUri
                  ? ['transparent', 'rgba(15,23,42,0.85)']
                  : ['rgba(15,23,42,0.08)', 'transparent', 'rgba(15,23,42,0.22)']
              }
              locations={photoUri ? undefined : [0, 0.45, 1]}
              style={StyleSheet.absoluteFillObject}
            />

            <View style={styles.cardInner}>
              <View style={styles.cardTopRow}>
                <Text style={[styles.brand, panelDark && styles.brandLight]}>QUESTIA</Text>
                <Text style={[styles.date, panelDark && styles.dateLight]} numberOfLines={2}>
                  {formatQuestDateFr(quest.questDate)}
                </Text>
              </View>

              {!photoUri ? (
                <View style={styles.cardHero}>
                  <View style={styles.heroRingWrap}>
                    <View style={styles.heroRingA} />
                    <View style={styles.heroRingB} />
                    <Text style={styles.heroEmoji}>{questDisplayEmoji(quest.emoji)}</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.cardHeroSpacer} />
              )}

              <View
                style={[
                  styles.panel,
                  {
                    backgroundColor: panelBg,
                    borderColor: panelBorder,
                  },
                ]}
              >
                <View style={styles.panelTop}>
                  <Text style={styles.bigEmoji}>{questDisplayEmoji(quest.emoji)}</Text>
                  <View style={styles.panelText}>
                    <Text style={[styles.titleEyebrow, panelDark && styles.titleEyebrowLight]}>
                      {truncate(quest.title, 56)}
                    </Text>
                    <Text style={[styles.missionHero, panelDark && styles.missionHeroLight]}>
                      {truncate(quest.mission, 118)}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.metaCompact, panelDark && styles.metaCompactLight]}>
                  Jour {quest.day}
                  {quest.streak > 0
                    ? ` · 🔥 ${quest.streak} jour${quest.streak !== 1 ? 's' : ''} de suite`
                    : ''}
                </Text>
                <Text style={[styles.hook, panelDark && styles.hookLight]}>« {truncate(quest.hook, 100)} »</Text>
                <Text style={[styles.footerName, panelDark && styles.footerNameLight]}>
                  {first} · Quête validée ✓
                </Text>
              </View>
            </View>
          </View>
        </View>

        <Pressable
          style={[styles.shareBtn, exporting && { opacity: 0.6 }]}
          onPress={() => void shareImage()}
          disabled={exporting}
        >
          <Text style={styles.shareBtnText}>{exporting ? '…' : '📤 Partager / enregistrer'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function createShareStyles(p: ThemePalette, themeId: string) {
  const cardFrameBg = themeId === 'midnight' ? p.surface : '#0f172a';
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: p.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
  muted: { color: p.muted, fontSize: 14 },
  err: { color: '#f87171', textAlign: 'center', fontSize: 14 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: p.borderCyan,
  },
  back: { color: p.cyan, fontWeight: '700', fontSize: 15 },
  topTitle: { fontWeight: '900', fontSize: 15, color: p.text },
  scroll: { padding: 20, paddingBottom: 32 },
  scrollCompact: { paddingHorizontal: 14, paddingTop: 12 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: p.muted,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  sectionHint: {
    fontSize: 10,
    lineHeight: 14,
    color: p.muted,
    opacity: 0.9,
    marginBottom: 10,
  },
  bgRow: { marginBottom: 16 },
  bgChip: {
    marginRight: 10,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  bgChipOn: { borderColor: p.orange },
  bgChipGrad: { paddingHorizontal: 14, paddingVertical: 10, minWidth: 88, alignItems: 'center' },
  bgChipText: { fontWeight: '900', fontSize: 12, color: p.onCream },
  bgChipTextLight: { color: '#fff' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  secondaryBtn: {
    backgroundColor: p.surface,
    borderWidth: 1,
    borderColor: p.border,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
  },
  secondaryBtnText: { fontWeight: '800', color: p.text, fontSize: 14 },
  clearPhoto: { color: p.muted, fontWeight: '700', fontSize: 13 },
  cardWrap: { alignItems: 'center', marginBottom: 24 },
  cardOuter: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: cardFrameBg,
  },
  cardInner: {
    flex: 1,
    zIndex: 1,
    flexDirection: 'column',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
    gap: 12,
  },
  cardHero: {
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  cardHeroSpacer: {
    flex: 1,
    minHeight: 0,
  },
  heroRingWrap: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroRingA: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: colorWithAlpha(p.orange, 0.22),
  },
  heroRingB: {
    position: 'absolute',
    width: 156,
    height: 156,
    borderRadius: 78,
    borderWidth: 1,
    borderColor: colorWithAlpha(p.text, 0.14),
    borderStyle: 'dashed',
  },
  heroEmoji: { fontSize: 88, lineHeight: 88, zIndex: 1 },
  brand: { fontSize: 10, fontWeight: '900', letterSpacing: 3.2, color: p.onCream },
  brandLight: { color: 'rgba(248,250,252,0.95)' },
  date: {
    fontSize: 11,
    fontWeight: '600',
    color: p.onCreamMuted,
    textAlign: 'right',
    flexShrink: 1,
    maxWidth: 200,
    lineHeight: 15,
  },
  dateLight: { color: 'rgba(248,250,252,0.92)' },
  panel: {
    marginHorizontal: 14,
    marginBottom: 16,
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
  },
  panelTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 12 },
  bigEmoji: { fontSize: 40, lineHeight: 44, marginTop: 2 },
  panelText: { flex: 1 },
  titleEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2.2,
    color: p.onCreamMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  titleEyebrowLight: { color: 'rgba(148,163,184,0.95)' },
  missionHero: {
    fontSize: 19,
    fontWeight: '900',
    color: p.onCream,
    lineHeight: 25,
    letterSpacing: -0.3,
  },
  missionHeroLight: { color: '#f8fafc' },
  metaCompact: {
    fontSize: 11,
    fontWeight: '600',
    color: p.onCreamMuted,
    textAlign: 'left',
    paddingTop: 10,
    marginBottom: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148,163,184,0.28)',
  },
  metaCompactLight: {
    color: 'rgba(226,232,240,0.88)',
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  hook: {
    fontSize: 12,
    fontStyle: 'italic',
    color: p.onCreamMuted,
    marginTop: 12,
    marginBottom: 12,
    lineHeight: 18,
    textAlign: 'left',
  },
  hookLight: { color: 'rgba(226,232,240,0.9)' },
  footerName: { fontSize: 12, fontWeight: '900', color: p.linkOnBg, textAlign: 'center' },
  footerNameLight: { color: p.cyan },
  shareBtn: {
    backgroundColor: p.orange,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: p.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  shareBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  primaryBtn: {
    backgroundColor: p.cyan,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  primaryBtnText: { color: p.onCream, fontWeight: '800', fontSize: 15 },
  });
}
