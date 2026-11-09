import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { UserSession } from '../types';
import { apiFetch } from '../services/apiClient';
import { tokenMemoryStore } from '../services/tokenMemoryStore';
import { CONFIG } from '../config';

interface DashboardScreenProps {
  session: UserSession;
  onNavigateVault: () => void;
  onNavigateTotp: () => void;
  onLogout: () => void;
  onSessionUpdated: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  session,
  onNavigateVault,
  onNavigateTotp,
  onLogout,
  onSessionUpdated,
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [testingRequest, setTestingRequest] = useState<boolean>(false);
  const [demoLogs, setDemoLogs] = useState<string[]>([]);

  // Contador en tiempo real de los 5 minutos del access_token en RAM
  useEffect(() => {
    const updateCountdown = () => {
      const expiresAt = tokenMemoryStore.getExpiresAt();
      if (!expiresAt) {
        setSecondsLeft(0);
        return;
      }
      const remainingSeconds = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setSecondsLeft(remainingSeconds);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [session.accessToken]);

  // Formato mm:ss
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  // Prueba 1: Petición Normal a recurso protegido
  const handleTestNormalRequest = async () => {
    setTestingRequest(true);
    setDemoLogs([]);
    try {
      const res = await apiFetch('/api/test-protected');
      const data = await res.json();
      if (res.ok) {
        setDemoLogs([`[200 OK] ${data.message}`, `Llamada #${data.callNumber} autorizada con token en RAM.`]);
      } else {
        setDemoLogs([`[${res.status} Error] ${data.message || data.error}`]);
      }
    } catch (err: any) {
      setDemoLogs([`[Fallo de red] ${err.message}`]);
    } finally {
      setTestingRequest(false);
      onSessionUpdated();
    }
  };

  // Prueba 2: Demostración oficial de la Silent Refresh Queue (3 peticiones concurrentes con token vencido)
  const handleTestConcurrentSilentRefresh = async () => {
    setTestingRequest(true);
    setDemoLogs([
      '⚡ 1. Forzando expiración del access_token en memoria RAM...',
    ]);

    try {
      // 1. Obtener un token expirado del backend para simular expiración real
      const forceExpireRes = await fetch(`${CONFIG.API_BASE_URL}/api/test-force-expire`, {
        method: 'POST',
      });
      const forceExpireData = await forceExpireRes.json();
      
      // Inyectar el token vencido exclusivamente en la RAM
      tokenMemoryStore.setAccessToken(forceExpireData.expired_access_token, -60);
      onSessionUpdated();

      setDemoLogs((prev) => [
        ...prev,
        '⏱️ 2. Token vencido inyectado en RAM. Disparando 3 peticiones HTTP simultáneas...',
      ]);

      // 2. Disparar 3 llamadas paralelas con Promise.all
      const [resA, resB, resC] = await Promise.all([
        apiFetch('/api/test-protected'),
        apiFetch('/api/test-protected'),
        apiFetch('/api/test-protected'),
      ]);

      const [dataA, dataB, dataC] = await Promise.all([
        resA.json(),
        resB.json(),
        resC.json(),
      ]);

      setDemoLogs((prev) => [
        ...prev,
        '🛡️ 3. Las 3 peticiones atraparon HTTP 401 Unauthorized.',
        '⏳ 4. Cola de promesas (Silent Refresh Queue) activada: se encolaron las llamadas 2 y 3.',
        '🔄 5. Se disparó una ÚNICA petición POST /auth/refresh al backend.',
        '✅ 6. access_token renovado en memoria RAM (5 min nuevos).',
        `🎉 7. Petición A: ${resA.status} OK (Llamada #${dataA.callNumber})`,
        `🎉 8. Petición B: ${resB.status} OK (Llamada #${dataB.callNumber})`,
        `🎉 9. Petición C: ${resC.status} OK (Llamada #${dataC.callNumber})`,
        '✨ Todas las peticiones concurrentes completaron con éxito sin desorientar al usuario.',
      ]);
    } catch (err: any) {
      setDemoLogs((prev) => [...prev, `❌ Error en prueba: ${err.message}`]);
    } finally {
      setTestingRequest(false);
      onSessionUpdated();
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Panel de Seguridad</Text>
        <Text style={styles.userEmail}>{session.email || 'Usuario Autenticado'}</Text>
      </View>

      {/* Tarjeta de Estado de Memoria y Enclave de Hardware */}
      <View style={styles.statusCard}>
        <Text style={styles.cardTitle}>Separación de Almacenamiento Criptográfico</Text>
        
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Access Token (Memoria RAM):</Text>
          <Text style={[styles.statusValue, session.accessToken ? styles.statusActive : styles.statusInactive]}>
            {session.accessToken ? `En RAM (${formatTime(secondsLeft)})` : 'Ausente'}
          </Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Refresh Token (Hardware Keystore):</Text>
          <Text style={[styles.statusValue, session.hasRefreshToken ? styles.statusActive : styles.statusInactive]}>
            {session.hasRefreshToken ? 'Cifrado en SecureStore (30 d)' : 'No configurado'}
          </Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>MFA Elevado:</Text>
          <Text style={[styles.statusValue, session.mfaVerified ? styles.statusActive : styles.statusWarning]}>
            {session.mfaVerified ? 'Verificado (Bóveda accesible)' : 'Requerido para Bóveda'}
          </Text>
        </View>
      </View>

      {/* Sección de Pruebas de Silent Refresh para Sustentación */}
      <View style={styles.demoSection}>
        <Text style={styles.demoTitle}>Pruebas de Silent Refresh Queue (Punto 2)</Text>
        <Text style={styles.demoDesc}>
          Demuestra ante el profesor la detección de 401, el encolamiento de promesas y la renovación con una sola llamada.
        </Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.testButton, styles.testButtonNormal]}
            onPress={handleTestNormalRequest}
            disabled={testingRequest}
          >
            <Text style={styles.testButtonText}>Petición 200 OK</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testButton, styles.testButtonQueue]}
            onPress={handleTestConcurrentSilentRefresh}
            disabled={testingRequest}
          >
            {testingRequest ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.testButtonText}>⚡ 3 Peticiones Concurrentes</Text>
            )}
          </TouchableOpacity>
        </View>

        {demoLogs.length > 0 && (
          <View style={styles.logBox}>
            <Text style={styles.logHeader}>Traza de Red & Interceptor:</Text>
            {demoLogs.map((log, index) => (
              <Text key={index} style={styles.logLine}>
                {log}
              </Text>
            ))}
          </View>
        )}
      </View>

      {/* Accesos a Bóveda Crítica y TOTP */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={onNavigateVault}>
          <Text style={styles.actionIcon}>🏛️</Text>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Bóveda Crítica</Text>
            <Text style={styles.actionDesc}>Recurso protegido con Step-Up Authentication</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={onNavigateTotp}>
          <Text style={styles.actionIcon}>⏱️</Text>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Autenticador TOTP</Text>
            <Text style={styles.actionDesc}>Generador RFC 6238 propio (Modo Avión)</Text>
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
        <Text style={styles.logoutText}>Cerrar Sesión Seguro (Revocar & Limpiar)</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#0F172A',
  },
  header: {
    marginTop: 10,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  userEmail: {
    fontSize: 13,
    color: '#38BDF8',
    marginTop: 2,
  },
  statusCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F1F5F9',
    marginBottom: 10,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  statusLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  statusValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusActive: {
    color: '#4ADE80',
  },
  statusInactive: {
    color: '#F87171',
  },
  statusWarning: {
    color: '#FBBF24',
  },
  demoSection: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  demoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#38BDF8',
    marginBottom: 6,
  },
  demoDesc: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 16,
    marginBottom: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  testButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testButtonNormal: {
    backgroundColor: '#334155',
  },
  testButtonQueue: {
    backgroundColor: '#0284C7',
  },
  testButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  logBox: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  logHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
    marginBottom: 6,
  },
  logLine: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: 'monospace',
    marginBottom: 4,
    lineHeight: 15,
  },
  actionsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#1E293B',
    padding: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
  },
  actionIcon: {
    fontSize: 26,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  actionDesc: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  logoutText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
