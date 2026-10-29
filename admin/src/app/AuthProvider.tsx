import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError, AuthService, type MeDto } from '@/sdk';
import { queryClient, setUnauthorizedHandler } from '@/shared/api';
import { AuthContext, type AuthState } from '@/shared/auth-context';
import { Spinner } from '@/shared/ui';

/**
 * Who is signed in. Asks /api/auth/me once on load; any 401 later (expired token, disabled user)
 * clears the user, which sends the router back to /login.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    AuthService.authControllerMe()
      .then((me) => live && setUser(me))
      .catch((e: unknown) => {
        if (!(e instanceof ApiError && e.status === 401)) console.error(e);
      })
      .finally(() => live && setLoading(false));
    setUnauthorizedHandler(() => {
      setUser(null);
      queryClient.clear();
    });
    return () => {
      live = false;
    };
  }, []);

  const signOut = useCallback(async () => {
    try {
      await AuthService.authControllerLogout();
    } finally {
      setUser(null);
      queryClient.clear();
    }
  }, []);

  const value = useMemo<AuthState>(() => ({ user, isAdmin: user?.role === 'admin', signedIn: setUser, signOut }), [user, signOut]);

  if (loading) return <Spinner label="Starting…" />;
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
