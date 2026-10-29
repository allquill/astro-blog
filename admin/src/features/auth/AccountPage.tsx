import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AuthService } from '@/sdk';
import { ErrorBox, Field, Notice, PageHeader } from '@/shared/ui';

export function AccountPage() {
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [mismatch, setMismatch] = useState(false);
  const change = useMutation({
    mutationFn: () => AuthService.authControllerChangePassword({ requestBody: { current, password } }),
    onSuccess: () => {
      setCurrent('');
      setPassword('');
      setConfirm('');
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setMismatch(password !== confirm);
    if (password === confirm) change.mutate();
  };

  return (
    <>
      <PageHeader title="Change password" subtitle="Changing it signs you out everywhere else." />
      <form onSubmit={submit} className="card max-w-md space-y-4 p-5">
        <Field label="Current password">
          <input className="input" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
        <Field label="New password" hint="At least 12 characters.">
          <input className="input" type="password" autoComplete="new-password" minLength={12} required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Field label="Repeat the new password" error={mismatch ? "The passwords don't match." : undefined}>
          <input className="input" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        <ErrorBox error={change.error} />
        {change.isSuccess && <Notice tone="success">Password changed. Other sessions have been signed out.</Notice>}
        <button className="btn-primary" disabled={change.isPending}>Change password</button>
      </form>
    </>
  );
}
