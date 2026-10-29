import { useState, type FormEvent } from 'react';
import { Navigate, useSearchParams } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { AuthService } from '@/sdk';
import { useAuth } from '@/shared/auth-context';
import { ErrorBox, Field } from '@/shared/ui';
import { AuthCard } from './AuthCard';

/** Only ever continue to a path inside this app. */
const safeNext = (next: string | null) => (next && next.startsWith('/') && !next.startsWith('//') ? next : '/');

export function LoginPage() {
  const { user, signedIn } = useAuth();
  const [params] = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const login = useMutation({
    mutationFn: () => AuthService.authControllerLogin({ requestBody: { username, password } }),
    onSuccess: signedIn,
  });

  if (user) return <Navigate to={safeNext(params.get('next'))} replace />;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    login.mutate();
  };

  return (
    <AuthCard title="Sign in">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Username">
          <input className="input" autoComplete="username" required autoFocus value={username} onChange={(e) => setUsername(e.target.value)} />
        </Field>
        <Field label="Password">
          <input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <ErrorBox error={login.error} />
        <button className="btn-primary w-full" disabled={login.isPending}>
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="text-xs text-slate-500">Forgot your password? Ask an admin to send you a reset link.</p>
      </form>
    </AuthCard>
  );
}
