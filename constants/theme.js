import { MD3LightTheme, configureFonts } from 'react-native-paper';

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

// ─── Serif font (Playfair Display) ────────────────────────────────────────────
// Cargadas en _layout.tsx con useFonts
export const FONTS = {
  serif:        'PlayfairDisplay_700Bold',
  serifMedium:  'PlayfairDisplay_500Medium',
  serifRegular: 'PlayfairDisplay_400Regular',
};

// ─── Override headline/display variants → serif ───────────────────────────────
const fontConfig = {
  displayLarge:   { fontFamily: FONTS.serif },
  displayMedium:  { fontFamily: FONTS.serif },
  displaySmall:   { fontFamily: FONTS.serif },
  headlineLarge:  { fontFamily: FONTS.serif },
  headlineMedium: { fontFamily: FONTS.serif },
  headlineSmall:  { fontFamily: FONTS.serif },
  titleLarge:     { fontFamily: FONTS.serifMedium },
};

export const theme = {
  ...MD3LightTheme,
  fonts: configureFonts({ config: fontConfig }),
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
