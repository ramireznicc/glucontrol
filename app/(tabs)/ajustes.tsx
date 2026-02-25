import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Text, TextInput, Button, IconButton, Snackbar, Divider } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import ScreenWrapper from '../../components/ScreenWrapper';
import {
  getSettings,
  updateSetting,
  getQuickMeals,
  insertQuickMeal,
  deleteQuickMeal,
  deleteAllData,
} from '../../lib/database';

// ─── Constants ────────────────────────────────────────────────────────────────

const RAPID_BRANDS = ['NovoRapid', 'Humalog', 'Apidra', 'Fiasp', 'Admelog', 'Lyumjev'];
const LONG_BRANDS  = ['Lantus', 'Levemir', 'Tresiba', 'Toujeo', 'Basaglar', 'Glargina'];

type QuickMeal = { id: number; name: string; carbs_grams: number };

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function CardRow({
  children,
  last = false,
}: {
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <>
      <View style={styles.cardRow}>{children}</View>
      {!last && <Divider style={styles.divider} />}
    </>
  );
}

// ─── Range Bar ────────────────────────────────────────────────────────────────

function RangeBar({ min, max }: { min: number; max: number }) {
  const SCALE = 400;
  const cMin = Math.max(1, Math.min(min, SCALE - 1));
  const cMax = Math.max(cMin + 1, Math.min(max, SCALE));

  const s1 = Math.max(0, cMin - 20);
  const s2 = cMin - s1;
  const s3 = cMax - cMin;
  const s4 = Math.min(50, Math.max(0, SCALE - cMax));
  const s5 = Math.max(0, SCALE - cMax - 50);

  const segments = [
    { flex: s1, color: COLORS.danger  },
    { flex: s2, color: COLORS.warning },
    { flex: s3, color: COLORS.success },
    { flex: s4, color: COLORS.warning },
    { flex: s5, color: COLORS.danger  },
  ].filter(s => s.flex > 0);

  return (
    <View style={styles.rangeBarWrapper}>
      <View style={styles.rangeBar}>
        {segments.map((s, i) => (
          <View key={i} style={{ flex: s.flex, backgroundColor: s.color }} />
        ))}
      </View>
      <View style={styles.rangeLabels}>
        <View style={styles.rangeLabelItem}>
          <View style={[styles.rangeDot, { backgroundColor: COLORS.danger }]} />
          <Text style={styles.rangeLabelText}>{'< ' + Math.max(0, cMin - 20)}</Text>
        </View>
        <View style={styles.rangeLabelItem}>
          <View style={[styles.rangeDot, { backgroundColor: COLORS.success }]} />
          <Text style={styles.rangeLabelText}>{cMin} – {cMax}</Text>
        </View>
        <View style={styles.rangeLabelItem}>
          <View style={[styles.rangeDot, { backgroundColor: COLORS.danger }]} />
          <Text style={styles.rangeLabelText}>{'> ' + (cMax + 50)}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Brand Input with inline suggestions ─────────────────────────────────────

function BrandInput({
  label,
  value,
  onChange,
  onSave,
  suggestions,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onSave: (v: string) => void;
  suggestions: string[];
}) {
  const [focused, setFocused] = useState(false);

  const filtered =
    focused && value.length > 0
      ? suggestions
          .filter(
            s =>
              s.toLowerCase().includes(value.toLowerCase()) &&
              s.toLowerCase() !== value.toLowerCase(),
          )
          .slice(0, 4)
      : [];

  return (
    <View>
      <TextInput
        mode="outlined"
        label={label}
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setTimeout(() => {
            setFocused(false);
            onSave(value);
          }, 180);
        }}
        style={styles.inputField}
        dense
      />
      {filtered.length > 0 && (
        <View style={styles.suggestions}>
          {filtered.map(s => (
            <TouchableOpacity
              key={s}
              onPress={() => {
                onChange(s);
                setFocused(false);
                onSave(s);
              }}
              style={styles.suggestionItem}
            >
              <Text style={styles.suggestionText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AjustesScreen() {
  const insets = useSafeAreaInsets();

  // ── State ──────────────────────────────────────────────────────────────────
  const [minVal, setMinVal]       = useState('80');
  const [maxVal, setMaxVal]       = useState('130');
  const [rapidBrand, setRapidBrand] = useState('');
  const [rapidName,  setRapidName]  = useState('');
  const [longBrand,  setLongBrand]  = useState('');
  const [longName,   setLongName]   = useState('');
  const [userName,   setUserName]   = useState('');
  const [quickMeals, setQuickMeals] = useState<QuickMeal[]>([]);
  const [newMealName,  setNewMealName]  = useState('');
  const [newMealCarbs, setNewMealCarbs] = useState('');
  const [snackMsg,    setSnackMsg]    = useState('');
  const [snackVisible, setSnackVisible] = useState(false);

  const rangeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const s = getSettings();
    setMinVal(s.target_min  ?? '80');
    setMaxVal(s.target_max  ?? '130');
    setRapidBrand(s.rapid_insulin_brand ?? '');
    setRapidName( s.rapid_insulin_name  ?? '');
    setLongBrand( s.long_insulin_brand  ?? '');
    setLongName(  s.long_insulin_name   ?? '');
    setUserName(  s.user_name           ?? '');
    setQuickMeals(getQuickMeals() as QuickMeal[]);
  }, []);

  const showSnack = (msg: string) => {
    setSnackMsg(msg);
    setSnackVisible(true);
  };

  // ── Range handlers (debounce 700ms) ───────────────────────────────────────
  const handleRangeChange = (key: 'target_min' | 'target_max', setter: (v: string) => void, val: string) => {
    setter(val);
    if (rangeTimer.current) clearTimeout(rangeTimer.current);
    rangeTimer.current = setTimeout(() => {
      const n = parseFloat(val);
      if (!isNaN(n) && n > 0 && n < 500) {
        updateSetting(key, String(n));
        showSnack('Rango guardado');
      }
    }, 700);
  };

  // ── Quick meals ───────────────────────────────────────────────────────────
  const reloadMeals = () => setQuickMeals(getQuickMeals() as QuickMeal[]);

  const handleAddMeal = () => {
    const name = newMealName.trim();
    if (!name) return;
    const carbs = parseFloat(newMealCarbs);
    insertQuickMeal(name, isNaN(carbs) ? 0 : carbs);
    setNewMealName('');
    setNewMealCarbs('');
    reloadMeals();
    showSnack('Comida rápida agregada');
  };

  const handleDeleteMeal = (meal: QuickMeal) => {
    Alert.alert(
      'Eliminar comida rápida',
      `¿Eliminar "${meal.name}" de la lista?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => { deleteQuickMeal(meal.id); reloadMeals(); },
        },
      ],
    );
  };

  // ── Delete all ────────────────────────────────────────────────────────────
  const handleDeleteAll = () => {
    Alert.alert(
      'Borrar todos los datos',
      'Se eliminarán permanentemente todos tus registros de glucosa, insulina, comidas y ejercicio. Los ajustes se conservan.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirmar eliminación',
              'Esta acción no se puede deshacer. ¿Confirmar?',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Borrar todo',
                  style: 'destructive',
                  onPress: () => {
                    deleteAllData();
                    showSnack('Todos los datos fueron eliminados');
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  const minNum = parseFloat(minVal) || 80;
  const maxNum = parseFloat(maxVal) || 130;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <ScreenWrapper>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.headerTitle}>Ajustes</Text>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 12) + 90 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Perfil ── */}
          <SectionCard title="Perfil">
            <CardRow last>
              <TextInput
                mode="outlined"
                label="Tu nombre"
                value={userName}
                onChangeText={setUserName}
                onBlur={() => updateSetting('user_name', userName)}
                style={styles.inputField}
                autoCapitalize="words"
                placeholder="¿Cómo te llamás?"
                dense
              />
            </CardRow>
          </SectionCard>

          {/* ── Rango objetivo ── */}
          <SectionCard title="Rango objetivo de glucemia">
            <CardRow>
              <View style={styles.rangeInputRow}>
                <TextInput
                  mode="outlined"
                  label="Mínimo (mg/dL)"
                  value={minVal}
                  onChangeText={v => handleRangeChange('target_min', setMinVal, v)}
                  keyboardType="numeric"
                  style={[styles.inputField, { flex: 1 }]}
                  dense
                />
                <TextInput
                  mode="outlined"
                  label="Máximo (mg/dL)"
                  value={maxVal}
                  onChangeText={v => handleRangeChange('target_max', setMaxVal, v)}
                  keyboardType="numeric"
                  style={[styles.inputField, { flex: 1 }]}
                  dense
                />
              </View>
            </CardRow>
            <CardRow last>
              <RangeBar min={minNum} max={maxNum} />
            </CardRow>
          </SectionCard>

          {/* ── Insulina ── */}
          <SectionCard title="Insulina">
            <CardRow>
              <Text style={styles.subSectionLabel}>Insulina Rápida</Text>
            </CardRow>
            <CardRow>
              <BrandInput
                label="Marca"
                value={rapidBrand}
                onChange={setRapidBrand}
                onSave={v => updateSetting('rapid_insulin_brand', v)}
                suggestions={RAPID_BRANDS}
              />
            </CardRow>
            <CardRow>
              <TextInput
                mode="outlined"
                label="Nombre personalizado (opcional)"
                value={rapidName}
                onChangeText={setRapidName}
                onBlur={() => updateSetting('rapid_insulin_name', rapidName)}
                style={styles.inputField}
                dense
              />
            </CardRow>
            <CardRow>
              <Text style={styles.subSectionLabel}>Insulina Lenta</Text>
            </CardRow>
            <CardRow>
              <BrandInput
                label="Marca"
                value={longBrand}
                onChange={setLongBrand}
                onSave={v => updateSetting('long_insulin_brand', v)}
                suggestions={LONG_BRANDS}
              />
            </CardRow>
            <CardRow last>
              <TextInput
                mode="outlined"
                label="Nombre personalizado (opcional)"
                value={longName}
                onChangeText={setLongName}
                onBlur={() => updateSetting('long_insulin_name', longName)}
                style={styles.inputField}
                dense
              />
            </CardRow>
          </SectionCard>

          {/* ── Comidas rápidas ── */}
          <SectionCard title="Comidas rápidas">
            {quickMeals.length === 0 && (
              <CardRow>
                <Text style={styles.emptyText}>Sin comidas rápidas guardadas.</Text>
              </CardRow>
            )}
            {quickMeals.map((meal, i) => (
              <CardRow key={meal.id} last={i === quickMeals.length - 1 && false}>
                <View style={styles.mealRow}>
                  <View style={styles.mealInfo}>
                    <Text style={styles.mealName}>{meal.name}</Text>
                    <Text style={styles.mealCarbs}>{meal.carbs_grams}g carbs</Text>
                  </View>
                  <IconButton
                    icon="trash-can-outline"
                    size={18}
                    iconColor={COLORS.textSecondary}
                    onPress={() => handleDeleteMeal(meal)}
                    style={{ margin: 0 }}
                  />
                </View>
              </CardRow>
            ))}
            <CardRow last>
              <View style={styles.addMealRow}>
                <TextInput
                  mode="outlined"
                  label="Nombre"
                  value={newMealName}
                  onChangeText={setNewMealName}
                  style={[styles.inputField, { flex: 1 }]}
                  dense
                />
                <TextInput
                  mode="outlined"
                  label="Carbs (g)"
                  value={newMealCarbs}
                  onChangeText={setNewMealCarbs}
                  keyboardType="decimal-pad"
                  style={[styles.inputField, { width: 90 }]}
                  dense
                />
                <IconButton
                  icon="plus-circle"
                  size={28}
                  iconColor={newMealName.trim() ? COLORS.primary : COLORS.border}
                  onPress={handleAddMeal}
                  disabled={!newMealName.trim()}
                  style={{ margin: 0 }}
                />
              </View>
            </CardRow>
          </SectionCard>

          {/* ── Datos ── */}
          <SectionCard title="Datos">
            <CardRow>
              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => Alert.alert('Exportar datos', 'Esta función estará disponible próximamente.')}
              >
                <Text style={styles.actionLabel}>Exportar datos</Text>
                <Text style={styles.actionChevron}>›</Text>
              </TouchableOpacity>
            </CardRow>
            <CardRow last>
              <TouchableOpacity style={styles.actionRow} onPress={handleDeleteAll}>
                <Text style={[styles.actionLabel, { color: COLORS.danger }]}>
                  Borrar todos los datos
                </Text>
                <Text style={[styles.actionChevron, { color: COLORS.danger }]}>›</Text>
              </TouchableOpacity>
            </CardRow>
          </SectionCard>

          {/* ── Acerca de ── */}
          <SectionCard title="Acerca de">
            <CardRow>
              <View style={styles.aboutAppRow}>
                <View style={styles.aboutAppInfo}>
                  <Text style={styles.aboutAppName}>GluControl</Text>
                  <Text style={styles.aboutDesc}>
                    Registro personal de glucemia, insulina, comidas y ejercicio.
                  </Text>
                </View>
                <Text style={styles.aboutVersion}>v1.0.0</Text>
              </View>
            </CardRow>
            <CardRow>
              <View style={styles.aboutRow}>
                <Text style={styles.aboutLabel}>Desarrollado por</Text>
                <TouchableOpacity onPress={() => Linking.openURL('https://ramireznicc.netlify.app')}>
                  <Text style={styles.aboutDevLink}>ramireznicc ↗</Text>
                </TouchableOpacity>
              </View>
            </CardRow>
            <CardRow last>
              <View style={styles.poweredByRow}>
                <MaterialCommunityIcons
                  name="star-four-points"
                  size={14}
                  color="#E8732A"
                />
                <Text style={styles.poweredByText}>  Powered by </Text>
                <Text style={[styles.poweredByBrand, { color: '#E8732A' }]}>Claude</Text>
                <Text style={styles.poweredByText}> · Anthropic</Text>
              </View>
            </CardRow>
          </SectionCard>
        </ScrollView>

        <Snackbar
          visible={snackVisible}
          onDismiss={() => setSnackVisible(false)}
          duration={2000}
          style={[styles.snackbar, { marginBottom: Math.max(insets.bottom, 12) + 76 }]}
        >
          {snackMsg}
        </Snackbar>
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
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  // Section
  section: {
    marginBottom: 24,
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
  cardRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  divider: {
    marginHorizontal: 16,
    backgroundColor: COLORS.border,
  },

  // Range bar
  rangeBarWrapper: {
    paddingVertical: 4,
  },
  rangeBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  rangeLabelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rangeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rangeLabelText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  rangeInputRow: {
    flexDirection: 'row',
    gap: 12,
  },

  // Inputs
  inputField: {
    backgroundColor: COLORS.surface,
    fontSize: 14,
  },

  // Sub-section label
  subSectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Suggestions dropdown
  suggestions: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    marginTop: 2,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
  },
  suggestionItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  suggestionText: {
    fontSize: 14,
    color: COLORS.text,
  },

  // Quick meals
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  mealCarbs: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  addMealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },

  // Actions (Datos section)
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionLabel: {
    fontSize: 15,
    color: COLORS.text,
  },
  actionChevron: {
    fontSize: 20,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },

  // About
  aboutAppRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  aboutAppInfo: {
    flex: 1,
    marginRight: 12,
  },
  aboutAppName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 3,
  },
  aboutVersion: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aboutLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  aboutDevLink: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
  aboutDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
  },
  poweredByRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  poweredByText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  poweredByBrand: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // Snackbar
  snackbar: {
    marginHorizontal: 12,
    borderRadius: 10,
  },
});
