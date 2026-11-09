import React, { useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ScreenName, UserSession } from './src/types';
import { LoginScreen } from './src/screens/LoginScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { VaultScreen } from './src/screens/VaultScreen';
import { TotpScreen } from './src/screens/TotpScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('LOGIN');
  const [session, setSession] = useState<UserSession>({
    userId: 'user_123',
    email: 'estudiante@unisabana.edu.co',
    accessToken: null,
    accessTokenExpiresAt: null,
    hasRefreshToken: false,
    mfaVerified: false,
  });

  const handleLoginSuccess = () => {
    // Simulación de sesión inicial para la estructura base de Fase 1
    setSession({
      userId: 'user_123',
      email: 'estudiante@unisabana.edu.co',
      accessToken: 'sample_in_memory_access_token_jwt',
      accessTokenExpiresAt: Date.now() + 5 * 60 * 1000, // 5 min
      hasRefreshToken: true,
      mfaVerified: false,
    });
    setCurrentScreen('DASHBOARD');
  };

  const handleLogout = () => {
    setSession({
      userId: '',
      email: '',
      accessToken: null,
      accessTokenExpiresAt: null,
      hasRefreshToken: false,
      mfaVerified: false,
    });
    setCurrentScreen('LOGIN');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      {currentScreen === 'LOGIN' && (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      )}
      {currentScreen === 'DASHBOARD' && (
        <DashboardScreen
          session={session}
          onNavigateVault={() => setCurrentScreen('VAULT')}
          onNavigateTotp={() => setCurrentScreen('TOTP')}
          onLogout={handleLogout}
        />
      )}
      {currentScreen === 'VAULT' && (
        <VaultScreen onBack={() => setCurrentScreen('DASHBOARD')} />
      )}
      {currentScreen === 'TOTP' && (
        <TotpScreen onBack={() => setCurrentScreen('DASHBOARD')} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
});
