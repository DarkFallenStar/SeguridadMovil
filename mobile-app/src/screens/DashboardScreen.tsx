import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { UserSession } from '../types';

interface DashboardScreenProps {
  session: UserSession;
  onNavigateVault: () => void;
  onNavigateTotp: () => void;
  onLogout: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  session,
  onNavigateVault,
  onNavigateTotp,
  onLogout,
}) => {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Panel de Seguridad</Text>
        <Text style={styles.userEmail}>{session.email}</Text>
      </View>

      <View style={styles.statusCard}>
        <Text style={styles.cardTitle}>Estado de Sesión & Memoria</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Access Token (RAM):</Text>
          <Text style={[styles.statusValue, session.accessToken ? styles.statusActive : styles.statusInactive]}>
            {session.accessToken ? 'En Memoria (5 min)' : 'Ausente'}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Refresh Token (SecureStore):</Text>
          <Text style={[styles.statusValue, session.hasRefreshToken ? styles.statusActive : styles.statusInactive]}>
            {session.hasRefreshToken ? 'Cifrado en Keystore (30 d)' : 'No configurado'}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>MFA Elevado:</Text>
          <Text style={[styles.statusValue, session.mfaVerified ? styles.statusActive : styles.statusWarning]}>
            {session.mfaVerified ? 'Verificado (Bóveda abierta)' : 'Requerido para Bóveda'}
          </Text>
        </View>
      </View>

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
        <Text style={styles.logoutText}>Cerrar Sesión Seguro</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#0F172A',
    justifyContent: 'space-between',
  },
  header: {
    marginTop: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  userEmail: {
    fontSize: 14,
    color: '#38BDF8',
    marginTop: 4,
  },
  statusCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F1F5F9',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  statusLabel: {
    fontSize: 13,
    color: '#94A3B8',
  },
  statusValue: {
    fontSize: 13,
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
  actionsContainer: {
    gap: 14,
    marginBottom: 24,
  },
  actionButton: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    gap: 14,
  },
  actionIcon: {
    fontSize: 28,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  actionDesc: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  logoutText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});

