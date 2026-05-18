import { createContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { authService } from '../services/auth.service';
import type { AuthSession } from '../types/auth';

type AuthContextValue = {
  session: AuthSession;
  loading: boolean;
  refreshSession: () => Promise<void>;
  clearSession: () => void;
};

const defaultSession: AuthSession = {
  authenticated: false,
  user: null,
};

export const AuthContext = createContext<AuthContextValue>({
  session: defaultSession,
  loading: false,
  refreshSession: async () => undefined,
  clearSession: () => undefined,
});

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession>(defaultSession);
  const [loading, setLoading] = useState(true);

  const refreshSession = async () => {
    try {
      const response = await authService.getSession();
      if (response.success && response.data?.user) {
        setSession({ authenticated: true, user: response.data.user });
      } else {
        setSession(defaultSession);
      }
    } catch {
      setSession(defaultSession);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSession();
  }, []);

  const clearSession = () => {
    setSession(defaultSession);
    setLoading(false);
  };

  const value = useMemo(() => ({ session, loading, refreshSession, clearSession }), [session, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
