import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colorWithAlpha, type ThemePalette } from '@questia/ui';
import { useAppTheme } from '../contexts/AppThemeContext';

type Option = { id: string; label: string };
export type RefinementQuestionUi = {
  id: string;
  prompt: string;
  helpText?: string;
  options: Option[];
};

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

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

function makeStyles(p: ThemePalette) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: p.overlay,
      justifyContent: 'flex-end',
    },
    sheet: {
      maxHeight: '90%',
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: 'rgba(253, 186, 116, 0.45)',
      shadowColor: '#f97316',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 12,
    },
    sheetGradient: {
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 24,
      flex: 1,
      maxHeight: '100%',
    },
    topBar: { height: 5, width: '100%' },
    topRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 8 },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
      borderWidth: 1,
      borderColor: colorWithAlpha(p.cyan, 0.25),
      backgroundColor: colorWithAlpha(p.cyan, 0.12),
    },
    iconEmoji: { fontSize: 22 },
    kicker: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1,
      color: p.muted,
      textTransform: 'uppercase',
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      color: p.text,
      lineHeight: 22,
    },
    skipBtn: {
      paddingVertical: 6,
      paddingHorizontal: 4,
    },
    skipText: {
      fontSize: 12,
      fontWeight: '700',
      color: p.linkOnBg,
      textDecorationLine: 'underline',
    },
    progressRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    progressLabel: { fontSize: 11, fontWeight: '700', color: p.muted },
    progressNums: { fontSize: 11, fontWeight: '800', color: p.text },
    track: {
      height: 7,
      borderRadius: 999,
      backgroundColor: p.trackMuted,
      overflow: 'hidden',
      marginBottom: 16,
    },
    trackFill: { height: '100%', borderRadius: 999 },
    stepBody: {
      flex: 1,
      minHeight: 200,
    },
    block: {
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: p.border,
      backgroundColor: colorWithAlpha(p.card, 0.95),
    },
    qBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      marginBottom: 10,
      backgroundColor: colorWithAlpha(p.cyan, 0.15),
      borderWidth: 1,
      borderColor: colorWithAlpha(p.cyan, 0.28),
    },
    qBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.8,
      color: p.linkOnBg,
      textTransform: 'uppercase',
    },
    q: { fontSize: 17, fontWeight: '800', color: p.onCream, lineHeight: 24 },
    help: { fontSize: 12, color: p.onCreamMuted, marginTop: 8, marginBottom: 14, lineHeight: 18 },
    optionList: { marginTop: 4 },
    chip: {
      marginBottom: 10,
      paddingHorizontal: 14,
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 1,
    },
    chipOn: {
      borderColor: p.cyan,
      backgroundColor: colorWithAlpha(p.cyan, 0.14),
      shadowColor: p.cyan,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.18,
      shadowRadius: 6,
      elevation: 2,
    },
    chipOff: {
      borderColor: p.border,
      backgroundColor: colorWithAlpha(p.inputBg, 0.9),
    },
    chipInner: { flexDirection: 'row', alignItems: 'flex-start' },
    radio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      marginTop: 1,
      marginRight: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioOn: { borderColor: p.cyan, backgroundColor: p.cyan },
    radioOff: { borderColor: p.border, backgroundColor: p.card },
    chipText: { fontSize: 13, color: p.onCreamMuted, flex: 1, lineHeight: 20 },
    chipTextOn: { color: p.onCream, fontWeight: '700' },
    checkMark: { color: '#fff', fontSize: 12, fontWeight: '900' },
    hint: {
      fontSize: 11,
      color: p.subtle,
      textAlign: 'center',
      marginTop: 12,
      lineHeight: 16,
    },
    consentBlock: {
      borderRadius: 18,
      padding: 18,
      borderWidth: 1,
      borderColor: p.border,
      backgroundColor: colorWithAlpha(p.cardCream, 0.98),
    },
    consentEmoji: { fontSize: 32, textAlign: 'center', marginBottom: 8 },
    consentTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: p.onCream,
      textAlign: 'center',
      marginBottom: 6,
    },
    consentSub: {
      fontSize: 13,
      color: p.onCreamMuted,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 16,
    },
    consentBox: {
      padding: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: p.border,
      backgroundColor: colorWithAlpha(p.card, 0.9),
    },
    consentRow: { flexDirection: 'row', alignItems: 'flex-start' },
    switchWrap: { marginRight: 10 },
    consentText: { flex: 1, fontSize: 12, color: p.onCreamMuted, lineHeight: 18 },
    err: { color: '#b91c1c', fontSize: 13, marginTop: 10, textAlign: 'center', fontWeight: '600' },
    footer: {
      marginTop: 14,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: p.divider,
    },
    footerRow: { flexDirection: 'row', alignItems: 'center' },
    btnGhost: {
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: p.border,
      backgroundColor: colorWithAlpha(p.surface, 0.95),
      marginRight: 8,
    },
    btnGhostText: { color: p.muted, fontWeight: '800', fontSize: 14 },
    btnHint: {
      flex: 1,
      fontSize: 11,
      color: p.muted,
      lineHeight: 16,
      paddingHorizontal: 6,
    },
    btnPrimary: {
      flex: 1,
      borderRadius: 16,
      overflow: 'hidden',
    },
    btnPrimaryInner: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
    btnPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  });
}

