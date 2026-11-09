/**
 * Servicio de Almacenamiento Seguro Nativo (Hardware Keychain / Keystore)
 * Cumple estrictamente con el Punto 2 del taller:
 * "refresh_token se persiste en el enclave seguro cifrado por hardware
 *  (iOS Keychain / Android Keystore vía expo-secure-store). Vida útil: 30 días."
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { CONFIG } from '../config';

const REFRESH_TOKEN_KEY = CONFIG.STORAGE_KEYS.REFRESH_TOKEN;

// Fallback en memoria para entorno Web si SecureStore no está disponible
let webFallbackRefreshToken: string | null = null;

export const secureStorageService = {
  /**
   * Guarda el refresh_token cifrado en el enclave de seguridad nativo.
   */
  async saveRefreshToken(token: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        webFallbackRefreshToken = token;
        return;
      }

      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      });
    } catch (error) {
      console.error('[SecureStore Error] No se pudo guardar el refresh_token:', error);
      throw error;
    }
  },

  /**
   * Recupera el refresh_token descifrándolo desde el hardware seguro.
   */
  async getRefreshToken(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return webFallbackRefreshToken;
      }

      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('[SecureStore Error] No se pudo recuperar el refresh_token:', error);
      return null;
    }
  },

  /**
   * Elimina el refresh_token del enclave seguro (Cierre de Sesión).
   */
  async deleteRefreshToken(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        webFallbackRefreshToken = null;
        return;
      }

      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('[SecureStore Error] No se pudo eliminar el refresh_token:', error);
    }
  },

  /**
   * Comprueba si el enclave de hardware seguro está disponible en el dispositivo.
   */
  async isHardwareSecurityAvailable(): Promise<boolean> {
    if (Platform.OS === 'web') {
      return false;
    }
    return await SecureStore.isAvailableAsync();
  },
};

