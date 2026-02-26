import {
  insertGlucose, insertMeal, insertExercise, insertInsulin,
  updateSetting, deleteAllData,
} from './database';

// ─── Date helpers (inline to avoid circular deps) ─────────────────────────────

function getLocalDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function subtractDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ts('2026-02-25', 7, 30) → '2026-02-25T07:30:00.000Z' (hora local → UTC fake)
function ts(date, hh, mm) {
  return `${date}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00.000Z`;
}

// ─── Seed ─────────────────────────────────────────────────────────────────────

export function seedDemoData() {
  deleteAllData();

  // ── Settings demo ──
  const demoSettings = {
    user_name:                 'Juan García',
    target_min:                '80',
    target_max:                '140',
    rapid_insulin_brand:       'Humalog',
    rapid_insulin_name:        'Humalog Kwikpen',
    long_insulin_brand:        'Lantus',
    long_insulin_name:         'Lantus SoloStar',
    carb_ratio:                '4',
    rapid_sensitivity:         '35',
    long_sensitivity_per_hour: '0.8',
  };
  Object.entries(demoSettings).forEach(([k, v]) => updateSetting(k, v));

  const today = getLocalDateStr();

  // ── Día 6 (hoy): día parcial — mañana ──
  const d0 = today;
  insertGlucose({ value: 103, reading_type: 'ayunas',    notes: '',            timestamp: ts(d0, 7, 5)  });
  insertMeal   ({ description: 'Tostadas con palta',  carbs_grams: 35,  meal_type: 'desayuno', notes: '',                   timestamp: ts(d0, 7, 30) });
  insertInsulin({ units: 4,  insulin_type: 'rapida', brand_name: 'Humalog', notes: '', timestamp: ts(d0, 7, 40) });
  insertInsulin({ units: 20, insulin_type: 'lenta',  brand_name: 'Lantus',  notes: '', timestamp: ts(d0, 8,  0) });
  insertGlucose({ value: 89,  reading_type: 'pre_comida', notes: '',           timestamp: ts(d0, 12, 10) });

  // ── Día 5 (ayer): día normal ──
  const d1 = subtractDays(today, 1);
  insertGlucose({ value: 118, reading_type: 'ayunas',     notes: '',            timestamp: ts(d1, 7,  0) });
  insertMeal   ({ description: 'Avena con frutas',    carbs_grams: 45,  meal_type: 'desayuno', notes: '',                   timestamp: ts(d1, 7, 25) });
  insertInsulin({ units: 5,  insulin_type: 'rapida', brand_name: 'Humalog', notes: '', timestamp: ts(d1, 7, 35) });
  insertInsulin({ units: 20, insulin_type: 'lenta',  brand_name: 'Lantus',  notes: '', timestamp: ts(d1, 8,  0) });
  insertGlucose({ value: 92,  reading_type: 'pre_comida', notes: '',            timestamp: ts(d1, 12,  0) });
  insertMeal   ({ description: 'Pollo con arroz y ensalada', carbs_grams: 60, meal_type: 'almuerzo', notes: '',             timestamp: ts(d1, 12, 15) });
  insertInsulin({ units: 6,  insulin_type: 'rapida', brand_name: 'Humalog', notes: '', timestamp: ts(d1, 12, 25) });
  insertGlucose({ value: 148, reading_type: 'post_comida', notes: 'Un poco alto', timestamp: ts(d1, 14, 30) });
  insertMeal   ({ description: 'Galletitas',          carbs_grams: 20,  meal_type: 'merienda', notes: '',                   timestamp: ts(d1, 16, 30) });
  insertGlucose({ value: 95,  reading_type: 'pre_comida', notes: '',            timestamp: ts(d1, 20,  0) });
  insertMeal   ({ description: 'Fideos con salsa',    carbs_grams: 65,  meal_type: 'cena',     notes: '',                   timestamp: ts(d1, 20, 15) });
  insertInsulin({ units: 7,  insulin_type: 'rapida', brand_name: 'Humalog', notes: '', timestamp: ts(d1, 20, 20) });
  insertGlucose({ value: 125, reading_type: 'dormir',     notes: '',            timestamp: ts(d1, 22, 30) });

  // ── Día 4 (antier): hipoglucemia post-ejercicio ──
  const d2 = subtractDays(today, 2);
  insertGlucose({ value: 95,  reading_type: 'ayunas',     notes: '',            timestamp: ts(d2, 7,  0) });
  insertMeal   ({ description: 'Tostadas integrales', carbs_grams: 38,  meal_type: 'desayuno', notes: '',                   timestamp: ts(d2, 7, 20) });
  insertInsulin({ units: 4,  insulin_type: 'rapida', brand_name: 'Humalog', notes: '', timestamp: ts(d2, 7, 30) });
  insertInsulin({ units: 20, insulin_type: 'lenta',  brand_name: 'Lantus',  notes: '', timestamp: ts(d2, 8,  0) });
  insertGlucose({ value: 82,  reading_type: 'pre_comida', notes: '',            timestamp: ts(d2, 12,  0) });
  insertMeal   ({ description: 'Ensalada de pollo',   carbs_grams: 30,  meal_type: 'almuerzo', notes: '',                   timestamp: ts(d2, 12, 15) });
  insertInsulin({ units: 4,  insulin_type: 'rapida', brand_name: 'Humalog', notes: '', timestamp: ts(d2, 12, 20) });
  insertMeal   ({ description: 'Manzana',             carbs_grams: 18,  meal_type: 'merienda', notes: '',                   timestamp: ts(d2, 16,  0) });
  insertExercise({ exercise_type: 'cardio',   duration_minutes: 40, intensity: 'moderada', notes: '', timestamp: ts(d2, 18,  0) });
  insertGlucose({ value: 68,  reading_type: 'otro',       notes: 'Baja post-ejercicio', timestamp: ts(d2, 19, 30) });
  insertMeal   ({ description: 'Jugo y fruta (hipoglucemia)', carbs_grams: 25, meal_type: 'snack', notes: 'Corrección', timestamp: ts(d2, 19, 35) });
  insertGlucose({ value: 98,  reading_type: 'pre_comida', notes: '',            timestamp: ts(d2, 20, 30) });
  insertMeal   ({ description: 'Salmón con papas',    carbs_grams: 55,  meal_type: 'cena',     notes: '',                   timestamp: ts(d2, 20, 45) });
  insertInsulin({ units: 6,  insulin_type: 'rapida', brand_name: 'Humalog', notes: '', timestamp: ts(d2, 20, 50) });
  insertGlucose({ value: 110, reading_type: 'dormir',     notes: '',            timestamp: ts(d2, 23,  0) });

  // ── Día 3 (hace 3 días): día con buen control ──
  const d3 = subtractDays(today, 3);
  insertGlucose({ value: 108, reading_type: 'ayunas',     notes: '',            timestamp: ts(d3, 7,  0) });
  insertMeal   ({ description: 'Avena con banana',    carbs_grams: 45,  meal_type: 'desayuno', notes: '',                   timestamp: ts(d3, 7, 25) });
  insertInsulin({ units: 5,  insulin_type: 'rapida', brand_name: 'Humalog', notes: '', timestamp: ts(d3, 7, 35) });
  insertInsulin({ units: 20, insulin_type: 'lenta',  brand_name: 'Lantus',  notes: '', timestamp: ts(d3, 8,  0) });
  insertGlucose({ value: 90,  reading_type: 'pre_comida', notes: '',            timestamp: ts(d3, 12,  0) });
  insertMeal   ({ description: 'Arroz integral con vegetales', carbs_grams: 58, meal_type: 'almuerzo', notes: '',           timestamp: ts(d3, 12, 10) });
  insertInsulin({ units: 6,  insulin_type: 'rapida', brand_name: 'Humalog', notes: '', timestamp: ts(d3, 12, 20) });
  insertGlucose({ value: 142, reading_type: 'post_comida', notes: '',           timestamp: ts(d3, 14, 30) });
  insertMeal   ({ description: 'Banana',              carbs_grams: 25,  meal_type: 'merienda', notes: '',                   timestamp: ts(d3, 16, 30) });
  insertExercise({ exercise_type: 'caminata', duration_minutes: 45, intensity: 'baja', notes: '', timestamp: ts(d3, 18,  0) });
  insertGlucose({ value: 88,  reading_type: 'pre_comida', notes: '',            timestamp: ts(d3, 20,  0) });
  insertMeal   ({ description: 'Milanesa con puré',   carbs_grams: 70,  meal_type: 'cena',     notes: '',                   timestamp: ts(d3, 20, 15) });
  insertInsulin({ units: 8,  insulin_type: 'rapida', brand_name: 'Humalog', notes: '', timestamp: ts(d3, 20, 20) });
  insertGlucose({ value: 130, reading_type: 'dormir',     notes: '',            timestamp: ts(d3, 22, 30) });

  // ── Día 2 (hace 4 días): glucemia alta mañana (olvidó lenta ayer) ──
  const d4 = subtractDays(today, 4);
  insertGlucose({ value: 132, reading_type: 'ayunas',     notes: 'Alta, olvidé la Lantus ayer', timestamp: ts(d4, 7, 0) });
  insertMeal   ({ description: 'Pan tostado',         carbs_grams: 30,  meal_type: 'desayuno', notes: '',                   timestamp: ts(d4, 7, 25) });
  insertInsulin({ units: 4,  insulin_type: 'rapida', brand_name: 'Humalog', notes: '', timestamp: ts(d4, 7, 35) });
  insertInsulin({ units: 20, insulin_type: 'lenta',  brand_name: 'Lantus',  notes: '', timestamp: ts(d4, 8,  0) });
  insertGlucose({ value: 168, reading_type: 'otro',       notes: 'Sigue alta',  timestamp: ts(d4, 10,  0) });
  insertGlucose({ value: 110, reading_type: 'pre_comida', notes: '',            timestamp: ts(d4, 12,  0) });
  insertMeal   ({ description: 'Pollo al horno',      carbs_grams: 50,  meal_type: 'almuerzo', notes: '',                   timestamp: ts(d4, 12, 15) });
  insertInsulin({ units: 6,  insulin_type: 'rapida', brand_name: 'Humalog', notes: '', timestamp: ts(d4, 12, 20) });
  insertMeal   ({ description: 'Yogur',               carbs_grams: 15,  meal_type: 'merienda', notes: '',                   timestamp: ts(d4, 16, 30) });
  insertExercise({ exercise_type: 'fuerza',   duration_minutes: 30, intensity: 'alta',     notes: '', timestamp: ts(d4, 18, 30) });
  insertGlucose({ value: 85,  reading_type: 'pre_comida', notes: '',            timestamp: ts(d4, 20,  0) });
  insertMeal   ({ description: 'Sopa de verduras',    carbs_grams: 40,  meal_type: 'cena',     notes: '',                   timestamp: ts(d4, 20, 15) });
  insertInsulin({ units: 5,  insulin_type: 'rapida', brand_name: 'Humalog', notes: '', timestamp: ts(d4, 20, 20) });
  insertGlucose({ value: 105, reading_type: 'dormir',     notes: '',            timestamp: ts(d4, 22, 30) });

  // ── Día 1 (hace 5 días): cena con muchos carbos ──
  const d5 = subtractDays(today, 5);
  insertGlucose({ value: 95,  reading_type: 'ayunas',     notes: '',            timestamp: ts(d5, 7,  0) });
  insertMeal   ({ description: 'Tostadas con palta',  carbs_grams: 38,  meal_type: 'desayuno', notes: '',                   timestamp: ts(d5, 7, 20) });
  insertInsulin({ units: 4,  insulin_type: 'rapida', brand_name: 'Humalog', notes: '', timestamp: ts(d5, 7, 30) });
  insertInsulin({ units: 20, insulin_type: 'lenta',  brand_name: 'Lantus',  notes: '', timestamp: ts(d5, 8,  0) });
  insertGlucose({ value: 86,  reading_type: 'pre_comida', notes: '',            timestamp: ts(d5, 12,  0) });
  insertMeal   ({ description: 'Arroz con ensalada',  carbs_grams: 55,  meal_type: 'almuerzo', notes: '',                   timestamp: ts(d5, 12, 15) });
  insertInsulin({ units: 6,  insulin_type: 'rapida', brand_name: 'Humalog', notes: '', timestamp: ts(d5, 12, 20) });
  insertGlucose({ value: 138, reading_type: 'post_comida', notes: '',           timestamp: ts(d5, 14, 30) });
  insertMeal   ({ description: 'Galletitas',          carbs_grams: 20,  meal_type: 'merienda', notes: '',                   timestamp: ts(d5, 16, 30) });
  insertExercise({ exercise_type: 'cardio',   duration_minutes: 35, intensity: 'moderada', notes: '', timestamp: ts(d5, 18,  0) });
  insertGlucose({ value: 92,  reading_type: 'pre_comida', notes: '',            timestamp: ts(d5, 20,  0) });
  insertMeal   ({ description: 'Pizza casera',        carbs_grams: 80,  meal_type: 'cena',     notes: 'Muchos carbs!',      timestamp: ts(d5, 20, 15) });
  insertInsulin({ units: 9,  insulin_type: 'rapida', brand_name: 'Humalog', notes: '', timestamp: ts(d5, 20, 20) });
  insertGlucose({ value: 145, reading_type: 'dormir',     notes: 'Alta después de la pizza', timestamp: ts(d5, 22, 30) });

  // ── Día 0 (hace 6 días): día tranquilo ──
  const d6 = subtractDays(today, 6);
  insertGlucose({ value: 102, reading_type: 'ayunas',     notes: '',            timestamp: ts(d6, 7,  0) });
  insertMeal   ({ description: 'Avena con frutas',    carbs_grams: 48,  meal_type: 'desayuno', notes: '',                   timestamp: ts(d6, 7, 20) });
  insertInsulin({ units: 5,  insulin_type: 'rapida', brand_name: 'Humalog', notes: '', timestamp: ts(d6, 7, 30) });
  insertInsulin({ units: 20, insulin_type: 'lenta',  brand_name: 'Lantus',  notes: '', timestamp: ts(d6, 8,  0) });
  insertGlucose({ value: 87,  reading_type: 'pre_comida', notes: '',            timestamp: ts(d6, 12,  0) });
  insertMeal   ({ description: 'Guiso de lentejas',   carbs_grams: 62,  meal_type: 'almuerzo', notes: '',                   timestamp: ts(d6, 12, 15) });
  insertInsulin({ units: 6,  insulin_type: 'rapida', brand_name: 'Humalog', notes: '', timestamp: ts(d6, 12, 25) });
  insertMeal   ({ description: 'Fruta',               carbs_grams: 20,  meal_type: 'merienda', notes: '',                   timestamp: ts(d6, 16,  0) });
  insertExercise({ exercise_type: 'caminata', duration_minutes: 50, intensity: 'baja', notes: '', timestamp: ts(d6, 18,  0) });
  insertGlucose({ value: 95,  reading_type: 'pre_comida', notes: '',            timestamp: ts(d6, 20,  0) });
  insertMeal   ({ description: 'Pollo al horno con vegetales', carbs_grams: 55, meal_type: 'cena', notes: '',               timestamp: ts(d6, 20, 15) });
  insertInsulin({ units: 7,  insulin_type: 'rapida', brand_name: 'Humalog', notes: '', timestamp: ts(d6, 20, 20) });
  insertGlucose({ value: 118, reading_type: 'dormir',     notes: '',            timestamp: ts(d6, 22, 30) });
}