function RefinementSheet({
  visible,
  questions,
  consentNotice,
  getToken,
  onDone,
}: {
  visible: boolean;
  questions: RefinementQuestionUi[];
  consentNotice: string;
  getToken: () => Promise<string | null>;
  onDone: () => void;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const totalSteps = questions.length + 1;
  const isConsentStep = step >= questions.length;
  const currentQuestion = !isConsentStep ? questions[step] : null;
  const progressPct = totalSteps ? ((step + 1) / totalSteps) * 100 : 0;

  const allAnswered = useMemo(
    () => questions.every((q) => answers[q.id]),
    [answers, questions],
  );

  useEffect(() => {
    if (visible) {
      setStep(0);
      setErr(null);
    }
  }, [visible]);

  const pickOption = useCallback(
    (qid: string, oid: string, qIndex: number) => {
      const changed = answers[qid] !== oid;
      setAnswers((p) => ({ ...p, [qid]: oid }));
      if (!changed) return;
      if (qIndex < questions.length - 1) {
        setTimeout(() => setStep((s) => s + 1), 220);
      } else {
        setTimeout(() => setStep(questions.length), 220);
      }
    },
    [answers, questions.length],
  );

  const goBack = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
    setErr(null);
  }, []);

  const submit = useCallback(async () => {
    if (!allAnswered || !consent) return;
    setBusy(true);
    setErr(null);
    try {
      const token = await getToken();
      const res = await apiFetch(`${API_BASE}/api/profile/refinement`, token, {
        method: 'POST',
        body: JSON.stringify({ answers, consent: true }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(j.error ?? 'Erreur');
        return;
      }
      onDone();
    } finally {
      setBusy(false);
    }
  }, [allAnswered, answers, consent, getToken, onDone]);

  const skip = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const token = await getToken();
      await apiFetch(`${API_BASE}/api/profile/refinement`, token, {
        method: 'POST',
        body: JSON.stringify({ skip: true }),
      });
      onDone();
    } finally {
      setBusy(false);
    }
  }, [getToken, onDone]);

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <LinearGradient
            colors={['#22d3ee', '#fbbf24', '#f97316']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.topBar}
          />
          <LinearGradient
            colors={[palette.cardCream, palette.card, palette.surface]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.4, y: 1 }}
            style={styles.sheetGradient}
          >
            <View style={styles.topRow}>
              <View style={styles.headerLeft}>
                <View style={styles.iconWrap}>
                  <Text style={styles.iconEmoji}>✨</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.kicker}>Personnalisation</Text>
                  <Text style={styles.title} numberOfLines={2}>
                    Tes préférences
                  </Text>
                </View>
              </View>
              <Pressable onPress={() => void skip()} disabled={busy} style={styles.skipBtn} hitSlop={8}>
                <Text style={[styles.skipText, busy && { opacity: 0.45 }]}>Plus tard</Text>
              </Pressable>
            </View>

            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>
                {isConsentStep ? 'Dernière étape' : `Étape ${step + 1} sur ${totalSteps}`}
              </Text>
              <Text style={styles.progressNums}>
                {step + 1} / {totalSteps}
              </Text>
            </View>
            <View style={styles.track}>
              <LinearGradient
                colors={[palette.cyan, '#14b8a6', palette.gold]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={[styles.trackFill, { width: `${progressPct}%` }]}
              />
            </View>

            <View style={styles.stepBody}>
              {!isConsentStep && currentQuestion ? (
                <View style={styles.block}>
                  <View style={styles.qBadge}>
                    <Text style={styles.qBadgeText}>Question {step + 1}</Text>
                  </View>
                  <Text style={styles.q}>{currentQuestion.prompt}</Text>
                  {currentQuestion.helpText ? <Text style={styles.help}>{currentQuestion.helpText}</Text> : null}
                  <View style={styles.optionList}>
                    {currentQuestion.options.map((opt) => {
                      const sel = answers[currentQuestion.id] === opt.id;
                      return (
                        <Pressable
                          key={opt.id}
                          onPress={() => pickOption(currentQuestion.id, opt.id, step)}
                          style={[styles.chip, sel ? styles.chipOn : styles.chipOff]}
                        >
                          <View style={styles.chipInner}>
                            <View style={[styles.radio, sel ? styles.radioOn : styles.radioOff]}>
                              {sel ? <Text style={styles.checkMark}>✓</Text> : null}
                            </View>
                            <Text style={[styles.chipText, sel && styles.chipTextOn]}>{opt.label}</Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Text style={styles.hint}>Un choix fait avancer à l’étape suivante</Text>
                </View>
              ) : (
                <View style={styles.consentBlock}>
                  <Text style={styles.consentEmoji}>🔒</Text>
                  <Text style={styles.consentTitle}>Presque fini</Text>
                  <Text style={styles.consentSub}>
                    Confirme ton accord pour qu’on adapte tes quêtes à ces préférences.
                  </Text>
                  <View style={styles.consentBox}>
                    <View style={styles.consentRow}>
                      <View style={styles.switchWrap}>
                        <Switch
                          value={consent}
                          onValueChange={setConsent}
                          trackColor={{ false: palette.trackMuted, true: colorWithAlpha(palette.cyan, 0.45) }}
                          thumbColor={consent ? palette.cyan : '#f4f4f5'}
                        />
                      </View>
                      <Text style={styles.consentText}>{consentNotice}</Text>
                    </View>
                  </View>
                </View>
              )}
              {err ? <Text style={styles.err}>{err}</Text> : null}
            </View>

            <View style={styles.footer}>
              <View style={styles.footerRow}>
                <Pressable
                  onPress={goBack}
                  disabled={step === 0 || busy}
                  style={({ pressed }) => [
                    styles.btnGhost,
                    (step === 0 || busy) && { opacity: 0.35 },
                    pressed && step > 0 && !busy && { opacity: 0.88 },
                  ]}
                >
                  <Text style={styles.btnGhostText}>← Préc.</Text>
                </Pressable>
                {isConsentStep ? (
                  <View style={[styles.btnPrimary, (!consent || !allAnswered) && { opacity: 0.45 }]}>
                    <LinearGradient
                      colors={[palette.orange, palette.gold]}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={{ borderRadius: 16, flex: 1 }}
                    >
                      <Pressable
                        onPress={() => void submit()}
                        disabled={!consent || !allAnswered || busy}
                        style={styles.btnPrimaryInner}
                      >
                        {busy ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={styles.btnPrimaryText}>Enregistrer ✓</Text>
                        )}
                      </Pressable>
                    </LinearGradient>
                  </View>
                ) : (
                  <Text style={styles.btnHint}>Réponds à la question pour continuer</Text>
                )}
              </View>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

export default RefinementSheet;
