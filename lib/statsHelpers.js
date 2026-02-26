import { getEntriesByDate } from './database';
import { generateDayCurve } from './glucoseEstimator';

// ─── Date utilities ────────────────────────────────────────────────────────────

export function getLocalDateStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Returns [oldest … today] of length `days`
export function getDateRange(days) {
  const today = getLocalDateStr();
  const dates = [];
  for (let i = days - 1; i >= 0; i--) {
    dates.push(addDays(today, -i));
  }
  return dates;
}

// Short label like "Hoy", "25 feb", "1 mar"
export function shortDateLabel(dateStr) {
  const today = getLocalDateStr();
  if (dateStr === today) return 'Hoy';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

// ─── Per-day stats ─────────────────────────────────────────────────────────────

export function getDayStats(date, settings) {
  const data = getEntriesByDate(date);
  const allEvents = [
    ...data.glucose,
    ...data.meals,
    ...data.exercise,
    ...data.insulin,
  ];

  const targetMin = parseFloat(settings.target_min ?? '80');
  const targetMax = parseFloat(settings.target_max ?? '130');

  // Glucose average
  const glucoseValues = data.glucose.map(g => parseFloat(g.value) || 0);
  const avgGlucose =
    glucoseValues.length > 0
      ? glucoseValues.reduce((s, v) => s + v, 0) / glucoseValues.length
      : null;

  // Time in range via estimated curve (15-min intervals)
  const curve = generateDayCurve(allEvents, settings, 15);
  let inRange = 0, below = 0, above = 0;
  for (const p of curve) {
    if (p.value < targetMin) below++;
    else if (p.value > targetMax) above++;
    else inRange++;
  }
  const total = curve.length;

  // Insulin
  const rapidUnits = data.insulin
    .filter(i => i.insulin_type === 'rapida')
    .reduce((s, i) => s + (parseFloat(i.units) || 0), 0);
  const longUnits = data.insulin
    .filter(i => i.insulin_type === 'lenta')
    .reduce((s, i) => s + (parseFloat(i.units) || 0), 0);

  // Carbs & exercise
  const totalCarbs = data.meals.reduce((s, m) => s + (parseFloat(m.carbs_grams) || 0), 0);
  const exerciseMinutes = data.exercise.reduce((s, e) => s + (parseInt(e.duration_minutes) || 0), 0);

  return {
    date,
    avgGlucose,
    timeInRange:   total > 0 ? inRange / total : null,
    timeBelowRange: total > 0 ? below  / total : null,
    timeAboveRange: total > 0 ? above  / total : null,
    rapidUnits,
    longUnits,
    totalCarbs,
    exerciseMinutes,
    glucoseCount: glucoseValues.length,
    hasCurve: total > 0,
  };
}

// ─── Period aggregation ────────────────────────────────────────────────────────

function avgOf(arr, key) {
  const valid = arr.filter(d => d[key] != null);
  return valid.length > 0 ? valid.reduce((s, d) => s + d[key], 0) / valid.length : null;
}

export function getPeriodStats(days, settings) {
  const dates = getDateRange(days);
  const dayStats = dates.map(d => getDayStats(d, settings));

  const withGlucose = dayStats.filter(d => d.glucoseCount > 0);
  const withCurve   = dayStats.filter(d => d.hasCurve);

  return {
    dayStats,
    avgGlucose:       avgOf(withGlucose, 'avgGlucose'),
    timeInRange:      avgOf(withCurve,   'timeInRange'),
    timeBelowRange:   avgOf(withCurve,   'timeBelowRange'),
    timeAboveRange:   avgOf(withCurve,   'timeAboveRange'),
    avgReadingsPerDay: withGlucose.length > 0
      ? withGlucose.reduce((s, d) => s + d.glucoseCount, 0) / days
      : null,
    avgRapidPerDay: avgOf(dayStats, 'rapidUnits'),
    avgLongPerDay:  avgOf(dayStats, 'longUnits'),
    avgCarbsPerDay: days > 0 ? dayStats.reduce((s, d) => s + d.totalCarbs, 0) / days : null,
    totalExercise:  dayStats.reduce((s, d) => s + d.exerciseMinutes, 0),
    daysWithData:   withGlucose.length,
  };
}
