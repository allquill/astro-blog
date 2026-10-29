import { createContext, useContext } from 'react';
import type { MeDto } from '@/sdk';

export type AuthState = {
  user: MeDto | null;
  isAdmin: boolean;
  signedIn: (me: MeDto) => void;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside <AuthProvider>');
  return ctx;
}
