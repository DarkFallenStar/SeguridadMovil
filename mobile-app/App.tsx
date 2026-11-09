import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { ScreenName, UserSession } from './src/types';
import { LoginScreen } from './src/screens/LoginScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { VaultScreen } from './src/screens/VaultScreen';
import { TotpScreen } from './src/screens/TotpScreen';
import { tokenMemoryStore } from './src/services/tokenMemoryStore';
import { secureStorageService } from './src/services/secureStorageService';
import { setOnSessionExpiredListener } from './src/services/apiClient';
import { CONFIG } from './src/config';

// Cierra automáticamente las sesiones de autenticación web si se completaron por redirección
WebBrowser.maybeCompleteAuthSession();

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('LOGIN');
  const [session, setSession] = useState<UserSession>({
    userId: '',
    email: '',
    accessToken: null,
    accessTokenExpiresAt: null,
    hasRefreshToken: false,
    mfaVerified: false,
  });

  const handleLogout = useCallback(async () => {
    try {
      const refreshToken = await secureStorageService.getRefreshToken();
      if (refreshToken) {
        // Notificar al backend de la revocación del refresh token
        fetch(`${CONFIG.API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        }).catch(() => {});
      }
    } catch {
      // Ignorar errores de red en logout
    }

    // 1. Destruir access_token de la memoria RAM
    tokenMemoryStore.clear();

    // 2. Eliminar refresh_token del hardware cifrado (Keychain/Keystore)
    await secureStorageService.deleteRefreshToken();

    // 3. Resetear estado en la interfaz
    setSession({
      userId: '',
      email: '',
      accessToken: null,
      accessTokenExpiresAt: null,
      hasRefreshToken: false,
      mfaVerified: false,
    });
    setCurrentScreen('LOGIN');
  }, []);

  // Registrar el listener de expiración de sesión en el cliente HTTP interceptor
  useEffect(() => {
    setOnSessionExpiredListener(handleLogout);
    return () => setOnSessionExpiredListener(null);
  }, [handleLogout]);

  // Bootstrap al arrancar o recargar la app:
  // La memoria RAM está vacía (access_token = null), pero verificamos si existe un
  // refresh_token cifrado en el hardware (SecureStore) para restaurar la sesión silenciosamente.
  useEffect(() => {
    let isMounted = true;

    const bootstrapSessionFromSecureStore = async () => {
      try {
        const storedRefreshToken = await secureStorageService.getRefreshToken();
        if (!storedRefreshToken) {
          return;
        }

        console.log('[Bootstrap] 🔐 refresh_token encontrado en SecureStore. Ejecutando Silent Refresh inicial...');
        const response = await fetch(`${CONFIG.API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: storedRefreshToken }),
        });

        if (!response.ok) {
          console.warn('[Bootstrap] ⚠️ refresh_token expirado o inválido en el servidor. Limpiando SecureStore.');
          await secureStorageService.deleteRefreshToken();
          return;
        }

        const data = await response.json();
        const expiresIn = data.expires_in || 300;

        // Guardar el nuevo access_token exclusivamente en memoria RAM
        tokenMemoryStore.setAccessToken(data.access_token, expiresIn);

        if (isMounted) {
          setSession({
            userId: data.user?.id || 'user_unisabana_01',
            email: data.user?.email || 'estudiante@unisabana.edu.co',
            accessToken: data.access_token,
            accessTokenExpiresAt: Date.now() + expiresIn * 1000,
            hasRefreshToken: true,
            mfaVerified: false,
          });
          setCurrentScreen('DASHBOARD');
          console.log('[Bootstrap] ✅ Sesión restaurada silenciosamente en RAM desde SecureStore.');
        }
      } catch (err) {
        console.warn('[Bootstrap] Error al intentar restaurar sesión al inicio:', err);
      }
    };

    bootstrapSessionFromSecureStore();

    return () => {
      isMounted = false;
    };
  }, []);

  // Actualizar el estado de sesión visible cuando el access_token se renueva en RAM
  const syncSessionFromMemory = useCallback(async () => {
    const currentRamToken = tokenMemoryStore.getAccessToken();
    const expiresAt = tokenMemoryStore.getExpiresAt();
    const hasRefresh = !!(await secureStorageService.getRefreshToken());

    setSession((prev) => ({
      ...prev,
      accessToken: currentRamToken,
      accessTokenExpiresAt: expiresAt,
      hasRefreshToken: hasRefresh,
    }));
  }, []);

  const handleLoginSuccess = async (sessionData: {
    accessToken: string;
    refreshToken: string;
    user: { id: string; email: string; name: string };
  }) => {
    // 1. Guardar access_token ÚNICAMENTE en memoria volátil (RAM)
    tokenMemoryStore.setAccessToken(sessionData.accessToken, 300); // 5 min

    // 2. Guardar refresh_token en el enclave seguro cifrado (Keychain/Keystore)
    await secureStorageService.saveRefreshToken(sessionData.refreshToken);

    // 3. Actualizar estado de React
    setSession({
      userId: sessionData.user.id,
      email: sessionData.user.email,
      accessToken: sessionData.accessToken,
      accessTokenExpiresAt: Date.now() + 300 * 1000,
      hasRefreshToken: true,
      mfaVerified: false,
    });

    setCurrentScreen('DASHBOARD');
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
          onSessionUpdated={syncSessionFromMemory}
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
