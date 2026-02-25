import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { TextInput, Button, Chip, Text } from 'react-native-paper';
import { COLORS } from '../../constants/theme';
import { insertGlucose } from '../../lib/database';
import { getCurrentTime, buildTimestamp } from '../../lib/utils';

type Settings = Record<string, string>;

interface Props {
  settings: Settings;
  onSaved: (msg: string) => void;
}

const READING_TYPES = [
  { key: 'ayunas', label: 'Ayunas' },
  { key: 'pre_comida', label: 'Pre-comida' },
  { key: 'post_comida', label: 'Post-comida' },
  { key: 'dormir', label: 'Antes de dormir' },
  { key: 'otro', label: 'Otro' },
];

const getGlucoseColor = (value: number, min: number, max: number): string => {
  if (value < min - 20 || value > max + 50) return COLORS.danger;
  if (value < min || value > max) return COLORS.warning;
  return COLORS.success;
};

export default function GlucoseForm({ settings, onSaved }: Props) {
  const [valueStr, setValueStr] = useState('');
  const [readingType, setReadingType] = useState('ayunas');
  const [time, setTime] = useState(getCurrentTime);
  const [notes, setNotes] = useState('');

  const numValue = parseFloat(valueStr);
  const isValid = !isNaN(numValue) && numValue > 0 && numValue < 1000;

  const targetMin = parseFloat(settings.target_min ?? '80');
  const targetMax = parseFloat(settings.target_max ?? '130');
  const glucoseColor = isValid ? getGlucoseColor(numValue, targetMin, targetMax) : COLORS.border;

  const handleSave = () => {
    if (!isValid) return;
    insertGlucose({
      value: numValue,
      reading_type: readingType,
      notes,
      timestamp: buildTimestamp(time),
    });
    onSaved('Glucosa guardada');
  };

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.container}
    >
      <View style={styles.valueRow}>
        <TextInput
          mode="outlined"
          label="mg/dL"
          value={valueStr}
          onChangeText={setValueStr}
          keyboardType="numeric"
          autoFocus
          style={styles.valueInput}
          contentStyle={styles.valueInputContent}
          outlineStyle={{ borderColor: glucoseColor, borderWidth: 2 }}
        />
        {isValid && (
          <View style={[styles.badge, { backgroundColor: glucoseColor }]}>
            <Text style={styles.badgeText}>
              {numValue < targetMin - 20 ? 'Bajo' : numValue > targetMax + 50 ? 'Muy alto' : numValue < targetMin ? 'Bajo' : numValue > targetMax ? 'Alto' : 'OK'}
            </Text>
          </View>
        )}
      </View>

      <Text variant="labelMedium" style={styles.sectionLabel}>Tipo de lectura</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {READING_TYPES.map((t) => (
          <Chip
            key={t.key}
            selected={readingType === t.key}
            onPress={() => setReadingType(t.key)}
            style={[styles.chip, readingType === t.key && styles.chipSelected]}
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
        Guardar glucosa
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  valueInput: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  valueInputContent: {
    fontSize: 32,
    textAlign: 'center',
    fontWeight: '700',
    paddingVertical: 12,
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 70,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
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
  field: {
    backgroundColor: COLORS.surface,
  },
  saveButton: {
    marginTop: 8,
    borderRadius: 10,
  },
  saveButtonContent: {
    paddingVertical: 6,
  },
});
