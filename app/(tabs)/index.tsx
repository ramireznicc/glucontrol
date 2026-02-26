import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  Alert,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Text, Button, IconButton } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../constants/theme';
import ScreenWrapper from '../../components/ScreenWrapper';
import GlucoseChart from '../../components/GlucoseChart';
import {
  getEntriesByDate,
  getSettings,
  deleteGlucose,
  deleteMeal,
  deleteExercise,
  deleteInsulin,
} from '../../lib/database';
import { estimateGlucoseAtTime } from '../../lib/glucoseEstimator';

// ─── Types ────────────────────────────────────────────────────────────────────

type EntryType = 'glucose' | 'meal' | 'exercise' | 'insulin';

type AnyEntry = {
  id: number;
  entry_type: EntryType;
  timestamp: string;
  [key: string]: any;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getLocalDateStr = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const addDays = (dateStr: string, n: number): string => {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatDateLabel = (dateStr: string): string => {
  const todayStr = getLocalDateStr();
  if (dateStr === todayStr) return 'Hoy';
  if (dateStr === addDays(todayStr, -1)) return 'Ayer';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
};

const getTime = (ts: string): string => ts.slice(11, 16);

const getGreeting = (name?: string): string => {
  const h = new Date().getHours();
  const saludo = h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches';
  return name?.trim() ? `${saludo}, ${name.trim()} 👋` : `${saludo} 👋`;
};

const getGlucoseColor = (value: number, min: number, max: number): string => {
  if (value < min - 20 || value > max + 50) return COLORS.danger;
  if (value < min || value > max) return COLORS.warning;
  return COLORS.success;
};

const READING_LABELS: Record<string, string> = {
  ayunas: 'Ayunas',
  pre_comida: 'Pre-comida',
  post_comida: 'Post-comida',
  dormir: 'Antes de dormir',
  otro: 'Otro',
};

const MEAL_LABELS: Record<string, string> = {
  desayuno: 'Desayuno',
  almuerzo: 'Almuerzo',
  merienda: 'Merienda',
  cena: 'Cena',
  snack: 'Snack',
};

const EXERCISE_LABELS: Record<string, string> = {
  cardio: 'Cardio',
  fuerza: 'Fuerza',
  caminata: 'Caminata',
  otro: 'Otro',
};

const INTENSITY_LABELS: Record<string, string> = {
  baja: 'Baja',
  moderada: 'Moderada',
  alta: 'Alta',
};

const ENTRY_DOT: Record<EntryType, string> = {
  glucose: '#F87171',
  insulin: '#818CF8',
  meal: '#34D399',
  exercise: '#FBBF24',
};

const ENTRY_BG: Record<EntryType, string> = {
  glucose: '#FFF1F2',
  insulin: '#EEF2FF',
  meal: '#F0FDF4',
  exercise: '#FFFBEB',
};

const ENTRY_EMOJI: Record<EntryType, string> = {
  glucose: '🩸',
  insulin: '💉',
  meal: '🍽️',
  exercise: '🏃',
};

// ─── Glucose status ───────────────────────────────────────────────────────────

type StatusLevel = 'good' | 'low_warn' | 'high_warn' | 'low_danger' | 'high_danger';

function getStatusLevel(value: number, min: number, max: number): StatusLevel {
  if (value < min - 20) return 'low_danger';
  if (value > max + 50) return 'high_danger';
  if (value < min)      return 'low_warn';
  if (value > max)      return 'high_warn';
  return 'good';
}

const STATUS_CONFIG: Record<StatusLevel, {
  emoji: string;
  title: string;
  subtitle: string;
  color: string;
  bg: string;
  border: string;
}> = {
  good: {
    emoji: '😊',
    title: 'Tu glucemia debería estar bien',
    subtitle: 'Estarías dentro de tu rango objetivo',
    color: COLORS.success,
    bg: '#F0FDF4',
    border: '#BBF7D0',
  },
  low_warn: {
    emoji: '😐',
    title: 'Glucemia posiblemente un poco baja',
    subtitle: 'Podría estar levemente por debajo del rango',
    color: COLORS.warning,
    bg: '#FFFBEB',
    border: '#FDE68A',
  },
  high_warn: {
    emoji: '😐',
    title: 'Glucemia posiblemente un poco alta',
    subtitle: 'Podría estar levemente por encima del rango',
    color: COLORS.warning,
    bg: '#FFFBEB',
    border: '#FDE68A',
  },
  low_danger: {
    emoji: '😟',
    title: 'Glucemia posiblemente baja',
    subtitle: 'Podría estar bastante por debajo del rango',
    color: COLORS.danger,
    bg: '#FFF1F2',
    border: '#FECDD3',
  },
  high_danger: {
    emoji: '😟',
    title: 'Glucemia posiblemente alta',
    subtitle: 'Podría estar bastante por encima del rango',
    color: COLORS.danger,
    bg: '#FFF1F2',
    border: '#FECDD3',
  },
};

function GlucoseStatusCard({
  estimated,
  settings,
}: {
  estimated: number;
  settings: Record<string, string>;
}) {
  const min = parseFloat(settings.target_min ?? '80');
  const max = parseFloat(settings.target_max ?? '130');
  const level = getStatusLevel(estimated, min, max);
  const cfg = STATUS_CONFIG[level];

  return (
    <View style={[styles.statusCard, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <Text style={styles.statusEmoji}>{cfg.emoji}</Text>
      <Text style={[styles.statusTitle, { color: cfg.color }]}>{cfg.title}</Text>
      <Text style={styles.statusSubtitle}>{cfg.subtitle}</Text>
      <Text style={[styles.statusValue, { color: cfg.color }]}>
        ~{Math.round(estimated)} mg/dL
      </Text>
      <View style={styles.statusDivider} />
      <Text style={styles.statusDisclaimer}>
        📊 Estimación según los datos aportados hoy{'\n'}
        🩸 Para mayor seguridad, realizá un control con tu glucómetro
      </Text>
    </View>
  );
}

// ─── Entry card content ───────────────────────────────────────────────────────

function EntryContent({
  entry,
  settings,
}: {
  entry: AnyEntry;
  settings: Record<string, string>;
}) {
  const min = parseFloat(settings.target_min ?? '80');
  const max = parseFloat(settings.target_max ?? '130');

  switch (entry.entry_type) {
    case 'glucose': {
      const color = getGlucoseColor(entry.value, min, max);
      const label = entry.value < min ? 'Bajo' : entry.value > max ? 'Alto' : 'OK';
      return (
        <View>
          <View style={styles.inlineRow}>
            <Text style={[styles.cardPrimary, { color }]}>{entry.value} mg/dL</Text>
            <View style={[styles.badge, { backgroundColor: color }]}>
              <Text style={styles.badgeText}>{label}</Text>
            </View>
          </View>
          <Text style={styles.cardSecondary}>
            {READING_LABELS[entry.reading_type] ?? entry.reading_type}
          </Text>
        </View>
      );
    }
    case 'insulin': {
      const brand = entry.brand_name ? ` · ${entry.brand_name}` : '';
      const type = entry.insulin_type === 'rapida' ? 'Rápida' : 'Lenta';
      return (
        <View>
          <Text style={styles.cardPrimary}>{entry.units} u{brand}</Text>
          <Text style={styles.cardSecondary}>{type}</Text>
        </View>
      );
    }
    case 'meal': {
      const carbs = entry.carbs_grams != null ? ` · ${entry.carbs_grams}g carbs` : '';
      return (
        <View>
          <Text style={styles.cardPrimary} numberOfLines={1}>{entry.description}</Text>
          <Text style={styles.cardSecondary}>
            {MEAL_LABELS[entry.meal_type] ?? entry.meal_type}{carbs}
          </Text>
        </View>
      );
    }
    case 'exercise': {
      const type = EXERCISE_LABELS[entry.exercise_type] ?? entry.exercise_type;
      const intensity = entry.intensity
        ? ` · ${INTENSITY_LABELS[entry.intensity] ?? entry.intensity}`
        : '';
      return (
        <View>
          <Text style={styles.cardPrimary}>{type} · {entry.duration_minutes} min</Text>
          <Text style={styles.cardSecondary}>Intensidad{intensity}</Text>
        </View>
      );
    }
    default:
      return null;
  }
}

// ─── Timeline Entry ───────────────────────────────────────────────────────────

function TimelineEntry({
  entry,
  isLast,
  settings,
  onDelete,
}: {
  entry: AnyEntry;
  isLast: boolean;
  settings: Record<string, string>;
  onDelete: (entry: AnyEntry) => void;
}) {
  const dotColor = ENTRY_DOT[entry.entry_type] ?? COLORS.border;
  const bgColor = ENTRY_BG[entry.entry_type] ?? COLORS.surface;
  const emoji = ENTRY_EMOJI[entry.entry_type] ?? '📋';

  return (
    <View style={styles.entryRow}>
      {/* Left: time + dot + connector */}
      <View style={styles.entryLeft}>
        <Text style={styles.timeLabel}>{getTime(entry.timestamp)}</Text>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        {!isLast && <View style={styles.connector} />}
      </View>

      {/* Right: card */}
      <View style={[styles.entryRight, !isLast && { paddingBottom: 14 }]}>
        <View style={[styles.entryCard, { backgroundColor: bgColor }]}>
          <View style={styles.entryCardInner}>
            <Text style={styles.entryEmoji}>{emoji}</Text>
            <View style={styles.entryInfo}>
              <EntryContent entry={entry} settings={settings} />
              {!!entry.notes && (
                <Text style={styles.cardNotes} numberOfLines={1}>{entry.notes}</Text>
              )}
            </View>
            <IconButton
              icon="trash-can-outline"
              size={16}
              iconColor={COLORS.textSecondary}
              onPress={() => onDelete(entry)}
              style={styles.deleteButton}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({
  emoji,
  value,
  unit,
  label,
  valueColor,
}: {
  emoji: string;
  value: string;
  unit: string;
  label: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryEmoji}>{emoji}</Text>
      <Text style={[styles.summaryValue, valueColor ? { color: valueColor } : undefined]}>
        {value}
        {unit ? <Text style={styles.summaryUnit}> {unit}</Text> : null}
      </Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HoyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = screenWidth - 32;

  const [date, setDate] = useState(getLocalDateStr);
  const [entries, setEntries] = useState<AnyEntry[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(() => {
    const data = getEntriesByDate(date);
    const all = ([...data.glucose, ...data.meals, ...data.exercise, ...data.insulin] as AnyEntry[])
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    setEntries(all);
    setSettings(getSettings());
    setRefreshing(false);
  }, [date]);

  useEffect(() => { loadData(); }, [loadData]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleDelete = useCallback(
    (entry: AnyEntry) => {
      Alert.alert(
        'Eliminar registro',
        '¿Querés eliminar este registro? Esta acción no se puede deshacer.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: () => {
              if (entry.entry_type === 'glucose')  deleteGlucose(entry.id);
              else if (entry.entry_type === 'meal')     deleteMeal(entry.id);
              else if (entry.entry_type === 'exercise') deleteExercise(entry.id);
              else if (entry.entry_type === 'insulin')  deleteInsulin(entry.id);
              loadData();
            },
          },
        ],
      );
    },
    [loadData],
  );

  // ── Computed summary ──────────────────────────────────────────────────────
  const targetMin = parseFloat(settings.target_min ?? '80');
  const targetMax = parseFloat(settings.target_max ?? '130');
  const glucoseEntries = entries.filter(e => e.entry_type === 'glucose');
  const lastGlucose = glucoseEntries.length > 0 ? glucoseEntries[glucoseEntries.length - 1] : null;
  const totalInsulin = parseFloat(
    entries
      .filter(e => e.entry_type === 'insulin')
      .reduce((s, e) => s + (e.units ?? 0), 0)
      .toFixed(1),
  );
  const totalCarbs = Math.round(
    entries
      .filter(e => e.entry_type === 'meal')
      .reduce((s, e) => s + (e.carbs_grams ?? 0), 0),
  );

  const todayStr = getLocalDateStr();
  const isToday = date === todayStr;
  const canGoForward = date < todayStr;

  // Estimated current glucose (only meaningful for today)
  const currentEstimate = useMemo(() => {
    if (!isToday || entries.length === 0) return null;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    return estimateGlucoseAtTime(entries, currentMinutes, settings);
  }, [entries, settings, isToday]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <ScreenWrapper>
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* ── Header: date navigation ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => setDate(d => addDays(d, -1))}
          style={styles.arrowBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="chevron-left" size={26} color={COLORS.text} />
        </TouchableOpacity>

        <Text style={styles.dateLabel}>{formatDateLabel(date)}</Text>

        <TouchableOpacity
          onPress={() => canGoForward && setDate(d => addDays(d, 1))}
          style={styles.arrowBtn}
          disabled={!canGoForward}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons
            name="chevron-right"
            size={26}
            color={canGoForward ? COLORS.text : COLORS.border}
          />
        </TouchableOpacity>
      </View>

      {/* ── Greeting ── */}
      <View style={styles.greetingRow}>
        <Text style={styles.greetingText}>
          {getGreeting(settings.user_name)}
        </Text>
      </View>

      {/* ── Summary row ── */}
      <View style={styles.summaryRow}>
        <SummaryCard
          emoji="🩸"
          value={lastGlucose ? String(lastGlucose.value) : '--'}
          unit={lastGlucose ? 'mg/dL' : ''}
          label="Última gluc."
          valueColor={
            lastGlucose
              ? getGlucoseColor(lastGlucose.value, targetMin, targetMax)
              : undefined
          }
        />
        <SummaryCard
          emoji="💉"
          value={totalInsulin > 0 ? String(totalInsulin) : '--'}
          unit={totalInsulin > 0 ? 'u' : ''}
          label="Insulina"
        />
        <SummaryCard
          emoji="🍽️"
          value={totalCarbs > 0 ? String(totalCarbs) : '--'}
          unit={totalCarbs > 0 ? 'g' : ''}
          label="Carbs"
        />
      </View>

      {/* ── Timeline or Empty state ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 12) + 90 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* ── Current glucose status ── */}
        {currentEstimate !== null && (
          <GlucoseStatusCard estimated={currentEstimate} settings={settings} />
        )}

        {/* ── Day glucose chart ── */}
        {entries.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Curva del día</Text>
            <GlucoseChart events={entries} settings={settings} width={chartWidth} />
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#34D399' }]} />
                <Text style={styles.legendLabel}>Comida</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#818CF8' }]} />
                <Text style={styles.legendLabel}>Insulina</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#FBBF24' }]} />
                <Text style={styles.legendLabel}>Ejercicio</Text>
              </View>
            </View>
          </View>
        )}

        {entries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyTitle}>
              {isToday ? 'Sin registros hoy' : 'Sin registros este día'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {isToday
                ? 'Registrá tu primera entrada del día para comenzar el seguimiento.'
                : 'No hay registros guardados para este día.'}
            </Text>
            {isToday && (
              <Button
                mode="contained"
                onPress={() => router.push('/(tabs)/registrar')}
                style={styles.emptyButton}
                contentStyle={styles.emptyButtonContent}
              >
                Registrar primera entrada
              </Button>
            )}
          </View>
        ) : (
          <View style={styles.timeline}>
            {[...entries].reverse().map((entry, index) => (
              <TimelineEntry
                key={`${entry.entry_type}-${entry.id}`}
                entry={entry}
                isLast={index === entries.length - 1}
                settings={settings}
                onDelete={handleDelete}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
    </ScreenWrapper>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  arrowBtn: {
    padding: 4,
  },
  dateLabel: {
    fontSize: 22,
    fontFamily: FONTS.serif,
    color: COLORS.text,
  },

  // Greeting
  greetingRow: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    marginTop: -4,
  },
  greetingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontFamily: FONTS.serifRegular,
  },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 12,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryEmoji: {
    fontSize: 18,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 21,
  },
  summaryUnit: {
    fontSize: 11,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  summaryLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 3,
    letterSpacing: 0.2,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },

  // Chart card
  chartCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingTop: 12,
    paddingBottom: 8,
    marginBottom: 16,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    overflow: 'hidden',
  },
  chartTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  chartLegend: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },

  // Timeline
  timeline: {},
  entryRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },

  // Left column: time + dot + line
  entryLeft: {
    width: 52,
    alignItems: 'center',
    paddingTop: 4,
  },
  timeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  connector: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.border,
    marginTop: 5,
    borderRadius: 1,
  },

  // Right column: card
  entryRight: {
    flex: 1,
    paddingLeft: 8,
  },
  entryCard: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  entryCardInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    paddingRight: 2,
  },
  entryEmoji: {
    fontSize: 20,
    marginRight: 10,
    marginTop: 1,
  },
  entryInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  cardPrimary: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  cardSecondary: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  cardNotes: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: 3,
  },
  deleteButton: {
    margin: 0,
    marginTop: -2,
  },

  // Inline helpers
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },

  // Glucose status card
  statusCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  statusEmoji: {
    fontSize: 56,
    marginBottom: 10,
  },
  statusTitle: {
    fontSize: 20,
    fontFamily: FONTS.serif,
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 26,
  },
  statusSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 10,
  },
  statusValue: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 14,
  },
  statusDivider: {
    width: '100%',
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 12,
  },
  statusDisclaimer: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 28,
  },
  emptyEmoji: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
  },
  emptyButton: {
    borderRadius: 12,
  },
  emptyButtonContent: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
