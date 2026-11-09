import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { loginWithOAuthPKCE } from '../services/authService';

interface LoginScreenProps {
  onLoginSuccess: (sessionData: {
    accessToken: string;
    refreshToken: string;
    user: { id: string; email: string; name: string };
  }) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleStartOAuth = async () => {
    setLoading(true);
    setErrorMessage(null);

    const result = await loginWithOAuthPKCE();
    setLoading(false);

    if (result.success && result.accessToken && result.refreshToken && result.user) {
      onLoginSuccess({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      });
    } else if (result.error !== 'cancelled') {
      setErrorMessage(result.message || 'Error desconocido al autenticar.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.badge}>RFC 7636 • PKCE REAL</Text>
        <Text style={styles.title}>Seguridad Móvil</Text>
        <Text style={styles.subtitle}>
          Autenticación delegada en navegador seguro del sistema operativo (WebBrowser).
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoItem}>
            🔐 <Text style={styles.bold}>code_verifier:</Text> 64 caracteres de alta entropía.
          </Text>
          <Text style={styles.infoItem}>
            ⚡ <Text style={styles.bold}>code_challenge:</Text> SHA-256 Base64URL unpadded.
          </Text>
          <Text style={styles.infoItem}>
            🛡️ <Text style={styles.bold}>Anti-CSRF:</Text> Validación criptográfica de state.
          </Text>
          <Text style={styles.infoItem}>
            🚫 <Text style={styles.bold}>Prohibido:</Text> WebViews embebidas estándar.
          </Text>
        </View>

        {errorMessage && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleStartOAuth}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Iniciar Sesión con Navegador</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#0F172A',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  badge: {
    backgroundColor: '#38BDF8',
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 11,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  infoBox: {
    width: '100%',
    backgroundColor: '#0F172A',
    padding: 14,
    borderRadius: 10,
    marginBottom: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  infoItem: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 16,
  },
  bold: {
    fontWeight: '700',
    color: '#F1F5F9',
  },
  errorBox: {
    width: '100%',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 12,
  },
  button: {
    width: '100%',
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#1E40AF',
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
