import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { TextInput, Button, Chip, Text } from 'react-native-paper';
import { COLORS } from '../../constants/theme';
import { insertMeal, getQuickMeals } from '../../lib/database';
import { getCurrentTime, buildTimestamp } from '../../lib/utils';

interface Props {
  onSaved: (msg: string) => void;
}

type QuickMeal = { id: number; name: string; carbs_grams: number };

const MEAL_TYPES = [
  { key: 'desayuno', label: 'Desayuno' },
  { key: 'almuerzo', label: 'Almuerzo' },
  { key: 'merienda', label: 'Merienda' },
  { key: 'cena', label: 'Cena' },
  { key: 'snack', label: 'Snack' },
];

const getDefaultMealType = (): string => {
  const hour = new Date().getHours();
  if (hour < 10) return 'desayuno';
  if (hour < 14) return 'almuerzo';
  if (hour < 18) return 'merienda';
  if (hour < 22) return 'cena';
  return 'snack';
};

export default function MealForm({ onSaved }: Props) {
  const [quickMeals, setQuickMeals] = useState<QuickMeal[]>([]);
  const [description, setDescription] = useState('');
  const [carbsStr, setCarbsStr] = useState('');
  const [mealType, setMealType] = useState(getDefaultMealType);
  const [time, setTime] = useState(getCurrentTime);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setQuickMeals(getQuickMeals() as QuickMeal[]);
  }, []);

  const isValid = description.trim().length > 0;
  const carbsNum = carbsStr ? parseFloat(carbsStr) : null;

  const handleQuickFood = (label: string, carbs: number) => {
    setDescription(label);
    setCarbsStr(String(carbs));
  };

  const handleSave = () => {
    if (!isValid) return;
    insertMeal({
      description: description.trim(),
      carbs_grams: isNaN(carbsNum as number) ? null : carbsNum,
      meal_type: mealType,
      notes,
      timestamp: buildTimestamp(time),
    });
    onSaved('Comida guardada');
  };

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.container}
    >
      <TextInput
        mode="outlined"
        label="Descripción"
        value={description}
        onChangeText={setDescription}
        autoFocus
        style={styles.field}
      />

      <TextInput
        mode="outlined"
        label="Carbohidratos (g)"
        value={carbsStr}
        onChangeText={setCarbsStr}
        keyboardType="decimal-pad"
        style={styles.field}
      />

      {quickMeals.length > 0 && (
        <>
          <Text variant="labelMedium" style={styles.sectionLabel}>Alimentos rápidos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {quickMeals.map((f) => (
              <Chip
                key={f.id}
                onPress={() => handleQuickFood(f.name, f.carbs_grams)}
                style={styles.chip}
                icon="food"
              >
                {f.name} ({f.carbs_grams}g)
              </Chip>
            ))}
          </ScrollView>
        </>
      )}

      <Text variant="labelMedium" style={styles.sectionLabel}>Tipo de comida</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {MEAL_TYPES.map((t) => (
          <Chip
            key={t.key}
            selected={mealType === t.key}
            onPress={() => setMealType(t.key)}
            style={[styles.chip, mealType === t.key && styles.chipSelected]}
            showSelectedCheck={false}
          >
            {t.label}
          </Chip>
        ))}
      </ScrollView>

      <TextInput
        mode="outlined"
        label="Hora (HH:MM)"
        value={time}
        onChangeText={setTime}
        keyboardType="numeric"
        style={styles.field}
      />

      <TextInput
        mode="outlined"
        label="Notas (opcional)"
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
        style={styles.field}
      />

      <Button
        mode="contained"
        onPress={handleSave}
        disabled={!isValid}
        style={styles.saveButton}
        contentStyle={styles.saveButtonContent}
      >
        Guardar comida
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  field: {
    backgroundColor: COLORS.surface,
  },
  sectionLabel: {
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  chipRow: {
    flexGrow: 0,
  },
  chip: {
    marginRight: 8,
    backgroundColor: COLORS.surface,
  },
  chipSelected: {
    backgroundColor: '#EEF2FF',
  },
  saveButton: {
    marginTop: 8,
    borderRadius: 10,
  },
  saveButtonContent: {
    paddingVertical: 6,
  },
});
