import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../constants/theme';
import ScreenWrapper from '../../components/ScreenWrapper';

export default function HistorialScreen() {
  return (
    <ScreenWrapper>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.headerTitle}>Historial</Text>
        </View>
        <View style={styles.container}>
          <MaterialCommunityIcons name="calendar-month-outline" size={48} color={COLORS.border} style={styles.icon} />
          <Text variant="headlineSmall" style={styles.title}>Vista semanal y mensual</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            La vista semanal y mensual de tus registros aparecerá aquí.
          </Text>
        </View>
      </SafeAreaView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: {
    color: COLORS.text,
    fontFamily: FONTS.serif,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    paddingBottom: 120,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
