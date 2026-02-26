import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import Svg, {
  Rect, Path, Circle, Line,
  Text as SvgText, G,
} from 'react-native-svg';
import { COLORS, FONTS } from '../../constants/theme';
import ScreenWrapper from '../../components/ScreenWrapper';
import { getSettings } from '../../lib/database';
import { getPeriodStats, shortDateLabel } from '../../lib/statsHelpers';

// ─── Types ────────────────────────────────────────────────────────────────────

type PeriodStats = ReturnType<typeof getPeriodStats>;

// ─── Period selector ──────────────────────────────────────────────────────────

const PERIODS = [
  { label: 'Hoy',    days: 1  },
  { label: '7 días', days: 7  },
  { label: '14 días', days: 14 },
  { label: '30 días', days: 30 },
] as const;

// ─── Sub-components ───────────────────────────────────────────────────────────

function PeriodChip({
  label, selected, onPress,
}: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
      activeOpacity={0.75}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function SectionCard({
  title, children,
}: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function MetricCard({
  emoji, label, value, unit, color,
}: {
  emoji: string; label: string; value: string; unit: string; color?: string;
}) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricEmoji}>{emoji}</Text>
      <Text style={[styles.metricValue, color ? { color } : undefined]} numberOfLines={1}>
        {value}
        {unit ? <Text style={styles.metricUnit}> {unit}</Text> : null}
      </Text>
      <Text style={styles.metricLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

// ─── Trend Line Chart ─────────────────────────────────────────────────────────

function TrendLineChart({
  data, targetMin, targetMax, width,
}: {
  data: { label: string; value: number | null }[];
  targetMin: number; targetMax: number; width: number;
}) {
  const PAD = { top: 10, bottom: 28, left: 34, right: 10 };
  const H   = 160;
  const iW  = width - PAD.left - PAD.right;
  const iH  = H - PAD.top - PAD.bottom;

  const validValues = data.map(d => d.value).filter((v): v is number => v != null);
  if (validValues.length === 0) {
    return (
      <View style={{ height: H, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={styles.chartEmptyText}>Sin datos en este período</Text>
      </View>
    );
  }

  const rawMin = Math.min(...validValues, targetMin);
  const rawMax = Math.max(...validValues, targetMax);
  const yMin = Math.max(40,  rawMin - 15);
  const yMax = Math.min(400, rawMax + 15);

  const n   = data.length;
  const xs  = (i: number) => n <= 1 ? iW / 2 : (i / (n - 1)) * iW;
  const ys  = (v: number) => iH - ((v - yMin) / (yMax - yMin)) * iH;

  // Segments (break at null values)
  const segments: string[][] = [];
  let current: string[] = [];
  data.forEach((d, i) => {
    if (d.value != null) {
      current.push(`${i ? 'L' : 'M'}${xs(i).toFixed(1)},${ys(d.value).toFixed(1)}`);
    } else {
      if (current.length) { segments.push(current); current = []; }
    }
  });
  if (current.length) segments.push(current);

  // Y labels
  const yStep   = (yMax - yMin) / 3;
  const yLabels = [0, 1, 2, 3].map(i => Math.round(yMin + i * yStep));

  // X labels — show at most 7 labels evenly
  const step = n <= 7 ? 1 : Math.ceil(n / 7);
  const xLabels = data
    .map((d, i) => ({ label: d.label, i }))
    .filter(({ i }) => i % step === 0 || i === n - 1);

  // Band
  const bandTop    = Math.max(0, Math.min(iH, ys(targetMax)));
  const bandBottom = Math.max(0, Math.min(iH, ys(targetMin)));

  return (
    <Svg width={width} height={H}>
      <G transform={`translate(${PAD.left},${PAD.top})`}>

        {/* Range band */}
        <Rect x={0} y={bandTop} width={iW}
          height={Math.max(0, bandBottom - bandTop)} fill="#10B98114" />
        <Line x1={0} y1={bandTop}    x2={iW} y2={bandTop}
          stroke="#10B98155" strokeWidth={1} strokeDasharray="4,3" />
        <Line x1={0} y1={bandBottom} x2={iW} y2={bandBottom}
          stroke="#10B98155" strokeWidth={1} strokeDasharray="4,3" />

        {/* Line segments */}
        {segments.map((seg, i) => (
          <Path
            key={i}
            d={seg.join(' ')}
            stroke={COLORS.primary}
            strokeWidth={2}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        {/* Dots on valid values */}
        {data.map((d, i) =>
          d.value != null ? (
            <Circle
              key={i}
              cx={xs(i)} cy={ys(d.value)}
              r={n > 14 ? 2.5 : 4}
              fill={COLORS.primary}
            />
          ) : null,
        )}

        {/* X baseline */}
        <Line x1={0} y1={iH} x2={iW} y2={iH}
          stroke={COLORS.border} strokeWidth={1} />

        {/* Y labels */}
        {yLabels.map(v => (
          <SvgText
            key={v} x={-4} y={ys(v) + 4}
            textAnchor="end" fontSize={9} fill={COLORS.textSecondary}
          >
            {v}
          </SvgText>
        ))}

        {/* X labels */}
        {xLabels.map(({ label, i }) => (
          <SvgText
            key={i}
            x={xs(i)} y={iH + 16}
            textAnchor="middle" fontSize={9} fill={COLORS.textSecondary}
          >
            {label}
          </SvgText>
        ))}

      </G>
    </Svg>
  );
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────

function polarXY(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutArc(
  cx: number, cy: number,
  rOuter: number, rInner: number,
  startDeg: number, endDeg: number,
): string {
  const span = endDeg - startDeg;
  if (span <= 0) return '';
  if (span >= 359.9) {
    // Full ring — two semicircles
    const topO = polarXY(cx, cy, rOuter, startDeg);
    const botO = polarXY(cx, cy, rOuter, startDeg + 180);
    const topI = polarXY(cx, cy, rInner, startDeg);
    const botI = polarXY(cx, cy, rInner, startDeg + 180);
    return [
      `M ${topO.x} ${topO.y}`,
      `A ${rOuter} ${rOuter} 0 1 1 ${botO.x} ${botO.y}`,
      `A ${rOuter} ${rOuter} 0 1 1 ${topO.x} ${topO.y}`,
      `M ${topI.x} ${topI.y}`,
      `A ${rInner} ${rInner} 0 1 0 ${botI.x} ${botI.y}`,
      `A ${rInner} ${rInner} 0 1 0 ${topI.x} ${topI.y}`,
      'Z',
    ].join(' ');
  }
  const large = span > 180 ? 1 : 0;
  const os = polarXY(cx, cy, rOuter, startDeg);
  const oe = polarXY(cx, cy, rOuter, endDeg);
  const ii = polarXY(cx, cy, rInner, startDeg);
  const ie = polarXY(cx, cy, rInner, endDeg);
  return [
    `M ${os.x} ${os.y}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${oe.x} ${oe.y}`,
    `L ${ie.x} ${ie.y}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${ii.x} ${ii.y}`,
    'Z',
  ].join(' ');
}

function DonutChart({
  inRange, belowRange, aboveRange,
}: {
  inRange: number | null; belowRange: number | null; aboveRange: number | null;
}) {
  const SIZE   = 140;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const RO = 56;
  const RI = 36;

  const hasData = inRange != null;
  const ir  = hasData ? inRange  : 0;
  const br  = hasData ? (belowRange ?? 0) : 0;
  const ar  = hasData ? (aboveRange ?? 0) : 0;
  // Clamp total to 1
  const tot = ir + br + ar || 1;
  const irN = ir / tot;
  const brN = br / tot;
  const arN = ar / tot;

  const belowDeg  = brN * 360;
  const inDeg     = irN * 360;
  const aboveDeg  = arN * 360;

  // Segments starting at top (−90°, represented as 0° in our polar fn which shifts by −90)
  const s0 = 0;
  const s1 = s0 + belowDeg;
  const s2 = s1 + inDeg;
  const s3 = s2 + aboveDeg;   // should be ~360

  const inRangeLabel = hasData ? `${Math.round(irN * 100)}%` : '--';

  return (
    <View style={styles.donutContainer}>
      <Svg width={SIZE} height={SIZE}>
        {hasData ? (
          <G>
            {/* Below range: danger */}
            {belowDeg > 0.5 && (
              <Path d={donutArc(CX, CY, RO, RI, s0, s1)} fill={COLORS.danger} />
            )}
            {/* In range: success */}
            {inDeg > 0.5 && (
              <Path d={donutArc(CX, CY, RO, RI, s1, s2)} fill={COLORS.success} />
            )}
            {/* Above range: warning */}
            {aboveDeg > 0.5 && (
              <Path d={donutArc(CX, CY, RO, RI, s2, s3)} fill={COLORS.warning} />
            )}
          </G>
        ) : (
          // No data: gray ring
          <Path d={donutArc(CX, CY, RO, RI, 0, 359.9)} fill={COLORS.border} />
        )}

        {/* Center label */}
        <SvgText
          x={CX} y={CY - 4}
          textAnchor="middle"
          fontSize={hasData ? 20 : 16}
          fontWeight="700"
          fill={hasData ? COLORS.success : COLORS.textSecondary}
        >
          {inRangeLabel}
        </SvgText>
        <SvgText
          x={CX} y={CY + 13}
          textAnchor="middle"
          fontSize={10}
          fill={COLORS.textSecondary}
        >
          en rango
        </SvgText>
      </Svg>

      {/* Legend */}
      <View style={styles.donutLegend}>
        <View style={styles.donutLegendItem}>
          <View style={[styles.donutDot, { backgroundColor: COLORS.success }]} />
          <View>
            <Text style={styles.donutLegendValue}>
              {hasData ? `${Math.round(irN * 100)}%` : '--'}
            </Text>
            <Text style={styles.donutLegendLabel}>En rango</Text>
          </View>
        </View>
        <View style={styles.donutLegendItem}>
          <View style={[styles.donutDot, { backgroundColor: COLORS.warning }]} />
          <View>
            <Text style={styles.donutLegendValue}>
              {hasData ? `${Math.round(arN * 100)}%` : '--'}
            </Text>
            <Text style={styles.donutLegendLabel}>Por encima</Text>
          </View>
        </View>
        <View style={styles.donutLegendItem}>
          <View style={[styles.donutDot, { backgroundColor: COLORS.danger }]} />
          <View>
            <Text style={styles.donutLegendValue}>
              {hasData ? `${Math.round(brN * 100)}%` : '--'}
            </Text>
            <Text style={styles.donutLegendLabel}>Por debajo</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Stacked Bar Chart ────────────────────────────────────────────────────────

function InsulinBarChart({
  data, width,
}: {
  data: { label: string; rapid: number; long: number }[];
  width: number;
}) {
  const PAD = { top: 10, bottom: 28, left: 28, right: 10 };
  const H   = 140;
  const iW  = width - PAD.left - PAD.right;
  const iH  = H - PAD.top - PAD.bottom;

  const allTotals = data.map(d => d.rapid + d.long);
  const maxVal = Math.max(...allTotals, 1);
  const yMax   = Math.ceil(maxVal * 1.2) || 4;

  const n       = data.length;
  const barW    = Math.max(4, Math.min(20, iW / n - 3));
  const barGap  = iW / n;
  const barX    = (i: number) => i * barGap + barGap / 2 - barW / 2;
  const barH    = (v: number) => (v / yMax) * iH;

  const step  = n <= 7 ? 1 : Math.ceil(n / 7);
  const xLabels = data
    .map((d, i) => ({ label: d.label, i }))
    .filter(({ i }) => i % step === 0 || i === n - 1);

  const yLabels = [0, Math.round(yMax / 2), yMax];

  const hasAny = data.some(d => d.rapid + d.long > 0);

  return (
    <View>
      {/* Legend */}
      <View style={styles.barLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
          <Text style={styles.legendLabel}>Rápida</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#94A3B8' }]} />
          <Text style={styles.legendLabel}>Lenta</Text>
        </View>
      </View>

      {!hasAny ? (
        <View style={{ height: H, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={styles.chartEmptyText}>Sin insulina registrada en este período</Text>
        </View>
      ) : (
        <Svg width={width} height={H}>
          <G transform={`translate(${PAD.left},${PAD.top})`}>
            {/* Y labels */}
            {yLabels.map(v => (
              <SvgText
                key={v} x={-4} y={iH - (v / yMax) * iH + 4}
                textAnchor="end" fontSize={9} fill={COLORS.textSecondary}
              >
                {v}
              </SvgText>
            ))}

            {/* Bars */}
            {data.map((d, i) => {
              const rapidH = barH(d.rapid);
              const longH  = barH(d.long);
              const totalH = rapidH + longH;
              return (
                <G key={i} x={barX(i)}>
                  {/* Long (top) */}
                  {longH > 0 && (
                    <Rect
                      x={0} y={iH - totalH}
                      width={barW} height={longH}
                      rx={2} fill="#94A3B8"
                    />
                  )}
                  {/* Rapid (bottom) */}
                  {rapidH > 0 && (
                    <Rect
                      x={0} y={iH - rapidH}
                      width={barW} height={rapidH}
                      rx={2} fill={COLORS.primary}
                    />
                  )}
                </G>
              );
            })}

            {/* X baseline */}
            <Line x1={0} y1={iH} x2={iW} y2={iH}
              stroke={COLORS.border} strokeWidth={1} />

            {/* X labels */}
            {xLabels.map(({ label, i }) => (
              <SvgText
                key={i}
                x={barX(i) + barW / 2}
                y={iH + 16}
                textAnchor="middle" fontSize={8} fill={COLORS.textSecondary}
              >
                {label}
              </SvgText>
            ))}
          </G>
        </Svg>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function EstadisticasScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = screenWidth - 32;

  const [period, setPeriod]   = useState<number>(7);
  const [stats, setStats]     = useState<PeriodStats | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});

  useFocusEffect(
    useCallback(() => {
      const s = getSettings();
      setSettings(s);
      setStats(getPeriodStats(period, s));
    }, [period]),
  );

  const targetMin = parseFloat(settings.target_min ?? '80');
  const targetMax = parseFloat(settings.target_max ?? '130');

  // ── Metrics grid ─────────────────────────────────────────────────────────────
  const getGlucoseColor = (v: number | null) => {
    if (v == null) return undefined;
    if (v < targetMin || v > targetMax + 50) return COLORS.danger;
    if (v < targetMin + 10 || v > targetMax) return COLORS.warning;
    return COLORS.success;
  };

  const metrics = stats ? [
    {
      emoji: '🩸',
      label: 'Promedio\nglucosa',
      value: stats.avgGlucose != null ? Math.round(stats.avgGlucose).toString() : '--',
      unit: stats.avgGlucose != null ? 'mg/dL' : '',
      color: getGlucoseColor(stats.avgGlucose),
    },
    {
      emoji: '🎯',
      label: 'Tiempo\nen rango',
      value: stats.timeInRange != null ? `${Math.round(stats.timeInRange * 100)}` : '--',
      unit: stats.timeInRange != null ? '%' : '',
      color: stats.timeInRange != null
        ? stats.timeInRange >= 0.7 ? COLORS.success
          : stats.timeInRange >= 0.5 ? COLORS.warning
          : COLORS.danger
        : undefined,
    },
    {
      emoji: '📊',
      label: 'Mediciones\npor día',
      value: stats.avgReadingsPerDay != null
        ? stats.avgReadingsPerDay.toFixed(1)
        : '--',
      unit: '',
    },
    {
      emoji: '💉',
      label: 'Insulina\nrápida/día',
      value: stats.avgRapidPerDay != null && stats.avgRapidPerDay > 0
        ? stats.avgRapidPerDay.toFixed(1)
        : '--',
      unit: stats.avgRapidPerDay != null && stats.avgRapidPerDay > 0 ? 'u' : '',
    },
    {
      emoji: '⏱',
      label: 'Insulina\nlenta/día',
      value: stats.avgLongPerDay != null && stats.avgLongPerDay > 0
        ? stats.avgLongPerDay.toFixed(1)
        : '--',
      unit: stats.avgLongPerDay != null && stats.avgLongPerDay > 0 ? 'u' : '',
    },
    {
      emoji: '🍽',
      label: 'Carbs\npor día',
      value: stats.avgCarbsPerDay != null && stats.avgCarbsPerDay > 0
        ? Math.round(stats.avgCarbsPerDay).toString()
        : '--',
      unit: stats.avgCarbsPerDay != null && stats.avgCarbsPerDay > 0 ? 'g' : '',
    },
  ] : [];

  // ── Chart data ──────────────────────────────────────────────────────────────
  const trendData = stats
    ? stats.dayStats.map(d => ({
        label: shortDateLabel(d.date),
        value: d.avgGlucose,
      }))
    : [];

  const insulinBarData = stats
    ? stats.dayStats.map(d => ({
        label: shortDateLabel(d.date),
        rapid: d.rapidUnits,
        long:  d.longUnits,
      }))
    : [];

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <ScreenWrapper>
      <SafeAreaView style={styles.safeArea} edges={['top']}>

        {/* Header */}
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.headerTitle}>Estadísticas</Text>
        </View>

        {/* Period selector */}
        <View style={styles.periodRow}>
          {PERIODS.map(p => (
            <PeriodChip
              key={p.days}
              label={p.label}
              selected={period === p.days}
              onPress={() => setPeriod(p.days)}
            />
          ))}
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 12) + 90 },
          ]}
          showsVerticalScrollIndicator={false}
        >

          {/* ── No data state ── */}
          {stats && stats.daysWithData === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📊</Text>
              <Text style={styles.emptyTitle}>Sin datos en este período</Text>
              <Text style={styles.emptySubtitle}>
                Registrá mediciones de glucosa para ver estadísticas y tendencias.
              </Text>
            </View>
          )}

          {/* ── Glucosa diaria ── */}
          {stats && stats.daysWithData > 0 && (
            <SectionCard title={period === 1 ? 'Glucosa de hoy' : 'Glucosa promedio por día'}>
              <View style={styles.chartPad}>
                <TrendLineChart
                  data={trendData}
                  targetMin={targetMin}
                  targetMax={targetMax}
                  width={chartWidth - 32}
                />
              </View>
            </SectionCard>
          )}

          {/* ── Métricas ── */}
          {stats && stats.daysWithData > 0 && (
            <SectionCard title="Resumen del período">
              <View style={styles.metricsGrid}>
                {metrics.map((m, i) => (
                  <MetricCard key={i} {...m} />
                ))}
              </View>
              {stats.totalExercise > 0 && (
                <View style={styles.exerciseRow}>
                  <Text style={styles.exerciseText}>
                    🏃 Ejercicio total: <Text style={{ fontWeight: '700', color: COLORS.text }}>
                      {stats.totalExercise} min
                    </Text>
                  </Text>
                </View>
              )}
            </SectionCard>
          )}

          {/* ── Tiempo en rango ── */}
          {stats && stats.timeInRange != null && (
            <SectionCard title="Tiempo en rango">
              <DonutChart
                inRange={stats.timeInRange}
                belowRange={stats.timeBelowRange}
                aboveRange={stats.timeAboveRange}
              />
            </SectionCard>
          )}

          {/* ── Insulina por día ── */}
          {stats && (
            <SectionCard title="Insulina por día">
              <View style={styles.chartPad}>
                <InsulinBarChart
                  data={insulinBarData}
                  width={chartWidth - 32}
                />
              </View>
            </SectionCard>
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerTitle: {
    color: COLORS.text,
    fontFamily: FONTS.serif,
  },

  // Period chips
  periodRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },

  // Scroll
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },

  // Section
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  chartPad: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },

  // Metrics grid
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 10,
  },
  metricCard: {
    width: '30%',
    flexGrow: 1,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
    alignItems: 'flex-start',
  },
  metricEmoji: {
    fontSize: 18,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 22,
  },
  metricUnit: {
    fontSize: 11,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  metricLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 3,
    lineHeight: 14,
  },

  exerciseRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 0,
  },
  exerciseText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  // Donut
  donutContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 24,
  },
  donutLegend: {
    flex: 1,
    gap: 14,
  },
  donutLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  donutDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  donutLegendValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  donutLegendLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },

  // Bar chart legend
  barLegend: {
    flexDirection: 'row',
    gap: 16,
    paddingBottom: 4,
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

  chartEmptyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 28,
    paddingBottom: 24,
  },
  emptyEmoji: {
    fontSize: 52,
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
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
  },
});
