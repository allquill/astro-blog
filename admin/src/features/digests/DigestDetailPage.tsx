import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FlaskConical, Send, Trash2 } from 'lucide-react';
import { DigestsService, type DigestDto } from '@/sdk';
import { fieldErrors } from '@/shared/api';
import { useAuth } from '@/shared/auth-context';
import { fmtDateTime, num } from '@/shared/format';
import { Badge, ErrorBox, Field, Notice, PageHeader, Pager, Spinner } from '@/shared/ui';
import { DIGEST_TONE } from './labels';

function DraftEditor({ digest }: { digest: DigestDto }) {
  const qc = useQueryClient();
  const [subject, setSubject] = useState(digest.subject);
  const [intro, setIntro] = useState(digest.intro);
  const save = useMutation({
    mutationFn: () => DigestsService.digestsControllerUpdate({ id: digest.id, requestBody: { subject, intro } }),
    onSuccess: (d) => {
      qc.setQueryData(['digests', digest.id], d);
      void qc.invalidateQueries({ queryKey: ['digests', digest.id, 'preview'] });
      void qc.invalidateQueries({ queryKey: ['digests'], exact: true });
    },
  });
  const errs = fieldErrors(save.error);
  const dirty = subject !== digest.subject || intro !== digest.intro;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate();
  };
  return (
    <form onSubmit={submit} className="card space-y-4 p-5">
      <Field label="Subject" error={errs.subject}>
        <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} />
      </Field>
      <Field label="Note above the post (optional)" hint="A line or two in your own words; the post's title, image and summary follow." error={errs.intro}>
        <textarea className="input min-h-28" value={intro} onChange={(e) => setIntro(e.target.value)} />
      </Field>
      <ErrorBox error={save.error} />
      <div className="flex justify-end">
        <button type="submit" className="btn-primary" disabled={!dirty || save.isPending}>Save draft</button>
      </div>
    </form>
  );
}

function SendPanel({ digest, audience }: { digest: DigestDto; audience: number | undefined }) {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [to, setTo] = useState('');
  const test = useMutation({ mutationFn: () => DigestsService.digestsControllerTest({ id: digest.id, requestBody: to ? { to } : {} }) });
  const send = useMutation({
    mutationFn: () => DigestsService.digestsControllerSend({ id: digest.id }),
    onSuccess: (d) => {
      qc.setQueryData(['digests', digest.id], d);
      void qc.invalidateQueries({ queryKey: ['digests'] });
    },
  });
  return (
    <div className="card space-y-4 p-5">
      <div>
        <p className="text-sm text-slate-500">Recipients</p>
        <p className="text-2xl font-semibold tabular-nums">{audience === undefined ? '…' : num(audience)}</p>
        <p className="text-xs text-slate-500">Active subscribers following this post's topics.</p>
      </div>
      <Field label="Send a test to" hint="Leave empty to use your own account e-mail." error={fieldErrors(test.error).to}>
        <input className="input" type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="you@example.com" />
      </Field>
      <button type="button" className="btn-secondary w-full" disabled={test.isPending} onClick={() => test.mutate()}>
        <FlaskConical className="size-4" /> Send test
      </button>
      {test.isSuccess && <Notice tone="success">Test sent.</Notice>}
      <ErrorBox error={test.error || send.error} />
      {isAdmin ? (
        <button
          type="button"
          className="btn-primary w-full"
          disabled={!audience || send.isPending}
          onClick={() => confirm(`Send "${digest.subject}" to ${audience} subscriber(s)? This can't be undone.`) && send.mutate()}
        >
          <Send className="size-4" /> Send to {audience ?? '…'} subscriber(s)
        </button>
      ) : (
        <Notice>Only admins can send to the list.</Notice>
      )}
    </div>
  );
}

