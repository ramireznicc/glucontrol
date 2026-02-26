import React, { useState, useEffect } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Text, Snackbar, TouchableRipple } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS } from '../../constants/theme';
import { getSettings } from '../../lib/database';
import GlucoseForm from '../../components/forms/GlucoseForm';
import MealForm from '../../components/forms/MealForm';
import ExerciseForm from '../../components/forms/ExerciseForm';
import InsulinForm from '../../components/forms/InsulinForm';
import ScreenWrapper from '../../components/ScreenWrapper';

type FormType = 'glucosa' | 'comida' | 'ejercicio' | 'insulina';

const FORM_OPTIONS: { key: FormType; emoji: string; label: string }[] = [
  { key: 'glucosa', emoji: '🩸', label: 'Glucosa' },
  { key: 'comida', emoji: '🍽️', label: 'Comida' },
  { key: 'ejercicio', emoji: '🏃', label: 'Ejercicio' },
  { key: 'insulina', emoji: '💉', label: 'Insulina' },
];

export default function RegistrarScreen() {
  const insets = useSafeAreaInsets();
  const [activeForm, setActiveForm] = useState<FormType>('glucosa');
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  useEffect(() => {
    setSettings(getSettings());
  }, []);

  const handleSaved = (msg: string) => {
    setSnackbarMsg(msg);
    setSnackbarVisible(true);
  };

  const handleTypeChange = (type: FormType) => {
    setActiveForm(type);
  };

  return (
    <ScreenWrapper>
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.headerTitle}>Registrar</Text>
        </View>

        {/* Type selector */}
        <View style={styles.typeSelector}>
          {FORM_OPTIONS.map((opt) => {
            const isActive = activeForm === opt.key;
            return (
              <TouchableRipple
                key={opt.key}
                onPress={() => handleTypeChange(opt.key)}
                style={[styles.typeButton, isActive && styles.typeButtonActive]}
                borderless
                rippleColor="rgba(37, 99, 235, 0.1)"
              >
                <View style={styles.typeButtonInner}>
                  <Text style={styles.typeEmoji}>{opt.emoji}</Text>
                  <Text
                    variant="labelSmall"
                    style={[styles.typeLabel, isActive && styles.typeLabelActive]}
                    numberOfLines={1}
                  >
                    {opt.label}
                  </Text>
                </View>
              </TouchableRipple>
            );
          })}
        </View>

        {/* Active form — key prop forces remount (clean state) on type change */}
        <ScrollView
          style={styles.flex}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 12) + 90 }}
        >
          {activeForm === 'glucosa' && (
            <GlucoseForm key="glucosa" settings={settings} onSaved={handleSaved} />
          )}
          {activeForm === 'comida' && (
            <MealForm key="comida" onSaved={handleSaved} />
          )}
          {activeForm === 'ejercicio' && (
            <ExerciseForm key="ejercicio" onSaved={handleSaved} />
          )}
          {activeForm === 'insulina' && (
            <InsulinForm key="insulina" settings={settings} onSaved={handleSaved} />
          )}
        </ScrollView>

        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={2500}
          style={[styles.snackbar, { marginBottom: Math.max(insets.bottom, 12) + 76 }]}
        >
          {snackbarMsg}
        </Snackbar>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: {
    color: COLORS.text,
    fontFamily: FONTS.serif,
  },
  typeSelector: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginBottom: 8,
    gap: 8,
  },
  typeButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },
  typeButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#EEF2FF',
  },
  typeButtonInner: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  typeEmoji: {
    fontSize: 24,
    marginBottom: 2,
  },
  typeLabel: {
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  typeLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  snackbar: {
    marginBottom: 8,
    marginHorizontal: 12,
    borderRadius: 10,
  },
});
