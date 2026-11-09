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

  const handleLoginSuccess = (sessionData: {
    accessToken: string;
    refreshToken: string;
    user: { id: string; email: string; name: string };
  }) => {
    // Almacenamiento volátil del access_token en memoria (RAM)
    setSession({
      userId: sessionData.user.id,
      email: sessionData.user.email,
      accessToken: sessionData.accessToken,
      accessTokenExpiresAt: Date.now() + 5 * 60 * 1000, // 5 minutos exactos (300 segundos)
      hasRefreshToken: !!sessionData.refreshToken,
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
