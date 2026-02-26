import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_500Medium,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import { theme } from '../constants/theme';
import { initDB, getSettings } from '../lib/database';

export default function RootLayout() {
  const router   = useRouter();
  const segments = useSegments();

  // ── Fonts ──────────────────────────────────────────────────────────────────
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_500Medium,
    PlayfairDisplay_700Bold,
  });

  // ── Init DB on mount ───────────────────────────────────────────────────────
  useEffect(() => {
    initDB();
  }, []);

  // ── Auth guard (re-reads DB on every navigation) ───────────────────────────
  useEffect(() => {
    if (!fontsLoaded) return;
    if (segments.length === 0) return;

    const loggedIn = getSettings().is_logged_in === 'true';
    const inLogin  = segments[0] === 'login';

    if (!loggedIn && !inLogin) {
      router.replace('/login');
    } else if (loggedIn && inLogin) {
      router.replace('/(tabs)/');
    }
  }, [fontsLoaded, segments]);

  // Esperar fuentes antes de renderizar para evitar flash sin tipografía
  if (!fontsLoaded) return null;

  return (
    <PaperProvider theme={theme}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </PaperProvider>
  );
}
