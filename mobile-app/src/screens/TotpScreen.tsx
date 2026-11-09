import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput } from 'react-native';

interface TotpScreenProps {
  onBack: () => void;
}

export const TotpScreen: React.FC<TotpScreenProps> = ({ onBack }) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30);
  const [currentCode, setCurrentCode] = useState<string>('------');
  const [seed, setSeed] = useState<string>('JBSWY3DPEHPK3PXP');

  // Temporizador regresivo base de 30 a 0 segundos
  useEffect(() => {
    const calculateTime = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = 30 - (now % 30);
      setSecondsRemaining(remaining);

      // En Fase 4 implementaremos el motor criptográfico HMAC-SHA1 + Dynamic Truncation
      if (remaining === 30 || currentCode === '------') {
        setCurrentCode('481920');
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [currentCode]);

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>← Volver al Panel</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Autenticador TOTP</Text>
      <Text style={styles.subtitle}>RFC 6238 • 100% Offline (Modo Avión)</Text>

      <View style={styles.codeCard}>
        <Text style={styles.issuer}>UniSabana:estudiante@unisabana.edu.co</Text>
        <Text style={styles.code}>{currentCode}</Text>

        <View style={styles.timerContainer}>
          <View style={[styles.timerProgress, { width: `${(secondsRemaining / 30) * 100}%` }]} />
        </View>
        <Text style={styles.timerText}>Expira en {secondsRemaining}s</Text>
      </View>

      <View style={styles.seedSection}>
        <Text style={styles.seedLabel}>Semilla Base32 (Secreto Compartido):</Text>
        <TextInput
          style={styles.seedInput}
          value={seed}
          onChangeText={setSeed}
          autoCapitalize="characters"
        />
        <Text style={styles.seedNote}>
          📱 Puedes escanear el QR o escribir manualmente la semilla para verificar paridad con Google Authenticator.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#0F172A',
  },
  backButton: {
    marginTop: 20,
    marginBottom: 16,
  },
  backButtonText: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 20,
  },
  codeCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 24,
  },
  issuer: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 14,
  },
  code: {
    fontSize: 48,
    fontWeight: '800',
    color: '#38BDF8',
    fontFamily: 'monospace',
    letterSpacing: 6,
    marginBottom: 16,
  },
  timerContainer: {
    width: '100%',
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  timerProgress: {
    height: '100%',
    backgroundColor: '#38BDF8',
  },
  timerText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  seedSection: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  seedLabel: {
    fontSize: 13,
    color: '#F1F5F9',
    fontWeight: '600',
    marginBottom: 8,
  },
  seedInput: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 10,
    color: '#F8FAFC',
    fontFamily: 'monospace',
    fontSize: 14,
    marginBottom: 8,
  },
  seedNote: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 16,
  },
});

