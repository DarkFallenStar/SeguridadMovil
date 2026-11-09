import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, TextInput } from 'react-native';
import { VaultRecord } from '../types';

interface VaultScreenProps {
  onBack: () => void;
}

export const VaultScreen: React.FC<VaultScreenProps> = ({ onBack }) => {
  const [vaultData, setVaultData] = useState<VaultRecord | null>(null);
  const [showMfaModal, setShowMfaModal] = useState<boolean>(false);
  const [totpCode, setTotpCode] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAccessVault = () => {
    // En Fase 1 mostramos el comportamiento base: si no está elevado, requiere Step-Up
    if (!vaultData) {
      setErrorMessage('HTTP 403 Forbidden: mfa_required. Se requiere Step-Up 2FA.');
      setShowMfaModal(true);
    }
  };

  const handleVerifyTotp = () => {
    if (totpCode.trim().length === 6) {
      // Simulación de elevación para la estructura base de Fase 1
      setVaultData({
        secretData: 'CLAVE_MAESTRA_BOVEDA_2026_TOP_SECRET',
        classification: 'TOP_SECRET',
        accessedAt: new Date().toISOString(),
        authorizedUser: 'estudiante@unisabana.edu.co',
      });
      setShowMfaModal(false);
      setErrorMessage(null);
      setTotpCode('');
    } else {
      setErrorMessage('El código debe tener exactamente 6 dígitos.');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>← Volver al Panel</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Bóveda Crítica</Text>
      <Text style={styles.subtitle}>GET /api/boveda-critica</Text>

      {errorMessage && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
        </View>
      )}

      {vaultData ? (
        <View style={styles.secretCard}>
          <Text style={styles.badge}>MFA_VERIFIED: TRUE</Text>
          <Text style={styles.secretLabel}>Dato Crítico Desencriptado:</Text>
          <Text style={styles.secretValue}>{vaultData.secretData}</Text>
          <Text style={styles.secretMeta}>Clasificación: {vaultData.classification}</Text>
          <Text style={styles.secretMeta}>Acceso: {vaultData.accessedAt}</Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardDesc}>
            Este endpoint requiere una sesión con privilegios elevados (`mfa_verified: true`).
            Si se accede con un token estándar, el servidor responderá con 403 Forbidden y un step_up_token.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={handleAccessVault}>
            <Text style={styles.primaryButtonText}>Consultar Recurso Crítico</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal Step-Up Authentication */}
      <Modal visible={showMfaModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Verificación Requerida (2FA)</Text>
            <Text style={styles.modalDesc}>
              Introduce el código de 6 dígitos generado por tu Autenticador TOTP para elevar privilegios.
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

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowMfaModal(false);
                  setErrorMessage(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.verifyButton} onPress={handleVerifyTotp}>
                <Text style={styles.verifyButtonText}>Verificar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    fontFamily: 'monospace',
  },
  card: {
    backgroundColor: '#1E293B',
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardDesc: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
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
    fontSize: 13,
  },
  secretCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: '#22C55E',
    padding: 20,
    borderRadius: 14,
  },
  badge: {
    color: '#22C55E',
    fontWeight: '800',
    fontSize: 12,
    marginBottom: 10,
  },
  secretLabel: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 6,
  },
  secretValue: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  secretMeta: {
    color: '#64748B',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
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
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 20,
    lineHeight: 18,
  },
  input: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    color: '#38BDF8',
    fontSize: 28,
    textAlign: 'center',
    letterSpacing: 8,
    paddingVertical: 12,
    marginBottom: 20,
    fontFamily: 'monospace',
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
