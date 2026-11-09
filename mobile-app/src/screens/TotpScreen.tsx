import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
} from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { CONFIG } from '../config';
import { parseTotpInput, type ParsedTotpConfig } from '../crypto/base32';
import { generateTOTP, getTotpWindowInfo, timeCounterToBuffer } from '../crypto/totp';
import { secureStorageService } from '../services/secureStorageService';

interface TotpScreenProps {
  onBack: () => void;
}

const DEFAULT_URI = `otpauth://totp/UniSabana:estudiante@unisabana.edu.co?secret=${CONFIG.TOTP.DEFAULT_SECRET_BASE32}&issuer=UniSabana&algorithm=SHA1&digits=6&period=30`;

export const TotpScreen: React.FC<TotpScreenProps> = ({ onBack }) => {
  const [seedInput, setSeedInput] = useState<string>(CONFIG.TOTP.DEFAULT_SECRET_BASE32);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [scannerVisible, setScannerVisible] = useState<boolean>(false);
  const [permission, requestPermission] = useCameraPermissions();
  const scanLockRef = useRef<boolean>(false);

  // 1. Cargar semilla TOTP persistida en el enclave de hardware (SecureStore) al montar
  useEffect(() => {
    let isMounted = true;
    const loadSavedSeed = async () => {
      const saved = await secureStorageService.getTotpSeed();
      if (!isMounted) return;

      if (saved) {
        setSeedInput(saved);
        setStatusBanner('🔐 Semilla cargada desde Hardware SecureStore (Offline Ready).');
      } else {
        await secureStorageService.saveTotpSeed(CONFIG.TOTP.DEFAULT_SECRET_BASE32);
        setStatusBanner('🔐 Semilla inicial protegida en Hardware SecureStore.');
      }
    };
    loadSavedSeed();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Reloj reactivo local (250ms) para precisión exacta al segundo
  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 250);
    return () => clearInterval(interval);
  }, []);

  // 3. Validar entrada y calcular TOTP de 6 dígitos localmente
  const windowInfo = getTotpWindowInfo(nowMs);
  let parsedConfig: ParsedTotpConfig | null = null;
  let code = '------';
  let hexBuffer = '00 00 00 00 00 00 00 00';
  let validationError: string | null = null;

  try {
    parsedConfig = parseTotpInput(seedInput);
    code = generateTOTP(parsedConfig.secret, nowMs);
    const buffer = timeCounterToBuffer(Math.floor(nowMs / 1000));
    hexBuffer = Array.from(buffer)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(' ')
      .toUpperCase();
  } catch (err: any) {
    validationError = err?.message || 'Configuración TOTP inválida.';
  }

  // 4. Validar, guardar en SecureStore y sincronizar opcionalmente con el backend
  const persistAndSyncSeed = async (candidateInput: string, sourceLabel: string) => {
    setSeedInput(candidateInput);
    try {
      const validated = parseTotpInput(candidateInput);
      await secureStorageService.saveTotpSeed(candidateInput);
      setStatusBanner(`✅ ${sourceLabel}: Semilla (${validated.issuer}) guardada en SecureStore.`);

      // Sincronización silenciosa con el backend si hay red (no falla en Modo Avión)
      fetch(`${CONFIG.API_BASE_URL}/auth/mfa/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: validated.secret }),
      }).catch(() => {});
    } catch {
      setStatusBanner(null);
    }
  };

  // 5. Apertura del escáner QR con solicitud de permisos de cámara
  const handleOpenScanner = async () => {
    if (!permission?.granted) {
      const response = await requestPermission();
      if (!response.granted) {
        setStatusBanner('⚠️ Permiso de cámara denegado. Usa el campo manual Base32.');
        return;
      }
    }
    scanLockRef.current = false;
    setScannerVisible(true);
  };

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (scanLockRef.current || !result.data) return;
    scanLockRef.current = true;
    setScannerVisible(false);
    persistAndSyncSeed(result.data, 'QR Escaneado');
  };

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
          {parsedConfig?.label || 'UniSabana:estudiante@unisabana.edu.co'}
        </Text>

        <Text style={[styles.code, isExpiringSoon && styles.codeExpiring]}>{code}</Text>

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

      {validationError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {validationError}</Text>
        </View>
      )}

      {statusBanner && !validationError && (
        <View style={styles.statusBox}>
          <Text style={styles.statusText}>{statusBanner}</Text>
        </View>
      )}

      <View style={styles.mathCard}>
        <Text style={styles.mathTitle}>Traza Criptográfica Local (RFC 4226 / 6238)</Text>
        <View style={styles.mathRow}>
          <Text style={styles.mathLabel}>Semilla Base32:</Text>
          <Text style={styles.mathValue}>{parsedConfig?.secret || 'INVÁLIDA'}</Text>
        </View>
        <View style={styles.mathRow}>
          <Text style={styles.mathLabel}>Emisor / Parámetros:</Text>
          <Text style={styles.mathValue}>
            {parsedConfig ? `${parsedConfig.issuer} (${parsedConfig.algorithm}, ${parsedConfig.digits}d, ${parsedConfig.period}s)` : '—'}
          </Text>
        </View>
        <View style={styles.mathRow}>
          <Text style={styles.mathLabel}>Buffer 64-bit Big-Endian:</Text>
          <Text style={styles.mathValue}>{hexBuffer}</Text>
        </View>
      </View>

      <View style={styles.seedSection}>
        <Text style={styles.seedLabel}>Ingesta del Secreto (Opción A: QR / Opción B: Manual):</Text>

        <TouchableOpacity style={styles.qrButton} onPress={handleOpenScanner}>
          <Text style={styles.qrButtonText}>📷 Escanear Código QR (otpauth://)</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.seedInput}
          value={seedInput}
          onChangeText={setSeedInput}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="JBSWY3DPEHPK3PXP o otpauth://totp/..."
          placeholderTextColor="#64748B"
        />

        <TouchableOpacity
          style={styles.saveButton}
          onPress={() => persistAndSyncSeed(seedInput, 'Guardado Manual')}
        >
          <Text style={styles.saveButtonText}>💾 Validar y Guardar en SecureStore</Text>
        </TouchableOpacity>

        <View style={styles.presetRow}>
          <TouchableOpacity
            style={styles.presetButton}
            onPress={() => persistAndSyncSeed(CONFIG.TOTP.DEFAULT_SECRET_BASE32, 'Preset Base32')}
          >
            <Text style={styles.presetButtonText}>Semilla Taller (Base32)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.presetButton}
            onPress={() => persistAndSyncSeed(DEFAULT_URI, 'Preset URI otpauth://')}
          >
            <Text style={styles.presetButtonText}>Formato URI otpauth://</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.seedNote}>
          💡 Puedes abrir {CONFIG.API_BASE_URL}/auth/mfa/setup en tu PC para escanear el código QR oficial con esta cámara y con Google Authenticator.
        </Text>
      </View>

      {/* Modal de Cámara para Escaneo QR (expo-camera) */}
      <Modal visible={scannerVisible} animationType="slide" transparent={false}>
        <View style={styles.scannerContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleBarcodeScanned}
          />
          <View style={styles.scannerOverlay}>
            <Text style={styles.scannerTitle}>Escáner QR OAuth / TOTP</Text>
            <Text style={styles.scannerSub}>
              Apunta al código QR con formato otpauth://totp/...
            </Text>
            <View style={styles.scannerFrame} />
            <TouchableOpacity
              style={styles.closeScannerButton}
              onPress={() => setScannerVisible(false)}
            >
              <Text style={styles.closeScannerText}>Cancelar y Cerrar Cámara</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    marginBottom: 14,
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
    marginBottom: 14,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 12,
  },
  statusBox: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderWidth: 1,
    borderColor: '#22C55E',
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  statusText: {
    color: '#4ADE80',
    fontSize: 12,
    fontWeight: '600',
  },
  mathCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 14,
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
    fontWeight: '700',
    marginBottom: 10,
  },
  qrButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  qrButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
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
  saveButton: {
    backgroundColor: '#0284C7',
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
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
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 16,
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  scannerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
    textAlign: 'center',
  },
  scannerSub: {
    fontSize: 13,
    color: '#CBD5E1',
    textAlign: 'center',
    marginTop: 6,
  },
  scannerFrame: {
    width: 240,
    height: 240,
    borderWidth: 2,
    borderColor: '#38BDF8',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  closeScannerButton: {
    width: '100%',
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeScannerText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
