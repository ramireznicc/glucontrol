import React, { useState } from 'react';
import { View, Keyboard, StyleSheet } from 'react-native';
import { TextInput, Button, Chip, Text, IconButton } from 'react-native-paper';
import { COLORS } from '../../constants/theme';
import { insertExercise } from '../../lib/database';
import { getCurrentTime, buildTimestamp } from '../../lib/utils';

interface Props {
  onSaved: (msg: string) => void;
}

const EXERCISE_TYPES = [
  { key: 'cardio', label: 'Cardio', icon: 'run' },
  { key: 'fuerza', label: 'Fuerza', icon: 'weight-lifter' },
  { key: 'caminata', label: 'Caminata', icon: 'walk' },
  { key: 'otro', label: 'Otro', icon: 'dots-horizontal' },
];

const INTENSITIES = [
  { key: 'baja', label: 'Baja' },
  { key: 'moderada', label: 'Moderada' },
  { key: 'alta', label: 'Alta' },
];

export default function ExerciseForm({ onSaved }: Props) {
  const [exerciseType, setExerciseType] = useState('cardio');
  const [duration, setDuration] = useState(30);
  const [intensity, setIntensity] = useState('moderada');
  const [time, setTime] = useState(getCurrentTime);
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    insertExercise({
      exercise_type: exerciseType,
      duration_minutes: duration,
      intensity,
      notes,
      timestamp: buildTimestamp(time),
    });
    Keyboard.dismiss();
    setDuration(30);
    setNotes('');
    setTime(getCurrentTime());
    onSaved('Ejercicio guardado ✓');
  };

  return (
    <View style={styles.container}>
      <Text variant="labelMedium" style={styles.sectionLabel}>Tipo de ejercicio</Text>
      <View style={styles.typeGrid}>
        {EXERCISE_TYPES.map((t) => (
          <Chip
            key={t.key}
            selected={exerciseType === t.key}
            onPress={() => setExerciseType(t.key)}
            style={[styles.typeChip, exerciseType === t.key && styles.chipSelected]}
            icon={t.icon}
            showSelectedCheck={false}
          >
            {t.label}
          </Chip>
        ))}
      </View>

      <Text variant="labelMedium" style={styles.sectionLabel}>Duración</Text>
      <View style={styles.stepperRow}>
        <IconButton
          icon="minus-circle-outline"
          size={32}
          iconColor={duration <= 5 ? COLORS.border : COLORS.primary}
          onPress={() => setDuration((d) => Math.max(5, d - 5))}
          disabled={duration <= 5}
        />
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{duration}</Text>
          <Text style={styles.durationUnit}>min</Text>
        </View>
        <IconButton
          icon="plus-circle-outline"
          size={32}
          iconColor={duration >= 180 ? COLORS.border : COLORS.primary}
          onPress={() => setDuration((d) => Math.min(180, d + 5))}
          disabled={duration >= 180}
        />
      </View>

      <Text variant="labelMedium" style={styles.sectionLabel}>Intensidad</Text>
      <View style={styles.intensityRow}>
        {INTENSITIES.map((i) => (
          <Chip
            key={i.key}
            selected={intensity === i.key}
            onPress={() => setIntensity(i.key)}
            style={[styles.chip, intensity === i.key && styles.chipSelected]}
            showSelectedCheck={false}
          >
            {i.label}
          </Chip>
        ))}
      </View>

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
        style={styles.saveButton}
        contentStyle={styles.saveButtonContent}
      >
        Guardar ejercicio
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  sectionLabel: {
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    backgroundColor: COLORS.surface,
    marginBottom: 4,
  },
  chip: {
    marginRight: 8,
    backgroundColor: COLORS.surface,
  },
  chipSelected: {
    backgroundColor: '#EEF2FF',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  durationBadge: {
    alignItems: 'center',
    minWidth: 80,
  },
  durationText: {
    fontSize: 40,
    fontWeight: '700',
    color: COLORS.primary,
    lineHeight: 44,
  },
  durationUnit: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  intensityRow: {
    flexDirection: 'row',
    gap: 8,
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
