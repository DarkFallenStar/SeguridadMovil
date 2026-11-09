import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { VaultRecord } from '../types';
import { apiFetch } from '../services/apiClient';
import { tokenMemoryStore } from '../services/tokenMemoryStore';
import { secureStorageService } from '../services/secureStorageService';
import { generateTOTP } from '../crypto/totp';
import { CONFIG } from '../config';

interface VaultScreenProps {
  onBack: () => void;
  onSessionUpdated: (mfaVerified?: boolean) => void;
}

export const VaultScreen: React.FC<VaultScreenProps> = ({ onBack, onSessionUpdated }) => {
  const [vaultData, setVaultData] = useState<VaultRecord | null>(null);
  const [showMfaModal, setShowMfaModal] = useState<boolean>(false);
  const [stepUpToken, setStepUpToken] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [traceLogs, setTraceLogs] = useState<string[]>([]);
  const [lastUsedChallenge, setLastUsedChallenge] = useState<{
    stepUpToken: string;
    code: string;
  } | null>(null);

  const appendLog = (line: string) => {
    setTraceLogs((prev) => [...prev, line]);
  };

  // 1. Solicitar acceso a GET /api/boveda-critica
  const handleAccessVault = async () => {
    setLoading(true);
    setErrorMessage(null);
    setTraceLogs(['📡 1. Solicitando GET /api/boveda-critica con token actual en RAM...']);

    try {
      const res = await apiFetch('/api/boveda-critica');
      const data = await res.json();

      if (res.status === 403 && data.error === 'mfa_required') {
        appendLog('🛡️ 2. Servidor respondió HTTP 403 Forbidden (error: "mfa_required").');
        appendLog('🎟️ 3. step_up_token temporal recibido. Abriendo desafío 2FA TOTP...');
        setStepUpToken(data.step_up_token || null);
        setErrorMessage('HTTP 403 Forbidden (mfa_required): Se requiere elevación Step-Up 2FA.');
        setShowMfaModal(true);
        return;
      }

      if (res.ok) {
        appendLog('✅ 2. Servidor respondió HTTP 200 OK (Sesión con mfa_verified: true).');
        setVaultData(data);
        onSessionUpdated(true);
      } else {
        setErrorMessage(`[HTTP ${res.status}] ${data.message || data.error}`);
      }
    } catch (err: any) {
      setErrorMessage(`Error de red: ${err?.message || 'No se pudo conectar al backend.'}`);
    } finally {
      setLoading(false);
    }
  };

  // Autocompletar el código TOTP calculándolo localmente desde la semilla guardada en SecureStore
  const handleAutoFillLocalTotp = async () => {
    try {
      const savedSeed = (await secureStorageService.getTotpSeed()) || CONFIG.TOTP.DEFAULT_SECRET_BASE32;
      const computedCode = generateTOTP(savedSeed);
      setTotpCode(computedCode);
    } catch {
      setErrorMessage('No se pudo calcular el TOTP local.');
    }
  };

  // 2. Enviar step_up_token + código TOTP de 6 dígitos a POST /auth/mfa/verify
  const handleVerifyTotp = async () => {
    const cleanCode = totpCode.trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      setErrorMessage('El código TOTP debe contener exactamente 6 dígitos numéricos.');
      return;
    }

    if (!stepUpToken) {
      setErrorMessage('No hay un step_up_token activo. Solicita el recurso nuevamente.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    appendLog(`🔐 4. Enviando POST /auth/mfa/verify con código TOTP: ${cleanCode}...`);

    try {
      const verifyRes = await fetch(`${CONFIG.API_BASE_URL}/auth/mfa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step_up_token: stepUpToken,
          code: cleanCode,
        }),
      });

      const verifyData = await verifyRes.json();

      if (verifyRes.status === 409) {
        appendLog(`🚨 [HTTP 409 Conflict] ${verifyData.message}`);
        setErrorMessage(verifyData.message || '409 Conflict: Replay Attack Detected.');
        setShowMfaModal(false);
        return;
      }

      if (!verifyRes.ok) {
        appendLog(`❌ [HTTP ${verifyRes.status}] ${verifyData.message || verifyData.error}`);
        setErrorMessage(verifyData.message || 'Código TOTP rechazado por el servidor.');
        return;
      }

      // Guardar el par (stepUpToken, code) recién usado para poder demostrar el Replay Attack (Escenario #5)
      setLastUsedChallenge({ stepUpToken, code: cleanCode });

      // Actualizar en RAM el nuevo elevated_token (vigencia de 10 minutos = 600s, claim mfa_verified: true)
      const elevatedToken = verifyData.elevated_token;
      const expiresIn = verifyData.expires_in || 600;
      tokenMemoryStore.setAccessToken(elevatedToken, expiresIn);
      onSessionUpdated(true);

      appendLog(
        `✅ 5. Código validado en ventana C${verifyData.window_offset >= 0 ? '+' : ''}${verifyData.window_offset} y registrado en Caché Anti-Replay (TTL 90s).`
      );
      appendLog(`🎟️ 6. elevated_token recibido (mfa_verified: true, expira en ${expiresIn}s).`);

      setShowMfaModal(false);
      setTotpCode('');

      // 3. Reintentar automáticamente GET /api/boveda-critica con el elevated_token
      appendLog('🔄 7. Reintentando GET /api/boveda-critica con elevated_token...');
      const vaultRes = await apiFetch('/api/boveda-critica');
      const vaultJson = await vaultRes.json();

      if (vaultRes.ok) {
        appendLog('🔓 8. ¡Acceso concedido a la Bóveda Crítica (HTTP 200 OK)!');
        setVaultData(vaultJson);
      } else {
        setErrorMessage(vaultJson.message || 'No se pudo abrir la bóveda tras elevar sesión.');
      }
    } catch (err: any) {
      setErrorMessage(`Error de red en verificación MFA: ${err?.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 3. Demostración en vivo del Escenario #5: Ataque de Repetición (Anti-Replay 409 Conflict)
  const handleSimulateReplayAttack = async () => {
    if (!lastUsedChallenge) return;

    setLoading(true);
    setErrorMessage(null);
    appendLog(
      `\n⚡ [PRUEBA ANTI-REPLAY] Reenviando el MISMO código TOTP (${lastUsedChallenge.code}) dentro de la ventana de 90s...`
    );

    try {
      const replayRes = await fetch(`${CONFIG.API_BASE_URL}/auth/mfa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step_up_token: lastUsedChallenge.stepUpToken,
          code: lastUsedChallenge.code,
        }),
      });

      const replayData = await replayRes.json();

      if (replayRes.status === 409) {
        appendLog(`🛡️ [HTTP 409 Conflict] ¡Ataque bloqueado!: ${replayData.message}`);
        setErrorMessage(`🛡️ Bloqueo Anti-Replay Exitoso (HTTP 409): ${replayData.message}`);
      } else {
        appendLog(`⚠️ Respuesta inesperada (${replayRes.status}): ${JSON.stringify(replayData)}`);
      }
    } catch (err: any) {
      setErrorMessage(`Error al simular Replay Attack: ${err?.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Volver a sesión estándar (mfa_verified: false) para repetir la prueba de Step-Up sin cerrar sesión
  const handleResetToStandardToken = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const refreshToken = await secureStorageService.getRefreshToken();
      if (!refreshToken) return;

      const res = await fetch(`${CONFIG.API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (res.ok) {
        const data = await res.json();
        tokenMemoryStore.setAccessToken(data.access_token, data.expires_in || 300);
        setVaultData(null);
        onSessionUpdated(false);
        setTraceLogs(['🔄 Sesión restaurada a access_token estándar (mfa_verified: false).']);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>← Volver al Panel</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Bóveda Crítica</Text>
      <Text style={styles.subtitle}>GET /api/boveda-critica • Step-Up 2FA & Anti-Replay</Text>

      {errorMessage && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {vaultData ? (
        <View style={styles.secretCard}>
          <View style={styles.badgeRow}>
            <Text style={styles.badge}>MFA_VERIFIED: TRUE (10 MIN)</Text>
            <Text style={styles.classificationBadge}>{vaultData.classification}</Text>
          </View>
          <Text style={styles.secretLabel}>Secreto Criptográfico Desbloqueado:</Text>
          <Text style={styles.secretValue}>{vaultData.secretData}</Text>
          <Text style={styles.secretMeta}>Autorizado a: {vaultData.authorizedUser}</Text>
          <Text style={styles.secretMeta}>Timestamp: {vaultData.accessedAt}</Text>

          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleResetToStandardToken}
            disabled={loading}
          >
            <Text style={styles.resetButtonText}>
              🔄 Volver a Token Estándar (mfa_verified: false)
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardDesc}>
            Este recurso exige un token elevado (`mfa_verified: true`). Si accedes con un
            `access_token` estándar, el backend responderá `403 Forbidden` y emitirá un
            `step_up_token` para iniciar la verificación TOTP.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleAccessVault}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Consultar Recurso Crítico</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Sección para demostrar el Escenario #5: Ataque de Repetición (409 Conflict) */}
      {lastUsedChallenge && (
        <View style={styles.replaySection}>
          <Text style={styles.replayTitle}>Prueba de Aceptación #5: Anti-Replay (TTL 90s)</Text>
          <Text style={styles.replayDesc}>
            Último código TOTP validado: <Text style={styles.mono}>{lastUsedChallenge.code}</Text>.
            Presiona el botón para reenviar ese mismo código a `POST /auth/mfa/verify` y comprobar
            el bloqueo `409 Conflict`.
          </Text>
          <TouchableOpacity
            style={styles.replayButton}
            onPress={handleSimulateReplayAttack}
            disabled={loading}
          >
            <Text style={styles.replayButtonText}>
              🚨 Reenviar Mismo Código ({lastUsedChallenge.code}) — Probar 409
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {traceLogs.length > 0 && (
        <View style={styles.logBox}>
          <Text style={styles.logHeader}>Traza de Auditoría Step-Up & Anti-Replay:</Text>
          {traceLogs.map((line, idx) => (
            <Text key={idx} style={styles.logLine}>
              {line}
            </Text>
          ))}
        </View>
      )}

      {/* Modal Step-Up Authentication */}
      <Modal visible={showMfaModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalBadge}>DESAFÍO STEP-UP • HTTP 403</Text>
            <Text style={styles.modalTitle}>Verificación Requerida (2FA)</Text>
            <Text style={styles.modalDesc}>
              Introduce el código de 6 dígitos de tu Autenticador TOTP (o Google Authenticator)
              para emitir un `elevated_token` válido por 10 minutos.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="000000"
              placeholderTextColor="#64748B"
              keyboardType="number-pad"
              maxLength={6}
              value={totpCode}
              onChangeText={setTotpCode}
            />

            <TouchableOpacity style={styles.autoFillButton} onPress={handleAutoFillLocalTotp}>
              <Text style={styles.autoFillButtonText}>
                ⚡ Autocompletar desde Motor TOTP Local
              </Text>
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowMfaModal(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.verifyButton}
                onPress={handleVerifyTotp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.verifyButtonText}>Verificar 2FA</Text>
                )}
              </TouchableOpacity>
            </View>
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
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 18,
    fontFamily: 'monospace',
  },
  card: {
    backgroundColor: '#1E293B',
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  cardDesc: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 18,
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
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
    lineHeight: 17,
    fontWeight: '600',
  },
  secretCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: '#22C55E',
    padding: 20,
    borderRadius: 14,
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    color: '#4ADE80',
    fontWeight: '800',
    fontSize: 11,
  },
  classificationBadge: {
    backgroundColor: '#22C55E',
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  secretLabel: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 6,
  },
  secretValue: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'monospace',
    marginBottom: 12,
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 8,
  },
  secretMeta: {
    color: '#94A3B8',
    fontSize: 11,
    marginBottom: 4,
  },
  resetButton: {
    marginTop: 12,
    backgroundColor: '#334155',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  replaySection: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F59E0B',
    marginBottom: 16,
  },
  replayTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FBBF24',
    marginBottom: 6,
  },
  replayDesc: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 17,
    marginBottom: 12,
  },
  mono: {
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#38BDF8',
  },
  replayButton: {
    backgroundColor: '#D97706',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  replayButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  logBox: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  logHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
    marginBottom: 8,
  },
  logLine: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: 'monospace',
    marginBottom: 4,
    lineHeight: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalBadge: {
    color: '#FBBF24',
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 16,
    lineHeight: 17,
  },
  input: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#38BDF8',
    borderRadius: 10,
    color: '#38BDF8',
    fontSize: 28,
    textAlign: 'center',
    letterSpacing: 8,
    paddingVertical: 12,
    marginBottom: 12,
    fontFamily: 'monospace',
  },
  autoFillButton: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  autoFillButtonText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#334155',
  },
  cancelButtonText: {
    color: '#CBD5E1',
    fontWeight: '600',
  },
  verifyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#2563EB',
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
