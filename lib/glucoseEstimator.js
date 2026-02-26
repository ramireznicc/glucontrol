// ─── Internal helpers ─────────────────────────────────────────────────────────

function smoothstep(x) {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
}

// ─── Public: timestamp → minutes since midnight ───────────────────────────────

/**
 * Parses a timestamp string (e.g. "2024-01-15T14:30:00.000Z") and returns
 * minutes elapsed since midnight using the HH:MM portion directly.
 * @param {string} timestamp
 * @returns {number}
 */
export function tsToMinutes(timestamp) {
  if (!timestamp || timestamp.length < 16) return 0;
  const [hStr, mStr] = timestamp.slice(11, 16).split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  return isNaN(h) || isNaN(m) ? 0 : h * 60 + m;
}

// ─── Pharmacokinetic models ───────────────────────────────────────────────────

/**
 * Carb absorption curve.
 * dt: minutes since meal. Onset 15min, peak 60min, baseline at 180min.
 * @param {number} dt
 * @param {number} totalRise  mg/dL peak rise
 * @returns {number}
 */
export function mealEffect(dt, totalRise) {
  if (dt <= 0) return 0;
  if (dt < 15) return 0;
  if (dt < 60) return totalRise * smoothstep((dt - 15) / 45);
  if (dt < 180) return totalRise * (1 - smoothstep((dt - 60) / 120));
  return 0;
}

/**
 * Rapid-acting insulin curve.
 * dt: minutes since dose. Onset 15min, peak 90min, duration 300min (5h).
 * @param {number} dt
 * @param {number} totalDrop  mg/dL peak drop (positive value)
 * @returns {number}  negative
 */
export function rapidInsulinEffect(dt, totalDrop) {
  if (dt <= 0) return 0;
  if (dt < 15) return 0;
  if (dt < 90) return -totalDrop * smoothstep((dt - 15) / 75);
  if (dt < 300) return -totalDrop * (1 - smoothstep((dt - 90) / 210));
  return 0;
}

/**
 * Long-acting insulin: linear ramp, capped at 24 h.
 * @param {number} dt            minutes since injection
 * @param {number} units
 * @param {number} sensitivityPerHour  mg/dL drop per unit per hour
 * @returns {number}  negative
 */
export function longInsulinEffect(dt, units, sensitivityPerHour) {
  if (dt <= 0) return 0;
  const hours = Math.min(dt / 60, 24);
  return -(units * sensitivityPerHour * hours);
}

/**
 * Exercise effect.
 * During activity: linear drop. Post-exercise (<60min): +20% extra drop via smoothstep.
 * After 60min post-exercise: sustained at 1.2× peak drop.
 * @param {number} dt          minutes since exercise start
 * @param {number} durationMin
 * @param {'baja'|'moderada'|'alta'} intensity
 * @returns {number}  negative
 */
export function exerciseEffect(dt, durationMin, intensity) {
  if (dt <= 0) return 0;
  const rates = { baja: 1, moderada: 1.5, alta: 2 };
  const rate = rates[(intensity ?? 'moderada').toLowerCase()] ?? 1.5;
  const peakDrop = rate * durationMin;

  if (dt < durationMin) return -(rate * dt);

  const postDt = dt - durationMin;
  if (postDt < 60) {
    return -(peakDrop + peakDrop * 0.2 * smoothstep(postDt / 60));
  }
  return -(peakDrop * 1.2);
}

// ─── Event dispatcher ─────────────────────────────────────────────────────────

/**
 * Computes the glucose effect of a single event at elapsed time dt.
 * @param {object} event    DB row with entry_type field
 * @param {number} dt       minutes elapsed since event timestamp
 * @param {object} settings from getSettings()
 * @returns {number}
 */
export function computeEventEffect(event, dt, settings) {
  const carbRatio = parseFloat(settings?.carb_ratio) || 3;
  const rapidSens = parseFloat(settings?.rapid_sensitivity) || 30;
  const longSens  = parseFloat(settings?.long_sensitivity_per_hour) || 0.5;

  switch (event.entry_type) {
    case 'meal': {
      const carbs = parseFloat(event.carbs_grams) || 0;
      return mealEffect(dt, carbs * carbRatio);
    }
    case 'insulin': {
      const units = parseFloat(event.units) || 0;
      if (event.insulin_type === 'rapida') {
        return rapidInsulinEffect(dt, units * rapidSens);
      }
      return longInsulinEffect(dt, units, longSens);
    }
    case 'exercise': {
      return exerciseEffect(
        dt,
        parseFloat(event.duration_minutes) || 30,
        event.intensity ?? 'moderada',
      );
    }
    default:
      return 0;
  }
}

