/**
 * Variables de configuracion del cliente movil
 */

import { Platform } from 'react-native';

// En emulador Android, 10.0.2.2 mapea al localhost de la máquina host.
// En emulador iOS o Web, localhost funciona directamente.
const DEFAULT_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

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
};
