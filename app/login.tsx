import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { COLORS, FONTS } from '../constants/theme';
import { updateSetting } from '../lib/database';
import { seedDemoData } from '../lib/seedData';

// ─── Google "G" logo (paths oficiales de Google Brand Guidelines) ─────────────

function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <Path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <Path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <Path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </Svg>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const router = useRouter();

  const [username,    setUsername]    = useState('');
  const [password,    setPassword]    = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);

  // ── Fake login ─────────────────────────────────────────────────────────────
  const doLogin = () => {
    updateSetting('is_logged_in', 'true');
    router.replace('/(tabs)/');
  };

  const handleLogin = () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Campos requeridos', 'Ingresá un usuario y contraseña para continuar.');
      return;
    }
    setLoading(true);
    setTimeout(() => { setLoading(false); doLogin(); }, 600);
  };

  const handleGoogle = () => {
    setLoading(true);
    setTimeout(() => { setLoading(false); doLogin(); }, 600);
  };

  // ── Demo data ──────────────────────────────────────────────────────────────
  const handleSeedDemo = () => {
    Alert.alert(
      'Cargar datos demo',
      'Se cargarán 7 días de registros ficticios de Juan García (T1D). Los datos actuales serán reemplazados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cargar demo',
          onPress: () => {
            setSeedLoading(true);
            setTimeout(() => {
              seedDemoData();
              setSeedLoading(false);
              updateSetting('is_logged_in', 'true');
              router.replace('/(tabs)/');
            }, 400);
          },
        },
      ],
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>

          {/* ── Logo ── */}
          <View style={styles.logoArea}>
            {/* Sombra separada del clip para que funcione en iOS y Android */}
            <View style={styles.logoShadow}>
              <View style={styles.logoClip}>
                <Image
                  source={require('../assets/icon.png')}
                  style={styles.logoImage}
                  resizeMode="cover"
                />
              </View>
            </View>
            <Text style={styles.appName}>glu-control</Text>
            <Text style={styles.tagline}>tu diario de glucemia</Text>
          </View>

          {/* ── Form card ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Bienvenidx 👋</Text>

            <TextInput
              mode="outlined"
              label="Usuario"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              left={<TextInput.Icon icon="account-outline" />}
              style={styles.input}
              outlineStyle={styles.inputOutline}
            />

            <TextInput
              mode="outlined"
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              left={<TextInput.Icon icon="lock-outline" />}
              right={
                <TextInput.Icon
                  icon={showPass ? 'eye-off-outline' : 'eye-outline'}
                  onPress={() => setShowPass(v => !v)}
                />
              }
              style={styles.input}
              outlineStyle={styles.inputOutline}
            />

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              disabled={loading || seedLoading}
              style={styles.loginBtn}
              contentStyle={styles.btnContent}
              labelStyle={styles.loginBtnLabel}
            >
              Iniciar sesión
            </Button>

            {/* ── Divider ── */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>o</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* ── Google button ── */}
            <TouchableOpacity
              style={[styles.googleBtn, (loading || seedLoading) && styles.disabled]}
              onPress={handleGoogle}
              disabled={loading || seedLoading}
              activeOpacity={0.75}
            >
              <GoogleLogo size={20} />
              <Text style={styles.googleBtnText}>Continuar con Google</Text>
            </TouchableOpacity>
          </View>

          {/* ── Demo link ── */}
          <View style={styles.demoArea}>
            <TouchableOpacity
              onPress={handleSeedDemo}
              disabled={seedLoading}
              activeOpacity={0.7}
            >
              <Text style={styles.demoLink}>
                {seedLoading ? 'Cargando datos...' : '✦  Probar con datos de demo'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.demoHint}>
              Cualquier credencial funciona · Solo para demostración
            </Text>
          </View>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  kav: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },

  // Logo
  logoArea: {
    alignItems: 'center',
    marginBottom: 32,
  },
  // Shadow en view exterior (sin overflow:hidden) para que se vea en iOS
  logoShadow: {
    marginBottom: 14,
    borderRadius: 40,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.30,
    shadowRadius: 14,
    elevation: 8,
  },
  // Clip circular en view interior
  logoClip: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
  },
  logoImage: {
    width: 80,
    height: 80,
  },
  appName: {
    fontSize: 30,
    fontFamily: FONTS.serif,
    color: COLORS.text,
    letterSpacing: 0,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '400',
  },

  // Card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontFamily: FONTS.serif,
    color: COLORS.text,
    marginBottom: 20,
  },

  // Inputs
  input: {
    backgroundColor: COLORS.surface,
    marginBottom: 12,
    fontSize: 15,
  },
  inputOutline: {
    borderRadius: 10,
  },

  // Buttons
  loginBtn: {
    borderRadius: 12,
    marginTop: 4,
    marginBottom: 20,
  },
  btnContent: {
    paddingVertical: 6,
  },
  loginBtnLabel: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  disabled: {
    opacity: 0.5,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },

  // Google
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
  },
  googleBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },

  // Demo
  demoArea: {
    alignItems: 'center',
    gap: 6,
  },
  demoLink: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
  demoHint: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
