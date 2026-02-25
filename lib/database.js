import * as SQLite from 'expo-sqlite';

let db = null;

const getDB = () => {
  if (!db) {
    db = SQLite.openDatabaseSync('glucontrol.db');
  }
  return db;
};

// ─── Inicialización ────────────────────────────────────────────────────────────

export const initDB = () => {
  const database = getDB();

  database.execSync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS glucose_readings (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      value         REAL    NOT NULL,
      reading_type  TEXT    NOT NULL,
      notes         TEXT,
      timestamp     TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS meals (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      description   TEXT    NOT NULL,
      carbs_grams   REAL,
      meal_type     TEXT    NOT NULL,
      notes         TEXT,
      timestamp     TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS exercise (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      exercise_type     TEXT    NOT NULL,
      duration_minutes  INTEGER,
      intensity         TEXT,
      notes             TEXT,
      timestamp         TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS insulin_doses (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      units         REAL    NOT NULL,
      insulin_type  TEXT    NOT NULL,
      brand_name    TEXT,
      notes         TEXT,
      timestamp     TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      setting_key    TEXT    UNIQUE NOT NULL,
      setting_value  TEXT
    );

    CREATE TABLE IF NOT EXISTS quick_meals (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      carbs_grams REAL    NOT NULL
    );
  `);

  // Valores por defecto (INSERT OR IGNORE para no sobrescribir)
  const defaults = [
    ['target_min',          '80'],
    ['target_max',          '130'],
    ['rapid_insulin_brand', ''],
    ['long_insulin_brand',  ''],
    ['rapid_insulin_name',  ''],
    ['long_insulin_name',   ''],
    ['user_name',           ''],
  ];

  defaults.forEach(([key, value]) => {
    database.runSync(
      'INSERT OR IGNORE INTO user_settings (setting_key, setting_value) VALUES (?, ?)',
      [key, value],
    );
  });

  // Comidas rápidas por defecto (solo si la tabla está vacía)
  const { cnt } = database.getFirstSync('SELECT COUNT(*) as cnt FROM quick_meals');
  if (cnt === 0) {
    [
      ['Pan',        30],
      ['Arroz',      45],
      ['Fruta',      15],
      ['Pasta',      50],
      ['Galletitas', 20],
    ].forEach(([name, carbs]) => {
      database.runSync(
        'INSERT INTO quick_meals (name, carbs_grams) VALUES (?, ?)',
        [name, carbs],
      );
    });
  }
};

// ─── Glucosa ───────────────────────────────────────────────────────────────────

/**
 * @param {{ value: number, reading_type: string, notes?: string, timestamp: string }} entry
 */
export const insertGlucose = ({ value, reading_type, notes = '', timestamp }) => {
  return getDB().runSync(
    'INSERT INTO glucose_readings (value, reading_type, notes, timestamp) VALUES (?, ?, ?, ?)',
    [value, reading_type, notes, timestamp],
  );
};

// ─── Comidas ───────────────────────────────────────────────────────────────────

/**
 * @param {{ description: string, carbs_grams?: number|null, meal_type: string, notes?: string, timestamp: string }} entry
 */
export const insertMeal = ({ description, carbs_grams = null, meal_type, notes = '', timestamp }) => {
  return getDB().runSync(
    'INSERT INTO meals (description, carbs_grams, meal_type, notes, timestamp) VALUES (?, ?, ?, ?, ?)',
    [description, carbs_grams, meal_type, notes, timestamp],
  );
};

// ─── Ejercicio ─────────────────────────────────────────────────────────────────

/**
 * @param {{ exercise_type: string, duration_minutes?: number|null, intensity?: string|null, notes?: string, timestamp: string }} entry
 */
export const insertExercise = ({ exercise_type, duration_minutes = null, intensity = null, notes = '', timestamp }) => {
  return getDB().runSync(
    'INSERT INTO exercise (exercise_type, duration_minutes, intensity, notes, timestamp) VALUES (?, ?, ?, ?, ?)',
    [exercise_type, duration_minutes, intensity, notes, timestamp],
  );
};

// ─── Insulina ──────────────────────────────────────────────────────────────────

/**
 * @param {{ units: number, insulin_type: string, brand_name?: string, notes?: string, timestamp: string }} entry
 */
export const insertInsulin = ({ units, insulin_type, brand_name = '', notes = '', timestamp }) => {
  return getDB().runSync(
    'INSERT INTO insulin_doses (units, insulin_type, brand_name, notes, timestamp) VALUES (?, ?, ?, ?, ?)',
    [units, insulin_type, brand_name, notes, timestamp],
  );
};

// ─── Comidas rápidas ───────────────────────────────────────────────────────────

export const getQuickMeals   = ()              => getDB().getAllSync('SELECT * FROM quick_meals ORDER BY id ASC');
export const insertQuickMeal = (name, carbs)   => getDB().runSync('INSERT INTO quick_meals (name, carbs_grams) VALUES (?, ?)', [name, carbs]);
export const deleteQuickMeal = (id)            => getDB().runSync('DELETE FROM quick_meals WHERE id = ?', [id]);

// ─── Eliminación ───────────────────────────────────────────────────────────────

export const deleteGlucose  = (id) => getDB().runSync('DELETE FROM glucose_readings WHERE id = ?', [id]);
export const deleteMeal     = (id) => getDB().runSync('DELETE FROM meals WHERE id = ?', [id]);
export const deleteExercise = (id) => getDB().runSync('DELETE FROM exercise WHERE id = ?', [id]);
export const deleteInsulin  = (id) => getDB().runSync('DELETE FROM insulin_doses WHERE id = ?', [id]);

export const deleteAllData  = ()   => getDB().execSync(`
  DELETE FROM glucose_readings;
  DELETE FROM meals;
  DELETE FROM exercise;
  DELETE FROM insulin_doses;
`);

// ─── Consultas por fecha ────────────────────────────────────────────────────────

/**
 * Devuelve todos los registros del día indicado.
 * @param {string} date  Fecha en formato 'YYYY-MM-DD'
 * @returns {{ glucose: any[], meals: any[], exercise: any[], insulin: any[] }}
 */
export const getEntriesByDate = (date) => {
  const database = getDB();
  const prefix = `${date.slice(0, 10)}%`;

  const glucose = database.getAllSync(
    "SELECT *, 'glucose' AS entry_type FROM glucose_readings WHERE timestamp LIKE ? ORDER BY timestamp ASC",
    [prefix],
  );

  const meals = database.getAllSync(
    "SELECT *, 'meal' AS entry_type FROM meals WHERE timestamp LIKE ? ORDER BY timestamp ASC",
    [prefix],
  );

  const exercise = database.getAllSync(
    "SELECT *, 'exercise' AS entry_type FROM exercise WHERE timestamp LIKE ? ORDER BY timestamp ASC",
    [prefix],
  );

  const insulin = database.getAllSync(
    "SELECT *, 'insulin' AS entry_type FROM insulin_doses WHERE timestamp LIKE ? ORDER BY timestamp ASC",
    [prefix],
  );

  return { glucose, meals, exercise, insulin };
};

// ─── Configuración ─────────────────────────────────────────────────────────────

/**
 * Devuelve todos los ajustes como objeto { key: value }.
 * @returns {Record<string, string>}
 */
export const getSettings = () => {
  const rows = getDB().getAllSync('SELECT setting_key, setting_value FROM user_settings');
  return Object.fromEntries(rows.map(({ setting_key, setting_value }) => [setting_key, setting_value]));
};

/**
 * @param {string} key
 * @param {string|number} value
 */
export const updateSetting = (key, value) => {
  return getDB().runSync(
    'INSERT OR REPLACE INTO user_settings (setting_key, setting_value) VALUES (?, ?)',
    [key, String(value)],
  );
};
