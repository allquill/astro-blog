import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AuthService } from '@/sdk';
import { useAuth } from '@/shared/auth-context';
import { ErrorBox, Field, Spinner } from '@/shared/ui';
import { AuthCard } from './AuthCard';

/** Invite / password-reset link from an e-mail: /invite?token=… */
export function InvitePage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const { signedIn } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [mismatch, setMismatch] = useState(false);

  const info = useQuery({
    queryKey: ['invite', token],
    queryFn: () => AuthService.authControllerInviteInfo({ token }),
    enabled: Boolean(token),
    retry: false,
  });
  const accept = useMutation({
    mutationFn: () => AuthService.authControllerAcceptInvite({ requestBody: { token, password } }),
    onSuccess: (me) => {
      signedIn(me);
      navigate('/', { replace: true });
    },
  });

  if (!token || info.isError) {
    return (
      <AuthCard title="Link expired">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          This link has expired or was already used. Ask an admin to send you a new one.
        </p>
        <Link to="/login" className="btn-secondary mt-4 w-full">Go to sign in</Link>
      </AuthCard>
    );
  }
  if (!info.data) return <Spinner />;

  const min = info.data.minLength;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setMismatch(password !== confirm);
    if (password === confirm) accept.mutate();
  };

  return (
    <AuthCard title={info.data.reset ? 'Choose a new password' : 'Set your password'}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Username: <strong>{info.data.username}</strong>
        </p>
        <Field label="New password" hint={`At least ${min} characters.`}>
          <input className="input" type="password" autoComplete="new-password" minLength={min} required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Field label="Repeat it" error={mismatch ? "The passwords don't match." : undefined}>
          <input className="input" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        <ErrorBox error={accept.error} />
        <button className="btn-primary w-full" disabled={accept.isPending}>Save and sign in</button>
      </form>
    </AuthCard>
  );
}
