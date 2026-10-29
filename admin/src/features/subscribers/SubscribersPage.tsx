import { useState, type FormEvent } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, MailCheck, Search, Trash2, Upload } from 'lucide-react';
import { DashboardService, SubscribersService, type ImportResultDto, type SubscriberDto } from '@/sdk';
import { fieldErrors, qs } from '@/shared/api';
import { useAuth } from '@/shared/auth-context';
import { ago, fmtDate, num } from '@/shared/format';
import { useUrlFilters } from '@/shared/url-filters';
import { Badge, Checkbox, Empty, ErrorBox, Field, Modal, Notice, PageHeader, Pager, Spinner, type Tone } from '@/shared/ui';

type Status = SubscriberDto['status'];
const STATUSES: Status[] = ['active', 'pending', 'unsubscribed', 'bounced'];
const STATUS_TONE: Record<Status, Tone> = { active: 'emerald', pending: 'amber', unsubscribed: 'slate', bounced: 'rose' };
const PAGE_SIZE = 50;

function useTopics() {
  const posts = useQuery({ queryKey: ['posts'], queryFn: () => DashboardService.dashboardControllerPosts(), staleTime: 60_000 });
  return posts.data?.topics ?? [];
}

function ImportForm({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const [csv, setCsv] = useState('');
  const [consented, setConsented] = useState(false);
  const [result, setResult] = useState<ImportResultDto | null>(null);
  const run = useMutation({
    mutationFn: () => SubscribersService.adminSubscribersControllerImport({ requestBody: { csv, consented } }),
    onSuccess: (r) => {
      setResult(r);
      void qc.invalidateQueries({ queryKey: ['subscribers'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    run.mutate();
  };
  if (result) {
    return (
      <div className="space-y-3">
        <Notice tone="success">{`Added ${result.added}, skipped ${result.skipped} already on the list.`}</Notice>
        {result.invalid.length > 0 && <Notice tone="warning">{`Not valid e-mail addresses: ${result.invalid.join(', ')}`}</Notice>}
        <div className="flex justify-end"><button type="button" className="btn-primary" onClick={onDone}>Done</button></div>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="CSV file">
        <input
          type="file"
          accept=".csv,text/csv"
          className="block text-sm"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void file.text().then(setCsv);
          }}
        />
      </Field>
      <Field label="…or paste CSV" hint='A header row with an "email" column; optional "name" and "topics" (topic slugs separated by ";").' error={fieldErrors(run.error).csv}>
        <textarea className="input min-h-40 font-mono text-xs" value={csv} onChange={(e) => setCsv(e.target.value)} placeholder={'email,name,topics\nada@example.com,Ada,astro;typescript'} />
      </Field>
      <Checkbox
        checked={consented}
        onChange={setConsented}
        label="These people have already agreed to receive e-mail from us (add them as active, no confirm e-mail)"
      />
      {!consented && <p className="text-xs text-slate-500">Otherwise each address is added as pending and sent a confirm link, like the site's form.</p>}
      <ErrorBox error={run.error} />
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onDone}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={!csv.trim() || run.isPending}>Import</button>
      </div>
    </form>
  );
}

export function SubscribersPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const f = useUrlFilters();
  const topics = useTopics();
  const [importing, setImporting] = useState(false);
  const filters = { q: f.get('q') || undefined, status: (f.get('status') || undefined) as Status | undefined, topic: f.get('topic') || undefined };

  const list = useQuery({
    queryKey: ['subscribers', filters, f.page],
    queryFn: () => SubscribersService.adminSubscribersControllerList({ ...filters, page: f.page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });
  const counts = useQuery({ queryKey: ['subscribers', 'counts'], queryFn: () => SubscribersService.adminSubscribersControllerCounts() });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['subscribers'] });
    void qc.invalidateQueries({ queryKey: ['dashboard'] });
  };
  const update = useMutation({
    mutationFn: ({ id, status }: { id: number; status: Status }) => SubscribersService.adminSubscribersControllerUpdate({ id, requestBody: { status } }),
    onSuccess: refresh,
  });
  const resend = useMutation({ mutationFn: (id: number) => SubscribersService.adminSubscribersControllerResend({ id }) });
  const remove = useMutation({ mutationFn: (id: number) => SubscribersService.adminSubscribersControllerRemove({ id }), onSuccess: refresh });
  const topicName = new Map(topics.map((t) => [t.slug, t.name]));

  return (
    <>
      <PageHeader
        title="Subscribers"
        subtitle={
          counts.data
            ? `${num(counts.data.active)} active · ${num(counts.data.pending)} awaiting confirmation · ${num(counts.data.unsubscribed)} unsubscribed`
            : 'The mailing list. Sign-ups are double opt-in.'
        }
        actions={
          <>
            <a className="btn-secondary" href={`/api/admin/subscribers/export.csv${qs(filters)}`}>
              <Download className="size-4" /> Export CSV
            </a>
            {isAdmin && (
              <button type="button" className="btn-primary" onClick={() => setImporting(true)}>
                <Upload className="size-4" /> Import
              </button>
            )}
          </>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <label className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-slate-400" />
          <input className="input pl-8" placeholder="Search e-mail or name" value={f.get('q')} onChange={(e) => f.set({ q: e.target.value })} />
        </label>
        <select className="input w-auto" value={f.get('status')} onChange={(e) => f.set({ status: e.target.value })} aria-label="Status">
          <option value="">Any status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input w-auto" value={f.get('topic')} onChange={(e) => f.set({ topic: e.target.value })} aria-label="Topic">
          <option value="">Any topic</option>
          {topics.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}
        </select>
      </div>
      <ErrorBox error={list.error || update.error || resend.error || remove.error} className="mb-4" />
      {resend.isSuccess && <div className="mb-4"><Notice tone="success">Confirm e-mail sent.</Notice></div>}
      {list.isLoading && <Spinner />}
      {list.data && !list.data.data.length && <Empty>No subscribers{filters.q || filters.status || filters.topic ? ' match these filters' : ' yet'}.</Empty>}
      {list.data && list.data.data.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[52rem]">
            <thead className="border-b border-slate-200 dark:border-white/10">
              <tr><th className="th">Subscriber</th><th className="th">Topics</th><th className="th">Status</th><th className="th">Signed up</th><th className="th" /></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {list.data.data.map((s) => (
                <tr key={s.id}>
                  <td className="td">
                    <p className="font-medium">{s.email}</p>
                    <p className="text-xs text-slate-500">{s.name || '—'}{s.source && ` · from ${s.source}`}</p>
                  </td>
                  <td className="td">
                    <div className="flex flex-wrap gap-1">
                      {s.topics.length ? s.topics.map((t) => <Badge key={t} tone="brand">{topicName.get(t) ?? t}</Badge>) : <span className="text-sm text-slate-500">All topics</span>}
                    </div>
                  </td>
                  <td className="td">
                    <select
                      className="input w-auto py-1 text-xs"
                      value={s.status}
                      disabled={update.isPending}
                      aria-label={`Status of ${s.email}`}
                      onChange={(e) => update.mutate({ id: s.id, status: e.target.value as Status })}
                    >
                      {STATUSES.map((x) => <option key={x} value={x}>{x}</option>)}
                    </select>
                    <div className="mt-1"><Badge tone={STATUS_TONE[s.status]}>{s.status === 'active' ? `since ${fmtDate(s.confirmedAt)}` : s.status === 'unsubscribed' ? `on ${fmtDate(s.unsubscribedAt)}` : s.status}</Badge></div>
                  </td>
                  <td className="td whitespace-nowrap text-slate-500" title={fmtDate(s.createdAt)}>{ago(s.createdAt)}</td>
                  <td className="td">
                    <div className="flex justify-end gap-1">
                      {s.status === 'pending' && (
                        <button type="button" className="btn-ghost" disabled={resend.isPending} onClick={() => resend.mutate(s.id)} title="Send the confirm link again">
                          <MailCheck className="size-4" /> Resend
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          type="button"
                          className="btn-ghost p-1.5 text-rose-600"
                          aria-label={`Delete ${s.email}`}
                          onClick={() => confirm(`Delete ${s.email} for good? To stop e-mails but keep the record, set the status to unsubscribed instead.`) && remove.mutate(s.id)}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {list.data && <Pager page={list.data.page} pageSize={list.data.pageSize} total={list.data.total} onPage={(page) => f.set({ page })} />}
      <Modal open={importing} onClose={() => setImporting(false)} title="Import subscribers" wide>
        {importing && <ImportForm onDone={() => setImporting(false)} />}
      </Modal>
    </>
  );
}
