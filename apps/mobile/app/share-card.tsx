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
  Share,
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
  buildQuestShareMessage,
  buildWebAppQuestUrl,
  formatQuestDateFr,
  formatQuestShareEquippedTitleLine,
  formatQuestShareProgressionLine,
  getQuestShareBackgroundById,
  questDisplayEmoji,
} from '@questia/shared';
import {
  colorWithAlpha,
  shareScreenPhotoAddGradient,
  themePanelMuted,
  type ThemePalette,
} from '@questia/ui';
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
  const horizPad = compact ? 12 : 20;
  /** Même ratio que le web (360×640). Marge min pour très petits écrans. */
  const cardW = Math.max(260, Math.min(360, screenW - horizPad * 2));
  const cardH = Math.round((cardW * 640) / 360);
  const cardScale = cardW / 360;
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
  const [sharingLink, setSharingLink] = useState(false);
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);

  const captureRefView = useRef<View>(null);

  const { palette, themeId } = useAppTheme();
  const appLocale = useAppLocale().locale;
  const shareLocale = appLocale === 'en' ? 'en' : 'fr';
  const styles = useMemo(() => createShareStyles(palette, themeId, cardScale), [palette, themeId, cardScale]);
  const photoAddGrad = useMemo(
    () => shareScreenPhotoAddGradient(themeId, palette),
    [themeId, palette],
  );
  /** Voile sur la prévisualisation carte — teintes plus neutres en minuit (moins de décalage avec le fond app). */
  const cardPreviewOverlayPhoto = useMemo(
    () =>
      themeId === 'midnight'
        ? (['transparent', 'rgba(2,10,28,0.9)'] as const)
        : (['transparent', 'rgba(15,23,42,0.85)'] as const),
    [themeId],
  );
  const cardPreviewOverlayNoPhoto = useMemo(
    () =>
      themeId === 'midnight'
        ? (['rgba(0,0,0,0.22)', 'transparent', 'rgba(0,0,0,0.38)'] as const)
        : (['rgba(15,23,42,0.08)', 'transparent', 'rgba(15,23,42,0.22)'] as const),
    [themeId],
  );
  const fallbackWebUrl = useMemo(() => buildWebAppQuestUrl(SITE_PUBLIC), []);

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
        setError("Valide d'abord la quête — la carte sera disponible ensuite.");
        setQuest(null);
        return;
      }
      setQuest(data);
    } catch {
      setError("Impossible de joindre l'API.");
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
      Alert.alert('Accès refusé', "Autorise l'accès à la photothèque pour choisir une image.");
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
      Alert.alert('Accès refusé', "Autorise l'accès à l'appareil photo pour prendre une image.");
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
        e instanceof Error ? e.message : "Impossible d'ouvrir l'appareil photo sur cet appareil.",
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

  const dismissPhotoSheet = useCallback(() => {
    hapticLight();
    setPhotoSheetOpen(false);
  }, []);

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

  const resolveShareUrl = useCallback(async (): Promise<string> => {
    if (!quest) return fallbackWebUrl;
    try {
      const token = await getTokenRef.current();
      const res = await apiFetch(`${API_BASE_URL}/api/quest/share`, token, {
        method: 'POST',
        body: JSON.stringify({ questDate: quest.questDate }),
      });
      if (!res.ok) return fallbackWebUrl;
      const json = (await res.json()) as { webUrl?: string };
      return typeof json.webUrl === 'string' && json.webUrl.trim() ? json.webUrl.trim() : fallbackWebUrl;
    } catch {
      return fallbackWebUrl;
    }
  }, [quest, fallbackWebUrl]);

  const shareImage = async () => {
    if (!captureRefView.current || !quest) return;
    setExporting(true);
    try {
      const uri = await captureRef(captureRefView, {
        format: 'png',
        quality: 1,
      });
      const webUrl = await resolveShareUrl();
      const shareText = buildQuestShareMessage({
        title: quest.title,
        webUrl,
        equippedTitleLine: formatQuestShareEquippedTitleLine(quest.equippedTitleId),
        progressionLine: quest.progression
          ? formatQuestShareProgressionLine(
              { level: quest.progression.level, totalXp: quest.progression.totalXp },
              shareLocale,
            )
          : null,
      });

      try {
        await Share.share({
          title: 'Ma quête Questia',
          message: shareText,
          url: uri,
        });
        hapticMedium();
      } catch {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            dialogTitle: 'Partager ma quête Questia',
          });
          hapticMedium();
        } else {
          Alert.alert('Partage indisponible', "Le partage n'est pas disponible sur cet appareil.");
        }
      }
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Export impossible');
    } finally {
      setExporting(false);
    }
  };

  const shareLink = useCallback(async () => {
    if (!quest) return;
    setSharingLink(true);
    try {
      const webUrl = await resolveShareUrl();
      const shareText = buildQuestShareMessage({
        title: quest.title,
        webUrl,
        equippedTitleLine: formatQuestShareEquippedTitleLine(quest.equippedTitleId),
        progressionLine: quest.progression
          ? formatQuestShareProgressionLine(
              { level: quest.progression.level, totalXp: quest.progression.totalXp },
              shareLocale,
            )
          : null,
      });
      await Share.share({
        title: 'Ma quête Questia',
        message: shareText,
      });
      hapticMedium();
    } catch (e) {
      if (e instanceof Error) {
        Alert.alert('Partage du lien', e.message);
      } else {
        Alert.alert('Partage indisponible', "Le partage n'est pas disponible sur cet appareil.");
      }
    } finally {
      setSharingLink(false);
    }
  }, [quest, resolveShareUrl, shareLocale]);

  const first = user?.firstName ?? 'Aventurier·e';
  const bg = getQuestShareBackgroundById(bgId);
  const panelDark = bg.darkForeground && !photoUri;
  const panelBg = panelDark
    ? colorWithAlpha('#0f172a', 0.76)
    : colorWithAlpha(palette.card, 0.82);
  const panelBorder = panelDark
    ? colorWithAlpha('#ffffff', 0.16)
    : colorWithAlpha('#ffffff', 0.65);
  const scrollBottomPad = 28;

  const photoSheetInner = (
    <>
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
        onPress={dismissPhotoSheet}
        style={({ pressed }) => [styles.photoSheetDismiss, pressed && styles.photoSheetOptionPressed]}
        accessibilityRole="button"
      >
        <Text style={styles.photoSheetDismissText}>Annuler</Text>
      </Pressable>
    </>
  );

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
      <View style={[styles.topBar, { paddingHorizontal: compact ? 10 : 16 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ flexShrink: 0 }}>
          <Text style={styles.back}>← Retour</Text>
        </Pressable>
        <Text style={styles.topTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>
          Carte à partager
        </Text>
        <View style={{ width: compact ? 56 : 72 }} />
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
          style={({ pressed }) => [
            styles.photoAddWrap,
            themeId === 'midnight' && styles.photoAddWrapMidnight,
            pressed && styles.photoAddWrapPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Ajouter une photo depuis la galerie ou l'appareil photo"
        >
          <LinearGradient
            colors={photoAddGrad}
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
              colors={photoUri ? [...cardPreviewOverlayPhoto] : [...cardPreviewOverlayNoPhoto]}
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
                  <View style={styles.heroLogoOuter}>
                    <Image
                      source={require('../assets/icon.png')}
                      style={styles.heroLogoImg}
                      resizeMode="contain"
                      accessibilityIgnoresInvertColors
                    />
                  </View>
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
                      {truncate(quest.title, Math.max(28, Math.floor(56 * cardScale)))}
                    </Text>
                    <Text style={[styles.missionHero, panelDark && styles.missionHeroLight]}>
                      {truncate(quest.mission, Math.max(48, Math.floor(118 * cardScale)))}
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
                <Text style={[styles.hook, panelDark && styles.hookLight]}>
                  « {truncate(quest.hook, Math.max(40, Math.floor(100 * cardScale)))} »
                </Text>
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
            themeId === 'midnight' && styles.shareBtnOuterMidnight,
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
        <Pressable
          onPress={() => void shareLink()}
          disabled={sharingLink}
          style={({ pressed }) => [
            styles.linkBtn,
            pressed && !sharingLink && styles.linkBtnPressed,
            sharingLink && styles.linkBtnBusy,
          ]}
        >
          <Text style={styles.linkBtnText}>
            {sharingLink ? 'Partage du lien...' : 'Partager le lien unique'}
          </Text>
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
          {themeId === 'midnight' ? (
            <View style={[styles.photoSheetCard, styles.photoSheetCardSolid]}>{photoSheetInner}</View>
          ) : (
            <LinearGradient
              colors={[palette.card, palette.surface]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.photoSheetCard}
            >
              {photoSheetInner}
            </LinearGradient>
          )}
        </SafeAreaView>
      </View>
    </Modal>
    </>
  );
}

/** Met à l'échelle les mesures de la carte (référence 360 px de large) pour petits écrans. */
function sc(cardScale: number, n: number, opts?: { min?: number; max?: number }) {
  const v = Math.round(n * cardScale);
  if (opts?.min != null) return Math.max(opts.min, v);
  if (opts?.max != null) return Math.min(opts.max, v);
  return v;
}

function createShareStyles(p: ThemePalette, themeId: string, cardScale: number) {
  const screenMuted = themePanelMuted(themeId, p);
  const cardFrameBg = themeId === 'midnight' ? p.surface : colorWithAlpha(p.text, 0.92);
  const S = (n: number, o?: { min?: number; max?: number }) => sc(cardScale, n, o);
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: p.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
  muted: { color: p.muted, fontSize: 14 },
  err: { color: p.orange, textAlign: 'center', fontSize: 14, fontWeight: '700' },
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
  topTitle: { fontWeight: '900', fontSize: 15, color: p.text, flex: 1, textAlign: 'center', paddingHorizontal: 4 },
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
    color: screenMuted,
    marginBottom: 12,
    lineHeight: 19,
    paddingHorizontal: 2,
  },
  photoAddWrap: {
    marginBottom: 10,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: p.cyan,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
  },
  /** Sur minuit : pas d'élévation sur le même nœud que le LinearGradient (artefacts Android) — bordure à la place. */
  photoAddWrapMidnight: {
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    borderWidth: 1,
    borderColor: colorWithAlpha(p.cyan, 0.32),
  },
  photoAddWrapPressed: { opacity: 0.94, transform: [{ scale: 0.99 }] },
  photoAddGradient: {
    borderWidth: 2,
    borderColor: colorWithAlpha(p.cyan, 0.55),
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  photoAddEmoji: { fontSize: 30, lineHeight: 34 },
  photoAddTextCol: { flex: 1, minWidth: 0 },
  photoAddTitle: { fontSize: 17, fontWeight: '900', color: p.linkOnBg, letterSpacing: -0.3 },
  photoAddSub: { fontSize: 12, fontWeight: '600', color: screenMuted, marginTop: 4, lineHeight: 16 },
  clearPhotoWrap: { alignSelf: 'flex-end', marginBottom: 16 },
  clearPhoto: { color: p.muted, fontWeight: '800', fontSize: 13, textDecorationLine: 'underline' },
  retouchHint: {
    fontSize: 12,
    fontWeight: '600',
    color: screenMuted,
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
  cardWrap: { alignItems: 'center', alignSelf: 'stretch', marginBottom: 24 },
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
    paddingHorizontal: S(16, { min: 10 }),
    paddingTop: S(14, { min: 10 }),
    paddingBottom: S(4),
    gap: S(12, { min: 8 }),
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
    minHeight: S(48, { min: 36 }),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: S(12, { min: 8 }),
    gap: S(10, { min: 6 }),
  },
  cardHeroSpacer: {
    flex: 1,
    minHeight: 0,
  },
  heroLogoOuter: {
    width: S(112, { min: 72, max: 112 }),
    height: S(112, { min: 72, max: 112 }),
    borderRadius: S(26, { min: 18 }),
    backgroundColor: p.card,
    padding: S(10, { min: 6 }),
    borderWidth: 1,
    borderColor: colorWithAlpha(p.text, 0.1),
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroLogoImg: {
    width: '100%',
    height: '100%',
  },
  heroBrand: {
    fontSize: S(12, { min: 10 }),
    fontWeight: '900',
    letterSpacing: S(3.6, { min: 2.4 }),
    color: p.onCream,
  },
  heroBrandLight: { color: 'rgba(248,250,252,0.96)' },
  heroHost: {
    fontSize: S(13, { min: 11 }),
    fontWeight: '800',
    color: p.onCreamMuted,
    letterSpacing: 0.3,
  },
  heroHostLight: { color: 'rgba(226,232,240,0.9)' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1, minWidth: 0 },
  brandTextCol: { flex: 1, minWidth: 0, justifyContent: 'center' },
  brandHostOnPhoto: {
    fontSize: S(10, { min: 9 }),
    fontWeight: '700',
    marginTop: S(2),
    letterSpacing: 0.35,
    color: 'rgba(248,250,252,0.92)',
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  brandLogoWrap: {
    width: S(28, { min: 22 }),
    height: S(28, { min: 22 }),
    borderRadius: S(7, { min: 5 }),
    overflow: 'hidden',
    padding: 2,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.12)',
  },
  brandLogoImg: { width: '100%', height: '100%' },
  brand: { fontSize: S(10, { min: 9 }), fontWeight: '900', letterSpacing: S(3.2, { min: 2 }), color: p.onCream },
  brandLight: { color: 'rgba(248,250,252,0.95)' },
  date: {
    fontSize: S(11, { min: 9 }),
    fontWeight: '600',
    color: p.onCreamMuted,
    textAlign: 'right',
    flexShrink: 1,
    maxWidth: S(200, { min: 120, max: 200 }),
    lineHeight: S(15, { min: 13 }),
  },
  dateLight: { color: 'rgba(248,250,252,0.92)' },
  panel: {
    marginHorizontal: S(14, { min: 8 }),
    marginBottom: S(16, { min: 10 }),
    borderRadius: S(20, { min: 14 }),
    padding: S(15, { min: 10 }),
    borderWidth: 1,
  },
  panelTop: {
    flexDirection: 'row',
    gap: S(12, { min: 8 }),
    alignItems: 'flex-start',
    marginBottom: S(12, { min: 8 }),
  },
  bigEmoji: { fontSize: S(40, { min: 28 }), lineHeight: S(44, { min: 32 }), marginTop: S(2) },
  panelText: { flex: 1 },
  titleEyebrow: {
    fontSize: S(10, { min: 8 }),
    fontWeight: '800',
    letterSpacing: S(2.2, { min: 1.4 }),
    color: p.onCreamMuted,
    marginBottom: S(8, { min: 5 }),
    textTransform: 'uppercase',
  },
  titleEyebrowLight: { color: 'rgba(148,163,184,0.95)' },
  missionHero: {
    fontSize: S(19, { min: 14, max: 21 }),
    fontWeight: '900',
    color: p.onCream,
    lineHeight: S(25, { min: 19, max: 27 }),
    letterSpacing: -0.3,
  },
  missionHeroLight: { color: '#f8fafc' },
  metaCompact: {
    fontSize: S(11, { min: 9 }),
    fontWeight: '600',
    color: p.onCreamMuted,
    textAlign: 'left',
    paddingTop: S(10, { min: 7 }),
    marginBottom: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148,163,184,0.28)',
  },
  metaCompactLight: {
    color: 'rgba(226,232,240,0.88)',
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  shareProfileMeta: {
    fontSize: S(10, { min: 8 }),
    fontWeight: '700',
    color: p.onCreamMuted,
    textAlign: 'left',
    marginTop: S(10, { min: 7 }),
    lineHeight: S(14, { min: 12 }),
  },
  shareProfileMetaLight: {
    color: 'rgba(226,232,240,0.88)',
  },
  hook: {
    fontSize: S(12, { min: 10 }),
    fontStyle: 'italic',
    color: p.onCreamMuted,
    marginTop: S(12, { min: 8 }),
    marginBottom: S(12, { min: 8 }),
    lineHeight: S(18, { min: 15 }),
    textAlign: 'left',
  },
  hookLight: { color: 'rgba(226,232,240,0.9)' },
  footerName: { fontSize: S(12, { min: 10 }), fontWeight: '900', color: p.linkOnBg, textAlign: 'center' },
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
  shareBtnOuterMidnight: {
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    borderWidth: 1,
    borderColor: colorWithAlpha(p.orange, 0.45),
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
  linkBtn: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colorWithAlpha(p.cyan, 0.55),
    backgroundColor: colorWithAlpha(p.cyan, 0.12),
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  linkBtnBusy: {
    opacity: 0.65,
  },
  linkBtnText: {
    color: p.linkOnBg,
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.2,
  },
  photoSheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  photoSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: p.overlay,
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
  },
  /** Minuit : fond uni (pas de dégradé + elevation sur le même conteneur) pour éviter les artefacts. */
  photoSheetCardSolid: {
    backgroundColor: p.surface,
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
  primaryBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 15 },
  });
}
