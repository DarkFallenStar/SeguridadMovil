/**
 * Variables de configuracion del cliente movil
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Detección automática y dinámica de la IP de la máquina host:
// 1. Constants.expoConfig?.hostUri extrae la IP exacta del PC con el que Expo Go se comunicó (ej: 192.168.40.12).
// 2. Si es en dispositivo físico, la IP de tu Wi-Fi es 192.168.40.12 (10.0.2.2 solo funciona dentro del emulador Android Studio).
const metroHost = Constants.expoConfig?.hostUri?.split(':')[0];
const DETECTED_LAN_IP = '192.168.40.12';

const DEFAULT_HOST =
  Platform.OS === 'web'
    ? 'localhost'
    : metroHost || DETECTED_LAN_IP;

export const CONFIG = {
  API_BASE_URL: `http://${DEFAULT_HOST}:3000`,
  OAUTH: {
    AUTHORIZE_ENDPOINT: `http://${DEFAULT_HOST}:3000/oauth/authorize`,
    TOKEN_ENDPOINT: `http://${DEFAULT_HOST}:3000/oauth/token`,
    REDIRECT_URI: 'unisabana-auth://callback',
    CLIENT_ID: 'unisabana-mobile-client',
    RESPONSE_TYPE: 'code',
    CODE_CHALLENGE_METHOD: 'S256',
  },
  STORAGE_KEYS: {
    REFRESH_TOKEN: 'unisabana_secure_refresh_token',
    TOTP_SEED: 'unisabana_secure_totp_seed',
  },
  TOTP: {
    DEFAULT_SECRET_BASE32: 'JBSWY3DPEHPK3PXP',
  },
};
