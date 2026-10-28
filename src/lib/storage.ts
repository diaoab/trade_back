import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { Session } from './api';

// Jetons de session : trousseau du telephone sur iOS/Android, localStorage
// sur le web (SecureStore n'existe pas dans le navigateur).
const KEYS = { token: 'auth_token', refresh_token: 'refresh_token' } as const;

async function read(key: string) {
  if (Platform.OS === 'web') {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

async function write(key: string, value: string | null) {
  if (Platform.OS === 'web') {
    try {
      if (value) globalThis.localStorage?.setItem(key, value);
      else globalThis.localStorage?.removeItem(key);
    } catch {}
    return;
  }
  if (value) await SecureStore.setItemAsync(key, value);
  else await SecureStore.deleteItemAsync(key);
}

export async function readSession(): Promise<Session | null> {
  const [token, refresh_token] = await Promise.all([read(KEYS.token), read(KEYS.refresh_token)]);
  return token && refresh_token ? { token, refresh_token } : null;
}

export async function writeSession(session: Session | null) {
  await Promise.all([
    write(KEYS.token, session?.token ?? null),
    write(KEYS.refresh_token, session?.refresh_token ?? null),
  ]);
}