function Deliveries({ id, sending }: { id: number; sending: boolean }) {
  const [status, setStatus] = useState<'' | 'pending' | 'sent' | 'failed'>('');
  const [page, setPage] = useState(1);
  const list = useQuery({
    queryKey: ['digests', id, 'deliveries', status, page],
    queryFn: () => DigestsService.digestsControllerDeliveries({ id, status: status || undefined, page, pageSize: 50 }),
    placeholderData: keepPreviousData,
    refetchInterval: sending ? 3000 : false,
  });
  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Recipients</h2>
        <select className="input w-auto" value={status} onChange={(e) => { setStatus(e.target.value as typeof status); setPage(1); }} aria-label="Delivery status">
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
        </select>
      </div>
      <ErrorBox error={list.error} />
      {list.data && (
        <>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {list.data.data.map((d) => (
                <tr key={d.id}>
                  <td className="py-1.5">{d.email}</td>
                  <td className="py-1.5"><Badge tone={d.status === 'sent' ? 'emerald' : d.status === 'failed' ? 'rose' : 'amber'}>{d.status}</Badge></td>
                  <td className="py-1.5 text-xs text-slate-500">{d.error || (d.sentAt ? fmtDateTime(d.sentAt) : '')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pager page={list.data.page} pageSize={list.data.pageSize} total={list.data.total} onPage={setPage} />
        </>
      )}
    </div>
  );
}

export function DigestDetailPage() {
  const id = Number(useParams().id);
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const digest = useQuery({
    queryKey: ['digests', id],
    queryFn: () => DigestsService.digestsControllerGet({ id }),
    refetchInterval: (q) => (q.state.data?.status === 'sending' ? 2000 : false),
  });
  const preview = useQuery({ queryKey: ['digests', id, 'preview'], queryFn: () => DigestsService.digestsControllerPreview({ id }), enabled: digest.isSuccess });
  const remove = useMutation({
    mutationFn: () => DigestsService.digestsControllerRemove({ id }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['digests'] });
      navigate('/digests');
    },
  });
  const d = digest.data;
  // Recipients and the preview change once sending finishes (counts, snapshot).
  useEffect(() => {
    if (d?.status === 'sent' || d?.status === 'failed') void qc.invalidateQueries({ queryKey: ['digests'], exact: true });
  }, [d?.status, qc]);

  return (
    <>
      <Link to="/digests" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:underline">
        <ArrowLeft className="size-4" /> New-post e-mails
      </Link>
      <ErrorBox error={digest.error || remove.error} className="mb-4" />
      {digest.isLoading && <Spinner />}
      {d && (
        <>
          <PageHeader
            title={d.subject}
            subtitle={<>About <a className="hover:underline" href={d.post?.url} target="_blank" rel="noreferrer">{d.post?.title ?? d.postSlug}</a></>}
            actions={
              <>
                <Badge tone={DIGEST_TONE[d.status]}>{d.status}</Badge>
                {isAdmin && d.status !== 'sending' && (
                  <button type="button" className="btn-ghost text-rose-600" onClick={() => confirm('Delete this e-mail and its delivery records?') && remove.mutate()}>
                    <Trash2 className="size-4" /> Delete
                  </button>
                )}
              </>
            }
          />
          {!d.post && <div className="mb-4"><Notice tone="warning">This post is not in the site feed any more; it can't be sent.</Notice></div>}
          {d.status !== 'draft' && (
            <div className="mb-6 card p-5">
              <div className="mb-2 flex justify-between text-sm">
                <span>{`${num(d.sentCount)} of ${num(d.recipients)} sent${d.failedCount ? `, ${num(d.failedCount)} failed` : ''}`}</span>
                <span className="text-slate-500">{d.finishedAt ? `Finished ${fmtDateTime(d.finishedAt)}` : d.startedAt ? `Started ${fmtDateTime(d.startedAt)}` : ''}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                <div className="h-full bg-teal-600 transition-all" style={{ width: `${d.recipients ? ((d.sentCount + d.failedCount) / d.recipients) * 100 : 0}%` }} />
              </div>
            </div>
          )}
          <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
            <div className="space-y-6">
              {d.status === 'draft' && <DraftEditor key={d.updatedAt} digest={d} />}
              <div className="card overflow-hidden">
                <p className="border-b border-slate-200 px-5 py-3 text-sm font-semibold dark:border-white/10">Preview</p>
                <ErrorBox error={preview.error} className="m-4" />
                {preview.data && <iframe title="E-mail preview" sandbox="" srcDoc={preview.data.html} className="h-[36rem] w-full bg-white" />}
              </div>
              {d.status !== 'draft' && <Deliveries id={d.id} sending={d.status === 'sending'} />}
            </div>
            {d.status === 'draft' && d.post && <div><SendPanel digest={d} audience={preview.data?.audience} /></div>}
          </div>
        </>
      )}
    </>
  );
}
