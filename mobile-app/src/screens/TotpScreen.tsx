import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { CONFIG } from '../config';
import { parseTotpInput } from '../crypto/base32';
import { generateTOTP, getTotpWindowInfo, timeCounterToBuffer } from '../crypto/totp';

interface TotpScreenProps {
  onBack: () => void;
}

const DEFAULT_URI = `otpauth://totp/UniSabana:estudiante@unisabana.edu.co?secret=${CONFIG.TOTP.DEFAULT_SECRET_BASE32}&issuer=UniSabana`;

export const TotpScreen: React.FC<TotpScreenProps> = ({ onBack }) => {
  const [seedInput, setSeedInput] = useState<string>(CONFIG.TOTP.DEFAULT_SECRET_BASE32);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  // Sincronización del reloj local cada 250ms para evitar desfase visual en el cambio de segundo
  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 250);
    return () => clearInterval(interval);
  }, []);

  const parsedInput = parseTotpInput(seedInput);
  const windowInfo = getTotpWindowInfo(nowMs);

  let code = '------';
  let hexBuffer = '00 00 00 00 00 00 00 00';
  let error: string | null = null;

  try {
    code = generateTOTP(seedInput, nowMs);
    const buffer = timeCounterToBuffer(Math.floor(nowMs / 1000));
    hexBuffer = Array.from(buffer)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(' ')
      .toUpperCase();
  } catch (err: any) {
    error = err?.message || 'Semilla Base32 inválida.';
  }

  const totpState = { code, hexBuffer, error };

  const isExpiringSoon = windowInfo.secondsRemaining <= 5;

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>← Volver al Panel</Text>
      </TouchableOpacity>

      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Autenticador TOTP</Text>
          <Text style={styles.subtitle}>RFC 6238 • 100% Offline (Modo Avión)</Text>
        </View>
        <View style={styles.offlineBadge}>
          <Text style={styles.offlineBadgeText}>✈️ OFFLINE READY</Text>
        </View>
      </View>

      <View style={[styles.codeCard, isExpiringSoon && styles.codeCardExpiring]}>
        <Text style={styles.issuer}>
          {parsedInput.label || 'UniSabana:estudiante@unisabana.edu.co'}
        </Text>

        <Text style={[styles.code, isExpiringSoon && styles.codeExpiring]}>
          {totpState.code}
        </Text>

        <View style={styles.timerContainer}>
          <View
            style={[
              styles.timerProgress,
              { width: `${windowInfo.progressRatio * 100}%` },
              isExpiringSoon && styles.timerProgressExpiring,
            ]}
          />
        </View>

        <View style={styles.timerFooter}>
          <Text style={[styles.timerText, isExpiringSoon && styles.codeExpiring]}>
            Renovación matemática en {windowInfo.secondsRemaining}s
          </Text>
          <Text style={styles.windowCounterText}>T = {windowInfo.timeCounter}</Text>
        </View>
      </View>

      {totpState.error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {totpState.error}</Text>
        </View>
      )}

      <View style={styles.mathCard}>
        <Text style={styles.mathTitle}>Traza Criptográfica Local (RFC 4226 / 6238)</Text>
        <View style={styles.mathRow}>
          <Text style={styles.mathLabel}>Semilla Base32:</Text>
          <Text style={styles.mathValue}>{parsedInput.secret || '—'}</Text>
        </View>
        <View style={styles.mathRow}>
          <Text style={styles.mathLabel}>Buffer 64-bit Big-Endian:</Text>
          <Text style={styles.mathValue}>{totpState.hexBuffer}</Text>
        </View>
        <View style={styles.mathRow}>
          <Text style={styles.mathLabel}>Primitiva:</Text>
          <Text style={styles.mathValue}>HMAC-SHA1 + Dynamic Truncation</Text>
        </View>
      </View>

      <View style={styles.seedSection}>
        <Text style={styles.seedLabel}>Semilla Base32 o URI otpauth://:</Text>
        <TextInput
          style={styles.seedInput}
          value={seedInput}
          onChangeText={setSeedInput}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="JBSWY3DPEHPK3PXP o otpauth://totp/..."
          placeholderTextColor="#64748B"
        />

        <View style={styles.presetRow}>
          <TouchableOpacity
            style={styles.presetButton}
            onPress={() => setSeedInput(CONFIG.TOTP.DEFAULT_SECRET_BASE32)}
          >
            <Text style={styles.presetButtonText}>Semilla Taller (Base32)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.presetButton}
            onPress={() => setSeedInput(DEFAULT_URI)}
          >
            <Text style={styles.presetButtonText}>Formato URI otpauth://</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.seedNote}>
          💡 Ingresa la misma semilla ({CONFIG.TOTP.DEFAULT_SECRET_BASE32}) en Google Authenticator y activa el Modo Avión para comprobar 100% de paridad.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#0F172A',
  },
  backButton: {
    marginTop: 10,
    marginBottom: 14,
  },
  backButtonText: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '600',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  offlineBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: '#22C55E',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  offlineBadgeText: {
    color: '#4ADE80',
    fontSize: 10,
    fontWeight: '800',
  },
  codeCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  codeCardExpiring: {
    borderColor: '#F59E0B',
  },
  issuer: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 12,
    fontFamily: 'monospace',
  },
  code: {
    fontSize: 48,
    fontWeight: '800',
    color: '#38BDF8',
    fontFamily: 'monospace',
    letterSpacing: 8,
    marginBottom: 16,
  },
  codeExpiring: {
    color: '#FBBF24',
  },
  timerContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#0F172A',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  timerProgress: {
    height: '100%',
    backgroundColor: '#38BDF8',
  },
  timerProgressExpiring: {
    backgroundColor: '#F59E0B',
  },
  timerFooter: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  windowCounterText: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: 'monospace',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 12,
  },
  mathCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
    gap: 6,
  },
  mathTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
    marginBottom: 4,
  },
  mathRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  mathLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  mathValue: {
    fontSize: 11,
    color: '#CBD5E1',
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  seedSection: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
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
    padding: 12,
    color: '#F8FAFC',
    fontFamily: 'monospace',
    fontSize: 13,
    marginBottom: 10,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  presetButton: {
    flex: 1,
    backgroundColor: '#334155',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  presetButtonText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
  },
  seedNote: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 17,
  },
});
