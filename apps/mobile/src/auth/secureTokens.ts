import * as SecureStore from "expo-secure-store";

const REFRESH_TOKEN_KEY = "qyou_refresh_token";
const ACCESS_TOKEN_KEY = "qyou_access_token";
const DEVICE_ID_KEY = "qyou_device_id";

export type SessionTokens = {
  refreshToken: string;
  accessToken: string;
  deviceId?: string;
};

const secureStoreWrite = async (key: string, value: string) => {
  await SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
};

export const saveSessionTokens = async (tokens: SessionTokens) => {
  await Promise.all([
    secureStoreWrite(REFRESH_TOKEN_KEY, tokens.refreshToken),
    secureStoreWrite(ACCESS_TOKEN_KEY, tokens.accessToken),
    tokens.deviceId ? secureStoreWrite(DEVICE_ID_KEY, tokens.deviceId) : SecureStore.deleteItemAsync(DEVICE_ID_KEY),
  ]);
};

export const getStoredSessionTokens = async () => {
  const [refreshToken, accessToken, deviceId] = await Promise.all([
    SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(DEVICE_ID_KEY),
  ]);

  return {
    refreshToken,
    accessToken,
    deviceId,
  };
};

export const clearStoredSessionTokens = async () => {
  await Promise.all([
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(DEVICE_ID_KEY),
  ]);
};
