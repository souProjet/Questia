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
  Modal,
  useWindowDimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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
  formatQuestShareEquippedTitleLine,
  formatQuestShareProgressionLine,
  getQuestShareBackgroundById,
  questDisplayEmoji,
} from '@questia/shared';
import { type ThemePalette } from '@questia/ui';
import { useAppTheme } from '../contexts/AppThemeContext';
import { useAppLocale } from '../contexts/AppLocaleContext';
import { hapticLight, hapticMedium } from '../lib/haptics';

const SITE_PUBLIC = process.env.EXPO_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://questia.fr';

function siteHostDisplay(base: string): string {
  try {
    return new URL(base.startsWith('http') ? base : `https://${base}`).hostname.replace(/^www\./, '');
  } catch {
    return 'questia.fr';
  }
}

/** 2ᵉ couleur du dégradé du bouton partage (orange plus profond, cohérent par thème). */
function orangeGradientEnd(orange: string): string {
  const map: Record<string, string> = {
    '#f97316': '#ea580c',
    '#fb923c': '#ea580c',
    '#ea580c': '#c2410c',
    '#c2410c': '#9a3412',
  };
  return map[orange] ?? '#ea580c';
}

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
  equippedTitleId?: string | null;
  progression?: {
    totalXp: number;
    level: number;
    xpIntoLevel: number;
    xpToNext: number;
    xpPerLevel: number;
  } | null;
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
  const [photoRotation, setPhotoRotation] = useState(0);
  const [photoFlipH, setPhotoFlipH] = useState(false);
  const [photoFlipV, setPhotoFlipV] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);

  const captureRefView = useRef<View>(null);

  const { palette, themeId } = useAppTheme();
  const appLocale = useAppLocale().locale;
  const shareLocale = appLocale === 'en' ? 'en' : 'fr';
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
      setPhotoRotation(0);
      setPhotoFlipH(false);
      setPhotoFlipV(false);
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
        setPhotoRotation(0);
        setPhotoFlipH(false);
        setPhotoFlipV(false);
      }
    } catch (e) {
      Alert.alert(
        'Appareil photo',
        e instanceof Error ? e.message : 'Impossible d’ouvrir l’appareil photo sur cet appareil.',
      );
    }
  }, []);

  const choosePhotoSource = useCallback(() => {
    hapticLight();
    setPhotoSheetOpen(true);
  }, []);

  const onPickGalleryFromSheet = useCallback(() => {
    hapticLight();
    setPhotoSheetOpen(false);
    requestAnimationFrame(() => {
      void pickFromLibrary();
    });
  }, [pickFromLibrary]);

  const onPickCameraFromSheet = useCallback(() => {
    hapticLight();
    setPhotoSheetOpen(false);
    requestAnimationFrame(() => {
      void takePhoto();
    });
  }, [takePhoto]);

  const hasPhotoTransforms = photoRotation % 360 !== 0 || photoFlipH || photoFlipV;

  const rotatePhotoLeft = useCallback(() => {
    hapticLight();
    setPhotoRotation((r) => (r - 90 + 360) % 360);
  }, []);

  const rotatePhotoRight = useCallback(() => {
    hapticLight();
    setPhotoRotation((r) => (r + 90) % 360);
  }, []);

  const flipPhotoHorizontal = useCallback(() => {
    hapticLight();
    setPhotoFlipH((v) => !v);
  }, []);

  const flipPhotoVertical = useCallback(() => {
    hapticLight();
    setPhotoFlipV((v) => !v);
  }, []);

  const resetPhotoEdits = useCallback(() => {
    hapticLight();
    setPhotoRotation(0);
    setPhotoFlipH(false);
    setPhotoFlipV(false);
  }, []);

  const photoLayerTransform = useMemo(
    () => [
      { rotate: `${photoRotation}deg` } as const,
      { scaleX: photoFlipH ? -1 : 1 },
      { scaleY: photoFlipV ? -1 : 1 },
    ],
    [photoRotation, photoFlipH, photoFlipV],
  );

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
        hapticMedium();
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
    <>
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
        <Text style={styles.photoHint}>
          Mets un cliché de ton moment — ta carte raconte mieux ton histoire.
        </Text>
        <Pressable
          onPress={choosePhotoSource}
          style={({ pressed }) => [styles.photoAddWrap, pressed && styles.photoAddWrapPressed]}
          accessibilityRole="button"
          accessibilityLabel="Ajouter une photo depuis la galerie ou l’appareil photo"
        >
          <LinearGradient
            colors={['#ecfeff', '#fffbeb', '#ffffff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.photoAddGradient}
          >
            <Text style={styles.photoAddEmoji} accessibilityElementsHidden>
              📷
            </Text>
            <View style={styles.photoAddTextCol}>
              <Text style={styles.photoAddTitle}>Ajouter une photo</Text>
              <Text style={styles.photoAddSub}>Galerie ou appareil — un coup de pouce pour briller</Text>
            </View>
          </LinearGradient>
        </Pressable>
        {photoUri ? (
          <>
            <Pressable
              onPress={() => {
                setPhotoUri(null);
                setPhotoRotation(0);
                setPhotoFlipH(false);
                setPhotoFlipV(false);
              }}
              style={styles.clearPhotoWrap}
            >
              <Text style={styles.clearPhoto}>Retirer la photo</Text>
            </Pressable>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.retouchRow}
            >
              <Pressable
                onPress={rotatePhotoLeft}
                style={({ pressed }) => [
                  styles.retouchChip,
                  pressed && styles.retouchChipPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Tourner à gauche"
              >
                <MaterialCommunityIcons name="rotate-left" size={22} color={palette.cyan} />
                <Text style={styles.retouchChipLabel}>Gauche</Text>
              </Pressable>
              <Pressable
                onPress={rotatePhotoRight}
                style={({ pressed }) => [
                  styles.retouchChip,
                  pressed && styles.retouchChipPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Tourner à droite"
              >
                <MaterialCommunityIcons name="rotate-right" size={22} color={palette.cyan} />
                <Text style={styles.retouchChipLabel}>Droite</Text>
              </Pressable>
              <Pressable
                onPress={flipPhotoHorizontal}
                style={({ pressed }) => [
                  styles.retouchChip,
                  pressed && styles.retouchChipPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Miroir horizontal"
              >
                <MaterialCommunityIcons name="flip-horizontal" size={22} color={palette.orange} />
                <Text style={styles.retouchChipLabel}>Miroir ↔</Text>
              </Pressable>
              <Pressable
                onPress={flipPhotoVertical}
                style={({ pressed }) => [
                  styles.retouchChip,
                  pressed && styles.retouchChipPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Miroir vertical"
              >
                <MaterialCommunityIcons name="flip-vertical" size={22} color={palette.orange} />
                <Text style={styles.retouchChipLabel}>Miroir ↕</Text>
              </Pressable>
              <Pressable
                onPress={resetPhotoEdits}
                disabled={!hasPhotoTransforms}
                style={({ pressed }) => [
                  styles.retouchChip,
                  !hasPhotoTransforms && styles.retouchChipDisabled,
                  pressed && hasPhotoTransforms && styles.retouchChipPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Annuler les retouches"
              >
                <MaterialCommunityIcons
                  name="backup-restore"
                  size={22}
                  color={!hasPhotoTransforms ? palette.muted : palette.text}
                />
                <Text
                  style={[
                    styles.retouchChipLabel,
                    !hasPhotoTransforms && styles.retouchChipLabelMuted,
                  ]}
                >
                  Réinit.
                </Text>
              </Pressable>
            </ScrollView>
          </>
        ) : null}

        <View style={styles.cardWrap}>
          <View
            ref={captureRefView}
            collapsable={false}
            style={[styles.cardOuter, { width: cardW, height: cardH }]}
          >
            {photoUri ? (
              <Image
                source={{ uri: photoUri }}
                style={[StyleSheet.absoluteFillObject, { transform: photoLayerTransform }]}
                resizeMode="cover"
              />
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
              <View style={[styles.cardTopRow, !photoUri && styles.cardTopRowSoloDate]}>
                {photoUri ? (
                  <>
                    <View style={styles.brandRow}>
                      <View style={styles.brandLogoWrap}>
                        <Image
                          source={require('../assets/icon.png')}
                          style={styles.brandLogoImg}
                          resizeMode="contain"
                          accessibilityIgnoresInvertColors
                        />
                      </View>
                      <View style={styles.brandTextCol}>
                        <Text style={[styles.brand, panelDark && styles.brandLight]}>QUESTIA</Text>
                        <Text style={styles.brandHostOnPhoto} numberOfLines={1}>
                          {siteHostDisplay(SITE_PUBLIC)}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.date, panelDark && styles.dateLight]} numberOfLines={2}>
                      {formatQuestDateFr(quest.questDate)}
                    </Text>
                  </>
                ) : (
                  <Text style={[styles.date, panelDark && styles.dateLight, styles.cardTopDateOnly]} numberOfLines={2}>
                    {formatQuestDateFr(quest.questDate)}
                  </Text>
                )}
              </View>

              {!photoUri ? (
                <View style={styles.cardHero}>
                  <Image
                    source={require('../assets/icon.png')}
                    style={styles.heroLogoImg}
                    resizeMode="contain"
                    accessibilityIgnoresInvertColors
                  />
                  <Text style={[styles.heroBrand, panelDark && styles.heroBrandLight]}>QUESTIA</Text>
                  <Text style={[styles.heroHost, panelDark && styles.heroHostLight]}>{siteHostDisplay(SITE_PUBLIC)}</Text>
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
                {(() => {
                  const eq = formatQuestShareEquippedTitleLine(quest.equippedTitleId);
                  const prog = quest.progression
                    ? formatQuestShareProgressionLine(
                        { level: quest.progression.level, totalXp: quest.progression.totalXp },
                        shareLocale,
                      )
                    : null;
                  if (!eq && !prog) return null;
                  return (
                    <Text style={[styles.shareProfileMeta, panelDark && styles.shareProfileMetaLight]}>
                      {[eq, prog].filter(Boolean).join('\n')}
                    </Text>
                  );
                })()}
                <Text style={[styles.hook, panelDark && styles.hookLight]}>« {truncate(quest.hook, 100)} »</Text>
                <Text style={[styles.footerName, panelDark && styles.footerNameLight]}>
                  {shareLocale === 'en' ? `${first} · Quest complete` : `${first} · Quête accomplie`}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <Pressable
          onPress={() => void shareImage()}
          disabled={exporting}
          style={({ pressed }) => [
            styles.shareBtnOuter,
            pressed && !exporting && styles.shareBtnOuterPressed,
            exporting && styles.shareBtnOuterBusy,
          ]}
        >
          <LinearGradient
            colors={[palette.orange, orangeGradientEnd(palette.orange)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.shareBtnGrad}
          >
            {exporting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.shareBtnText}>Partager ou enregistrer</Text>
            )}
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </SafeAreaView>

    <Modal
      visible={photoSheetOpen}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => setPhotoSheetOpen(false)}
    >
      <View style={styles.photoSheetRoot} accessibilityViewIsModal>
        <Pressable
          style={styles.photoSheetBackdrop}
          onPress={() => setPhotoSheetOpen(false)}
          accessibilityRole="button"
          accessibilityLabel="Fermer"
        />
        <SafeAreaView edges={['bottom']} style={styles.photoSheetSafe}>
          <LinearGradient
            colors={[palette.card, palette.surface]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.photoSheetCard}
          >
            <View style={styles.photoSheetHandle} accessibilityElementsHidden />
            <Text style={styles.photoSheetTitle}>Photo de fond</Text>
            <Text style={styles.photoSheetSubtitle}>Choisis comment ajouter ton image</Text>

            <Pressable
              onPress={onPickGalleryFromSheet}
              style={({ pressed }) => [styles.photoSheetOption, pressed && styles.photoSheetOptionPressed]}
              accessibilityRole="button"
              accessibilityLabel="Ouvrir la photothèque"
            >
              <View style={[styles.photoSheetIconWrap, { borderColor: `${palette.cyan}55` }]}>
                <Ionicons name="images-outline" size={26} color={palette.cyan} />
              </View>
              <View style={styles.photoSheetOptionTextCol}>
                <Text style={styles.photoSheetOptionTitle}>Photothèque</Text>
                <Text style={styles.photoSheetOptionHint}>Choisir une image existante</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={palette.muted} />
            </Pressable>

            <Pressable
              onPress={onPickCameraFromSheet}
              style={({ pressed }) => [styles.photoSheetOption, pressed && styles.photoSheetOptionPressed]}
              accessibilityRole="button"
              accessibilityLabel="Prendre une photo"
            >
              <View style={[styles.photoSheetIconWrap, { borderColor: `${palette.orange}55` }]}>
                <Ionicons name="camera-outline" size={26} color={palette.orange} />
              </View>
              <View style={styles.photoSheetOptionTextCol}>
                <Text style={styles.photoSheetOptionTitle}>Appareil photo</Text>
                <Text style={styles.photoSheetOptionHint}>Prendre une photo maintenant</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={palette.muted} />
            </Pressable>

            <Pressable
              onPress={() => {
                hapticLight();
                setPhotoSheetOpen(false);
              }}
              style={({ pressed }) => [styles.photoSheetDismiss, pressed && styles.photoSheetOptionPressed]}
              accessibilityRole="button"
            >
              <Text style={styles.photoSheetDismissText}>Annuler</Text>
            </Pressable>
          </LinearGradient>
        </SafeAreaView>
      </View>
    </Modal>
    </>
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
  photoHint: {
    fontSize: 13,
    fontWeight: '600',
    color: p.onCreamMuted,
    marginBottom: 12,
    lineHeight: 19,
    paddingHorizontal: 2,
  },
  photoAddWrap: {
    marginBottom: 10,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#0891b2',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
  },
  photoAddWrapPressed: { opacity: 0.94, transform: [{ scale: 0.99 }] },
  photoAddGradient: {
    borderWidth: 2,
    borderColor: 'rgba(34,211,238,0.58)',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  photoAddEmoji: { fontSize: 30, lineHeight: 34 },
  photoAddTextCol: { flex: 1, minWidth: 0 },
  photoAddTitle: { fontSize: 17, fontWeight: '900', color: '#0e7490', letterSpacing: -0.3 },
  photoAddSub: { fontSize: 12, fontWeight: '600', color: p.muted, marginTop: 4, lineHeight: 16 },
  clearPhotoWrap: { alignSelf: 'flex-end', marginBottom: 16 },
  clearPhoto: { color: p.muted, fontWeight: '800', fontSize: 13, textDecorationLine: 'underline' },
  retouchHint: {
    fontSize: 12,
    fontWeight: '600',
    color: p.muted,
    marginBottom: 12,
    lineHeight: 17,
    paddingHorizontal: 2,
  },
  retouchRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    paddingBottom: 4,
    marginBottom: 8,
  },
  retouchChip: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    minWidth: 76,
    borderRadius: 14,
    backgroundColor: p.card,
    borderWidth: 1,
    borderColor: p.border,
  },
  retouchChipPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  retouchChipDisabled: {
    opacity: 0.45,
  },
  retouchChipLabel: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: '800',
    color: p.text,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  retouchChipLabelMuted: {
    color: p.muted,
  },
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
  cardTopRowSoloDate: {
    justifyContent: 'flex-end',
  },
  cardTopDateOnly: {
    flex: 1,
    textAlign: 'right',
  },
  cardHero: {
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
  },
  cardHeroSpacer: {
    flex: 1,
    minHeight: 0,
  },
  heroLogoImg: {
    width: 112,
    height: 112,
    borderRadius: 26,
  },
  heroBrand: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 3.6,
    color: p.onCream,
  },
  heroBrandLight: { color: 'rgba(248,250,252,0.96)' },
  heroHost: {
    fontSize: 13,
    fontWeight: '800',
    color: p.onCreamMuted,
    letterSpacing: 0.3,
  },
  heroHostLight: { color: 'rgba(226,232,240,0.9)' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1, minWidth: 0 },
  brandTextCol: { flex: 1, minWidth: 0, justifyContent: 'center' },
  brandHostOnPhoto: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.35,
    color: 'rgba(248,250,252,0.92)',
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  brandLogoWrap: {
    width: 28,
    height: 28,
    borderRadius: 7,
    overflow: 'hidden',
    padding: 2,
  },
  brandLogoImg: { width: '100%', height: '100%' },
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
  shareProfileMeta: {
    fontSize: 10,
    fontWeight: '700',
    color: p.onCreamMuted,
    textAlign: 'left',
    marginTop: 10,
    lineHeight: 14,
  },
  shareProfileMetaLight: {
    color: 'rgba(226,232,240,0.88)',
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
  shareBtnOuter: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.38)',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 10,
  },
  shareBtnOuterPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.94,
  },
  shareBtnOuterBusy: {
    opacity: 0.78,
  },
  shareBtnGrad: {
    paddingVertical: 17,
    paddingHorizontal: 28,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 0.35,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  photoSheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  photoSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.52)',
  },
  photoSheetSafe: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  photoSheetCard: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 8,
    paddingHorizontal: 18,
    paddingBottom: 6,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: p.borderCyan,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  photoSheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: p.trackMuted,
    alignSelf: 'center',
    marginBottom: 14,
  },
  photoSheetTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: p.text,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  photoSheetSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: p.muted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 18,
    lineHeight: 18,
  },
  photoSheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginBottom: 10,
    backgroundColor: p.bg,
    borderWidth: 1,
    borderColor: p.border,
  },
  photoSheetOptionPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  photoSheetIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    backgroundColor: p.card,
  },
  photoSheetOptionTextCol: {
    flex: 1,
    minWidth: 0,
  },
  photoSheetOptionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: p.text,
    letterSpacing: -0.2,
  },
  photoSheetOptionHint: {
    fontSize: 12,
    fontWeight: '600',
    color: p.muted,
    marginTop: 2,
    lineHeight: 16,
  },
  photoSheetDismiss: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 4,
    marginBottom: 4,
  },
  photoSheetDismissText: {
    fontSize: 16,
    fontWeight: '800',
    color: p.muted,
  },
  primaryBtn: {
    backgroundColor: p.cyan,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  primaryBtnText: { color: p.onCream, fontWeight: '800', fontSize: 15 },
  });
}
