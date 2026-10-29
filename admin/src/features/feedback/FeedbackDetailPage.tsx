import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, Send, Trash2 } from 'lucide-react';
import { FeedbackService, type FeedbackDto } from '@/sdk';
import { fieldErrors } from '@/shared/api';
import { useAuth } from '@/shared/auth-context';
import { fmtDateTime } from '@/shared/format';
import { Badge, ErrorBox, Field, Notice, PageHeader, Spinner } from '@/shared/ui';
import { FEEDBACK_STATUSES, helpfulLabel, STATUS_TONE, type FeedbackStatus } from './labels';

function ReplyForm({ item }: { item: FeedbackDto }) {
  const qc = useQueryClient();
  const [message, setMessage] = useState('');
  const send = useMutation({
    mutationFn: () => FeedbackService.adminFeedbackControllerReply({ id: item.id, requestBody: { message } }),
    onSuccess: (f) => {
      qc.setQueryData(['feedback', item.id], f);
      void qc.invalidateQueries({ queryKey: ['feedback'] });
      setMessage('');
    },
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    send.mutate();
  };
  if (!item.email) return <Notice>This reader left no e-mail address, so you can't reply.</Notice>;
  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label={`Reply to ${item.email}`} hint="Sent by e-mail, with their message quoted below yours." error={fieldErrors(send.error).message}>
        <textarea className="input min-h-32" value={message} onChange={(e) => setMessage(e.target.value)} />
      </Field>
      <ErrorBox error={send.error} />
      {send.isSuccess && <Notice tone="success">Reply sent.</Notice>}
      <div className="flex justify-end">
        <button type="submit" className="btn-primary" disabled={!message.trim() || send.isPending}>
          <Send className="size-4" /> Send reply
        </button>
      </div>
    </form>
  );
}

export function FeedbackDetailPage() {
  const id = Number(useParams().id);
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const item = useQuery({ queryKey: ['feedback', id], queryFn: () => FeedbackService.adminFeedbackControllerGet({ id }) });
  const setStatus = useMutation({
    mutationFn: (status: FeedbackStatus) => FeedbackService.adminFeedbackControllerUpdate({ id, requestBody: { status } }),
    onSuccess: (f) => {
      qc.setQueryData(['feedback', id], f);
      void qc.invalidateQueries({ queryKey: ['feedback'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
  const remove = useMutation({
    mutationFn: () => FeedbackService.adminFeedbackControllerRemove({ id }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['feedback'] });
      navigate('/feedback');
    },
  });
  const f = item.data;

  return (
    <>
      <Link to="/feedback" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:underline">
        <ArrowLeft className="size-4" /> Feedback
      </Link>
      <ErrorBox error={item.error || setStatus.error || remove.error} className="mb-4" />
      {item.isLoading && <Spinner />}
      {f && (
        <>
          <PageHeader
            title={f.name || f.email || 'Anonymous reader'}
            subtitle={fmtDateTime(f.createdAt)}
            actions={
              <>
                <select className="input w-auto" value={f.status} disabled={setStatus.isPending} onChange={(e) => setStatus.mutate(e.target.value as FeedbackStatus)} aria-label="Status">
                  {FEEDBACK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {isAdmin && (
                  <button type="button" className="btn-ghost text-rose-600" onClick={() => confirm('Delete this feedback for good?') && remove.mutate()}>
                    <Trash2 className="size-4" /> Delete
                  </button>
                )}
              </>
            }
          />
          <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
            <div className="space-y-6">
              <div className="card p-5">
                {f.message ? <p className="whitespace-pre-wrap">{f.message}</p> : <p className="text-slate-500">No message: only a vote.</p>}
              </div>
              {f.repliedAt && (
                <div className="card p-5">
                  <p className="mb-2 text-sm text-slate-500">{`${f.repliedBy || 'Staff'} replied ${fmtDateTime(f.repliedAt)}`}</p>
                  <p className="whitespace-pre-wrap">{f.reply}</p>
                </div>
              )}
              <div className="card p-5"><ReplyForm item={f} /></div>
            </div>
            <dl className="card h-fit space-y-3 p-5 text-sm">
              <div>
                <dt className="text-slate-500">About</dt>
                <dd>
                  {f.postSlug ? (
                    <a className="inline-flex items-center gap-1 font-medium hover:underline" href={f.postUrl ?? '#'} target="_blank" rel="noreferrer">
                      {f.postTitle ?? f.postSlug} <ExternalLink className="size-3.5" />
                    </a>
                  ) : 'The blog in general'}
                </dd>
              </div>
              {helpfulLabel(f.helpful) && <div><dt className="text-slate-500">Vote</dt><dd><Badge tone={f.helpful ? 'emerald' : 'amber'}>{helpfulLabel(f.helpful)}</Badge></dd></div>}
              <div><dt className="text-slate-500">E-mail</dt><dd>{f.email ? <a className="hover:underline" href={`mailto:${f.email}`}>{f.email}</a> : '—'}</dd></div>
              <div><dt className="text-slate-500">Status</dt><dd><Badge tone={STATUS_TONE[f.status]}>{f.status}</Badge></dd></div>
            </dl>
          </div>
        </>
      )}
    </>
  );
}
