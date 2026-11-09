import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.badge}>RFC 7636</Text>
        <Text style={styles.title}>Seguridad Móvil</Text>
        <Text style={styles.subtitle}>
          Autenticación robusta con OAuth 2.0 + PKCE y navegador seguro del sistema.
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            🔒 Ningún secreto de cliente (client_secret) reside en la aplicación.
          </Text>
          <Text style={styles.infoText}>
            🌐 Se abrirá el navegador nativo del sistema para delegar identidad.
          </Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={onLoginSuccess}>
          <Text style={styles.buttonText}>Iniciar Sesión con Navegador</Text>
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
    maxWidth: 400,
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
    fontWeight: '700',
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  infoBox: {
    width: '100%',
    backgroundColor: '#0F172A',
    padding: 14,
    borderRadius: 10,
    marginBottom: 24,
    gap: 8,
  },
  infoText: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    width: '100%',
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
