import React, { useState, useMemo, useCallback } from 'react';
import { View, PanResponder, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, {
  Rect, Path, Circle, Line,
  Text as SvgText, G,
} from 'react-native-svg';
import { COLORS } from '../constants/theme';
import { generateDayCurve, tsToMinutes } from '../lib/glucoseEstimator';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAD = { top: 10, bottom: 36, left: 34, right: 12 };
const H   = 200;

const EVENT_COLOR: Record<string, string> = {
  meal:     '#34D399',
  insulin:  '#818CF8',
  exercise: '#FBBF24',
};

type TooltipState = { cx: number; cy: number; value: number; timeStr: string };

interface Props {
  events:   any[];
  settings: Record<string, string>;
  width:    number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GlucoseChart({ events, settings, width }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const innerW = width - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const targetMin = parseFloat(settings.target_min ?? '80');
  const targetMax = parseFloat(settings.target_max ?? '130');

  // ── Curve ──
  const curve = useMemo(
    () => generateDayCurve(events, settings, 10),
    [events, settings],
  );

  // ── Chart geometry (stable ref for handlers) ──
  const geo = useMemo(() => {
    if (!curve.length) return null;
    const tFirst = curve[0].time;
    const tLast  = Math.max(curve[curve.length - 1].time + 30, tFirst + 90);
    const vals   = curve.map((p: any) => p.value as number);
    const yMin   = Math.max(40,  Math.min(...vals, targetMin) - 15);
    const yMax   = Math.min(400, Math.max(...vals, targetMax) + 15);
    return { tFirst, tLast, yMin, yMax };
  }, [curve, targetMin, targetMax]);

  // ── Scale helpers (for render — inline math) ──
  const xs = geo
    ? (t: number) => ((t - geo.tFirst) / (geo.tLast - geo.tFirst)) * innerW
    : () => 0;
  const ys = geo
    ? (v: number) => innerH - ((v - geo.yMin) / (geo.yMax - geo.yMin)) * innerH
    : () => 0;

  // ── Touch ──
  const handleTouch = useCallback(
    (locationX: number) => {
      if (!geo || !curve.length) return;
      const { tFirst, tLast, yMin, yMax } = geo;
      const lx = locationX - PAD.left;

      let nearest: any = curve[0];
      let minD = Infinity;
      for (const p of curve) {
        const px = ((p.time - tFirst) / (tLast - tFirst)) * innerW;
        const d = Math.abs(px - lx);
        if (d < minD) { minD = d; nearest = p; }
      }

      const cx = ((nearest.time - tFirst) / (tLast - tFirst)) * innerW;
      const cy = innerH - ((nearest.value - yMin) / (yMax - yMin)) * innerH;
      setTooltip({ cx, cy, value: nearest.value, timeStr: nearest.timeStr });
    },
    [geo, curve, innerW, innerH],
  );

  const panResponder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant:  evt => handleTouch(evt.nativeEvent.locationX),
      onPanResponderMove:   evt => handleTouch(evt.nativeEvent.locationX),
      onPanResponderRelease: () => setTimeout(() => setTooltip(null), 2000),
    }),
    [handleTouch],
  );

  // ── Empty state ──
  if (!geo) {
    return (
      <View style={[styles.emptyBox, { height: H }]}>
        <Text style={styles.emptyTxt}>
          Registrá tu glucosa para ver la curva del día
        </Text>
      </View>
    );
  }

  // ── Derived render data ──
  const pathD = curve
    .map((p: any, i: number) =>
      `${i ? 'L' : 'M'}${xs(p.time).toFixed(1)},${ys(p.value).toFixed(1)}`,
    )
    .join(' ');

  const bandTop    = Math.max(0, Math.min(innerH, ys(targetMax)));
  const bandBottom = Math.max(0, Math.min(innerH, ys(targetMin)));

  const realPts = curve.filter((p: any) => p.isReal);

  // Y labels: 4 evenly spaced
  const yStep  = (geo.yMax - geo.yMin) / 3;
  const yLabels = [0, 1, 2, 3].map(i => Math.round(geo.yMin + i * yStep));

  // X labels: every 3h within domain
  const hFirst = Math.ceil(geo.tFirst / 180) * 3;
  const hLast  = Math.floor(geo.tLast  / 60);
  const xHours: number[] = [];
  for (let h = hFirst; h <= hLast; h += 3) xHours.push(h);

  // Event markers (non-glucose)
  const markers = events
    .filter(e => e.entry_type !== 'glucose')
    .map(e => ({ type: e.entry_type as string, x: xs(tsToMinutes(e.timestamp)) }))
    .filter(m => m.x >= -4 && m.x <= innerW + 4);

  // Tooltip box flip
  const TT_W = 88;
  const TT_H = 22;
  const ttBx = tooltip
    ? tooltip.cx + TT_W + 10 > innerW
      ? tooltip.cx - TT_W - 8
      : tooltip.cx + 8
    : 0;

  return (
    <View {...panResponder.panHandlers} style={{ width, height: H }}>
      <Svg width={width} height={H}>
        <G transform={`translate(${PAD.left},${PAD.top})`}>

          {/* ── Range band ── */}
          <Rect
            x={0} y={bandTop}
            width={innerW} height={Math.max(0, bandBottom - bandTop)}
            fill="#10B98114"
          />
          <Line x1={0} y1={bandTop}    x2={innerW} y2={bandTop}
            stroke="#10B98155" strokeWidth={1} strokeDasharray="4,3" />
          <Line x1={0} y1={bandBottom} x2={innerW} y2={bandBottom}
            stroke="#10B98155" strokeWidth={1} strokeDasharray="4,3" />

          {/* ── Estimated curve ── */}
          <Path
            d={pathD}
            stroke={COLORS.primary}
            strokeWidth={2.5}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* ── Real reading dots ── */}
          {realPts.map((p: any) => (
            <Circle
              key={p.time}
              cx={xs(p.time)} cy={ys(p.value)}
              r={5}
              fill={COLORS.primary}
              stroke="#fff"
              strokeWidth={2}
            />
          ))}

          {/* ── Tooltip ── */}
          {tooltip && (
            <G>
              <Line
                x1={tooltip.cx} y1={0}
                x2={tooltip.cx} y2={innerH}
                stroke={COLORS.primary}
                strokeWidth={1}
                strokeDasharray="3,2"
                opacity={0.5}
              />
              <Circle cx={tooltip.cx} cy={tooltip.cy} r={4} fill={COLORS.primary} />
              <Rect
                x={ttBx}
                y={tooltip.cy - TT_H / 2 - 1}
                width={TT_W} height={TT_H}
                rx={6}
                fill={COLORS.primary}
              />
              <SvgText
                x={ttBx + TT_W / 2}
                y={tooltip.cy + 5}
                textAnchor="middle"
                fontSize={11}
                fontWeight="600"
                fill="#fff"
              >
                {tooltip.timeStr} · {tooltip.value} mg/dL
              </SvgText>
            </G>
          )}

          {/* ── Y-axis labels ── */}
          {yLabels.map(v => (
            <SvgText
              key={v}
              x={-4} y={ys(v) + 4}
              textAnchor="end"
              fontSize={9}
              fill={COLORS.textSecondary}
            >
              {v}
            </SvgText>
          ))}

          {/* ── X axis baseline ── */}
          <Line x1={0} y1={innerH} x2={innerW} y2={innerH}
            stroke={COLORS.border} strokeWidth={1} />

          {/* ── X-axis hour labels ── */}
          {xHours.map(h => (
            <SvgText
              key={h}
              x={xs(h * 60)} y={innerH + 12}
              textAnchor="middle"
              fontSize={9}
              fill={COLORS.textSecondary}
            >
              {h}h
            </SvgText>
          ))}

          {/* ── Event markers: colored dots below x axis ── */}
          {markers.map((m, i) => (
            <Circle
              key={i}
              cx={m.x} cy={innerH + 27}
              r={3.5}
              fill={EVENT_COLOR[m.type] ?? COLORS.border}
            />
          ))}

        </G>
      </Svg>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTxt: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
