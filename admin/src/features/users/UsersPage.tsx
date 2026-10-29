import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link2, Plus, Trash2 } from 'lucide-react';
import { UsersService, type InviteUserDto, type UserDto, type UserLinkDto } from '@/sdk';
import { fieldErrors } from '@/shared/api';
import { useAuth } from '@/shared/auth-context';
import { ago, fmtDateTime } from '@/shared/format';
import { Badge, CopyButton, ErrorBox, Field, Modal, Notice, PageHeader, Spinner, type Tone } from '@/shared/ui';

const STATUS_TONE: Record<UserDto['status'], Tone> = { active: 'emerald', invited: 'sky', 'invite expired': 'amber', disabled: 'slate' };

function LinkResult({ result, onDone }: { result: UserLinkDto; onDone: () => void }) {
  return (
    <div className="space-y-4">
      {result.mailError ? (
        <Notice tone="warning">The e-mail could not be sent ({result.mailError}). Copy the link below and send it yourself.</Notice>
      ) : (
        <Notice tone="success">
          E-mailed to <strong>{result.user.email}</strong>. You can also copy the link:
        </Notice>
      )}
      <div className="flex gap-2">
        <input className="input font-mono text-xs" readOnly value={result.link} onFocus={(e) => e.target.select()} />
        <CopyButton text={result.link} />
      </div>
      <p className="text-xs text-slate-500">The link works once and expires {fmtDateTime(result.user.inviteExpiresAt)}.</p>
      <div className="flex justify-end">
        <button type="button" className="btn-primary" onClick={onDone}>Done</button>
      </div>
    </div>
  );
}

function InviteForm({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState<InviteUserDto>({ username: '', email: '', role: 'staff' });
  const invite = useMutation({
    mutationFn: () => UsersService.usersControllerInvite({ requestBody: f }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['users'] }),
  });
  if (invite.data) return <LinkResult result={invite.data} onDone={onDone} />;
  const errs = fieldErrors(invite.error);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    invite.mutate();
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Username" hint="3–60 letters, digits, dots, dashes or underscores." error={errs.username}>
        <input className="input" required value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} />
      </Field>
      <Field label="E-mail" error={errs.email}><input className="input" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
      <Field label="Role" hint="Staff handle subscribers, feedback and new-post e-mails; admins also send e-mails, import subscribers and manage users and settings.">
        <select className="input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as InviteUserDto['role'] })}>
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
        </select>
      </Field>
      <ErrorBox error={invite.error} />
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onDone}>Cancel</button>
        <button className="btn-primary" disabled={invite.isPending}>Send invite</button>
      </div>
    </form>
  );
}

export function UsersPage() {
  const { isAdmin, user: me } = useAuth();
  const qc = useQueryClient();
  const [inviting, setInviting] = useState(false);
  const [linkResult, setLinkResult] = useState<UserLinkDto | null>(null);
  const users = useQuery({ queryKey: ['users'], queryFn: () => UsersService.usersControllerList(), enabled: isAdmin });
  const refresh = () => void qc.invalidateQueries({ queryKey: ['users'] });
  const update = useMutation({
    mutationFn: ({ id, body }: { id: number; body: { role?: UserDto['role']; disabled?: boolean } }) => UsersService.usersControllerUpdate({ id, requestBody: body }),
    onSuccess: refresh,
  });
  const link = useMutation({ mutationFn: (id: number) => UsersService.usersControllerLink({ id }), onSuccess: (r) => { setLinkResult(r); refresh(); } });
  const remove = useMutation({ mutationFn: (id: number) => UsersService.usersControllerRemove({ id }), onSuccess: refresh });

  if (!isAdmin) {
    return (
      <>
        <PageHeader title="Users" />
        <Notice>Only admins can manage users.</Notice>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="People who can sign in to this admin. New users get an e-mail link to set their password."
        actions={<button type="button" className="btn-primary" onClick={() => setInviting(true)}><Plus className="size-4" /> Invite user</button>}
      />
      <ErrorBox error={users.error || update.error || link.error || remove.error} className="mb-4" />
      {users.isLoading && <Spinner />}
      {users.data && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[44rem]">
            <thead className="border-b border-slate-200 dark:border-white/10">
              <tr><th className="th">User</th><th className="th">Role</th><th className="th">Status</th><th className="th">Last sign-in</th><th className="th" /></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {users.data.map((u) => {
                const self = u.id === me?.id;
                return (
                  <tr key={u.id}>
                    <td className="td">
                      <p className="font-medium">{u.username}{self && <span className="ml-1 text-xs text-slate-500">(you)</span>}</p>
                      <p className="text-xs text-slate-500">{u.email ?? '—'}</p>
                    </td>
                    <td className="td">
                      <select className="input w-auto" value={u.role} disabled={self || update.isPending} onChange={(e) => update.mutate({ id: u.id, body: { role: e.target.value as UserDto['role'] } })}>
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="td"><Badge tone={STATUS_TONE[u.status]}>{u.status}</Badge></td>
                    <td className="td text-slate-500">{ago(u.lastLoginAt)}</td>
                    <td className="td">
                      <div className="flex justify-end gap-1">
                        <button type="button" className="btn-ghost" disabled={!u.email || link.isPending} title={u.email ? undefined : 'No e-mail address'} onClick={() => link.mutate(u.id)}>
                          <Link2 className="size-4" /> {u.status === 'active' || u.status === 'disabled' ? 'Reset link' : 'New invite'}
                        </button>
                        {!self && (
                          <button type="button" className="btn-ghost" disabled={update.isPending} onClick={() => update.mutate({ id: u.id, body: { disabled: u.status !== 'disabled' } })}>
                            {u.status === 'disabled' ? 'Enable' : 'Disable'}
                          </button>
                        )}
                        {!self && (
                          <button type="button" className="btn-ghost p-1.5 text-rose-600" aria-label={`Delete ${u.username}`} onClick={() => confirm(`Delete ${u.username}? They can no longer sign in.`) && remove.mutate(u.id)}>
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={inviting} onClose={() => setInviting(false)} title="Invite user">
        {inviting && <InviteForm onDone={() => setInviting(false)} />}
      </Modal>
      <Modal open={linkResult !== null} onClose={() => setLinkResult(null)} title="Link created">
        {linkResult && <LinkResult result={linkResult} onDone={() => setLinkResult(null)} />}
      </Modal>
    </>
  );
}
