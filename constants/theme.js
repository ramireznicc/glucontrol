import { MD3LightTheme } from 'react-native-paper';

export const COLORS = {
  primary: '#6366F1',
  background: '#FAFAFA',
  surface: '#FFFFFF',
  text: '#1E293B',
  textSecondary: '#64748B',
  border: '#E2E8F0',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
};

export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: COLORS.primary,
    primaryContainer: '#EEF2FF',
    secondary: '#64748B',
    secondaryContainer: '#F1F5F9',
    background: COLORS.background,
    surface: COLORS.surface,
    surfaceVariant: '#F5F3FF',
    onSurface: COLORS.text,
    onSurfaceVariant: COLORS.textSecondary,
    onBackground: COLORS.text,
    outline: COLORS.border,
    error: COLORS.danger,
  },
};