// ─── Core estimator ───────────────────────────────────────────────────────────

/**
 * Estimates glucose at targetMinutes using an incremental effect approach
 * anchored to the most recent real reading, with linear autocorrection
 * toward the next real reading when available.
 *
 * @param {object[]} events         all day entries (glucose + non-glucose)
 * @param {number}   targetMinutes  minutes since midnight
 * @param {object}   settings       from getSettings()
 * @returns {number|null}  estimated mg/dL, or null if no anchor exists
 */
export function estimateGlucoseAtTime(events, targetMinutes, settings) {
  const glucoseEvents = events
    .filter(e => e.entry_type === 'glucose')
    .sort((a, b) => tsToMinutes(a.timestamp) - tsToMinutes(b.timestamp));

  if (glucoseEvents.length === 0) return null;

  // Anchor: last glucose reading at or before targetMinutes
  const anchorEvent = [...glucoseEvents]
    .reverse()
    .find(g => tsToMinutes(g.timestamp) <= targetMinutes);

  if (!anchorEvent) return null;

  const anchorMin = tsToMinutes(anchorEvent.timestamp);
  const nonGlucoseEvents = events.filter(e => e.entry_type !== 'glucose');

  // ΔEffect = effect(dtAtTarget) − effect(dtAtAnchor) for every non-glucose event
  let totalEffect = 0;
  for (const event of nonGlucoseEvents) {
    const eventMin = tsToMinutes(event.timestamp);
    totalEffect +=
      computeEventEffect(event, targetMinutes - eventMin, settings) -
      computeEventEffect(event, anchorMin - eventMin, settings);
  }

  let estimated = anchorEvent.value + totalEffect;

  // Autocorrection: blend toward the next real reading
  const nextReading = glucoseEvents.find(g => tsToMinutes(g.timestamp) > targetMinutes);
  if (nextReading) {
    const nextMin = tsToMinutes(nextReading.timestamp);

    // What does the model predict at nextMin from the same anchor?
    let predictedAtNext = anchorEvent.value;
    for (const event of nonGlucoseEvents) {
      const eventMin = tsToMinutes(event.timestamp);
      predictedAtNext +=
        computeEventEffect(event, nextMin - eventMin, settings) -
        computeEventEffect(event, anchorMin - eventMin, settings);
    }

    // Correction error, interpolated linearly between anchor and next reading
    if (nextMin > anchorMin) {
      const t = (targetMinutes - anchorMin) / (nextMin - anchorMin);
      estimated += (nextReading.value - predictedAtNext) * t;
    }
  }

  return Math.max(20, Math.min(600, estimated));
}

// ─── Day curve generator ──────────────────────────────────────────────────────

/**
 * Generates estimated glucose points for an entire day.
 * Starts at the first real reading and runs to end-of-day (1440 min).
 * Includes exact time points for all real readings.
 *
 * @param {object[]} events         all day entries
 * @param {object}   settings       from getSettings()
 * @param {number}   intervalMinutes default 15
 * @returns {{ time: number, timeStr: string, value: number, isReal: boolean, realValue: number|null }[]}
 */
export function generateDayCurve(events, settings, intervalMinutes = 15) {
  const glucoseEvents = events
    .filter(e => e.entry_type === 'glucose')
    .sort((a, b) => tsToMinutes(a.timestamp) - tsToMinutes(b.timestamp));

  if (glucoseEvents.length === 0) return [];

  const firstMin = tsToMinutes(glucoseEvents[0].timestamp);

  // Build set of time points: regular grid + exact real reading times
  const times = new Set();
  for (let min = firstMin; min <= 1440; min += intervalMinutes) {
    times.add(min);
  }
  glucoseEvents.forEach(g => times.add(tsToMinutes(g.timestamp)));

  const sortedTimes = [...times].sort((a, b) => a - b);
  const points = [];

  for (const min of sortedTimes) {
    const h = Math.floor(min / 60).toString().padStart(2, '0');
    const m = (min % 60).toString().padStart(2, '0');
    const timeStr = `${h}:${m}`;

    const realReading = glucoseEvents.find(g => tsToMinutes(g.timestamp) === min);
    const value = realReading
      ? realReading.value
      : estimateGlucoseAtTime(events, min, settings);

    if (value !== null) {
      points.push({
        time: min,
        timeStr,
        value: Math.round(value),
        isReal: !!realReading,
        realValue: realReading ? realReading.value : null,
      });
    }
  }

  return points;
}
