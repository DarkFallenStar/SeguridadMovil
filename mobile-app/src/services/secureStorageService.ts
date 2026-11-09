/**
 * Servicio de Almacenamiento Seguro Nativo (Hardware Keychain / Keystore)
 * Custodia en el enclave de hardware tanto el refresh_token (Punto 2)
 * como la semilla secreta TOTP (Punto 3 / Fase 5), garantizando operación en Modo Avión.
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { CONFIG } from '../config';

const REFRESH_TOKEN_KEY = CONFIG.STORAGE_KEYS.REFRESH_TOKEN;
const TOTP_SEED_KEY = CONFIG.STORAGE_KEYS.TOTP_SEED;

// Fallback en memoria exclusivamente para entorno Web donde SecureStore nativo no existe
const webMemoryFallback = new Map<string, string>();

async function setSecureItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    webMemoryFallback.set(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  });
}

async function getSecureItem(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return webMemoryFallback.get(key) ?? null;
    }
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.error(`[SecureStore Error] No se pudo leer ${key}:`, error);
    return null;
  }
}

async function deleteSecureItem(key: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      webMemoryFallback.delete(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.error(`[SecureStore Error] No se pudo eliminar ${key}:`, error);
  }
}

export const secureStorageService = {
  saveRefreshToken(token: string): Promise<void> {
    return setSecureItem(REFRESH_TOKEN_KEY, token);
  },

  getRefreshToken(): Promise<string | null> {
    return getSecureItem(REFRESH_TOKEN_KEY);
  },

  deleteRefreshToken(): Promise<void> {
    return deleteSecureItem(REFRESH_TOKEN_KEY);
  },

  saveTotpSeed(seedOrUri: string): Promise<void> {
    return setSecureItem(TOTP_SEED_KEY, seedOrUri);
  },

  getTotpSeed(): Promise<string | null> {
    return getSecureItem(TOTP_SEED_KEY);
  },

  deleteTotpSeed(): Promise<void> {
    return deleteSecureItem(TOTP_SEED_KEY);
  },

  async isHardwareSecurityAvailable(): Promise<boolean> {
    if (Platform.OS === 'web') {
      return false;
    }
    return await SecureStore.isAvailableAsync();
  },
};
