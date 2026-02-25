import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { TextInput, Button, Chip, Text, Banner } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/theme';
import { insertInsulin } from '../../lib/database';
import { getCurrentTime, buildTimestamp } from '../../lib/utils';

type Settings = Record<string, string>;

interface Props {
  settings: Settings;
  onSaved: (msg: string) => void;
}

export default function InsulinForm({ settings, onSaved }: Props) {
  const router = useRouter();
  const [insulinType, setInsulinType] = useState<'rapida' | 'lenta'>('rapida');
  const [unitsStr, setUnitsStr] = useState('');
  const [time, setTime] = useState(getCurrentTime);
  const [notes, setNotes] = useState('');

  const brandName =
    insulinType === 'rapida'
      ? settings.rapid_insulin_name ?? ''
      : settings.long_insulin_name ?? '';

  const noBrand = !brandName.trim();
  const unitsNum = parseFloat(unitsStr);
  const isValid = !isNaN(unitsNum) && unitsNum > 0;

  const handleSave = () => {
    if (!isValid) return;
    insertInsulin({
      units: unitsNum,
      insulin_type: insulinType,
      brand_name: brandName,
      notes,
      timestamp: buildTimestamp(time),
    });
    onSaved('Insulina guardada');
  };

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.container}
    >
      <Text variant="labelMedium" style={styles.sectionLabel}>Tipo de insulina</Text>
      <View style={styles.typeRow}>
        {(['rapida', 'lenta'] as const).map((t) => (
          <Chip
            key={t}
            selected={insulinType === t}
            onPress={() => setInsulinType(t)}
            style={[styles.typeChip, insulinType === t && styles.chipSelected]}
            showSelectedCheck={false}
          >
            {t === 'rapida' ? 'Rápida' : 'Lenta'}
          </Chip>
        ))}
      </View>

      {noBrand ? (
        <Banner
          visible
          icon="information-outline"
          actions={[
            {
              label: 'Ir a Ajustes',
              onPress: () => router.push('/(tabs)/ajustes'),
            },
          ]}
          style={styles.banner}
        >
          No hay marca configurada para insulina {insulinType === 'rapida' ? 'rápida' : 'lenta'}.
          Podés configurarla en Ajustes.
        </Banner>
      ) : (
        <View style={styles.brandBadge}>
          <Text variant="labelMedium" style={styles.brandLabel}>Marca</Text>
          <Text variant="titleMedium" style={styles.brandName}>{brandName}</Text>
        </View>
      )}

      <TextInput
        mode="outlined"
        label="Unidades"
        value={unitsStr}
        onChangeText={setUnitsStr}
        keyboardType="decimal-pad"
        autoFocus
        style={styles.field}
        contentStyle={styles.unitsInputContent}
      />

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
        Guardar insulina
      </Button>
    </ScrollView>
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
  typeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeChip: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  chipSelected: {
    backgroundColor: '#EEF2FF',
  },
  banner: {
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
  },
  brandBadge: {
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  brandLabel: {
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  brandName: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  field: {
    backgroundColor: COLORS.surface,
  },
  unitsInputContent: {
    fontSize: 28,
    textAlign: 'center',
    fontWeight: '700',
    paddingVertical: 10,
  },
  saveButton: {
    marginTop: 8,
    borderRadius: 10,
  },
  saveButtonContent: {
    paddingVertical: 6,
  },
});
