import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

import {
  api,
  getRefreshToken,
  Session,
  setSession,
  setSessionRenewedHandler,
  setUnauthorizedHandler,
  User,
} from './api';
import { readSession, writeSession } from './storage';

type AuthState = {
  ready: boolean;
  user: User | null;
  signIn: (email: string, password: string, create: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const signOut = useCallback(async () => {
    // Ferme la session cote serveur ; sans reseau, on se deconnecte quand meme.
    const refresh_token = getRefreshToken();
    if (refresh_token) {
      api('/auth/logout', { method: 'POST', body: { refresh_token } }).catch(() => {});
    }
    setSession(null);
    await writeSession(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    setUser(await api<User>('/account/me'));
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setSession(null);
      writeSession(null);
      setUser(null);
    });
    setSessionRenewedHandler((session) => {
      writeSession(session);
    });
    (async () => {
      const session = await readSession();
      if (session) {
        setSession(session);
        try {
          await refreshUser();
        } catch {
          await signOut();
        }
      }
      setReady(true);
    })();
  }, [refreshUser, signOut]);

  const signIn = useCallback(async (email: string, password: string, create: boolean) => {
    const { user, ...session } = await api<Session & { user: User }>(
      create ? '/auth/register' : '/auth/login',
      { method: 'POST', body: { email, password } }
    );
    setSession(session);
    await writeSession(session);
    setUser(user);
  }, []);

  return (
    <AuthContext.Provider value={{ ready, user, signIn, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth hors de AuthProvider');
  return value;
}
