import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { DashboardService, DigestsService } from '@/sdk';
import { fieldErrors } from '@/shared/api';
import { ago, fmtDate, num } from '@/shared/format';
import { Badge, Empty, ErrorBox, Field, Modal, PageHeader, Spinner } from '@/shared/ui';
import { DIGEST_TONE } from './labels';

function NewDigestForm({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate();
  const posts = useQuery({ queryKey: ['posts'], queryFn: () => DashboardService.dashboardControllerPosts() });
  const [postSlug, setPostSlug] = useState('');
  const create = useMutation({
    mutationFn: () => DigestsService.digestsControllerCreate({ requestBody: { postSlug } }),
    onSuccess: (d) => {
      onDone();
      navigate(`/digests/${d.id}`);
    },
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate();
  };
  const list = [...(posts.data?.data ?? [])].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return (
    <form onSubmit={submit} className="space-y-4">
      {posts.isLoading && <Spinner />}
      <Field label="Post" hint="Only posts the site has published are listed." error={fieldErrors(create.error).postSlug}>
        <select className="input" value={postSlug} onChange={(e) => setPostSlug(e.target.value)} required>
          <option value="">Choose a post…</option>
          {list.map((p) => <option key={p.slug} value={p.slug}>{`${p.title} (${fmtDate(p.publishedAt)})`}</option>)}
        </select>
      </Field>
      <ErrorBox error={create.error} />
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onDone}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={!postSlug || create.isPending}>Create draft</button>
      </div>
    </form>
  );
}

export function DigestsPage() {
  const [creating, setCreating] = useState(false);
  const list = useQuery({
    queryKey: ['digests'],
    queryFn: () => DigestsService.digestsControllerList(),
    refetchInterval: (q) => (q.state.data?.some((d) => d.status === 'sending') ? 3000 : false),
  });
  return (
    <>
      <PageHeader
        title="New-post e-mails"
        subtitle="Tell subscribers about a post. Each goes to active subscribers who follow one of the post's topics (or all topics)."
        actions={<button type="button" className="btn-primary" onClick={() => setCreating(true)}><Plus className="size-4" /> New e-mail</button>}
      />
      <ErrorBox error={list.error} className="mb-4" />
      {list.isLoading && <Spinner />}
      {list.data && !list.data.length && <Empty>No e-mails yet. Pick a post to announce.</Empty>}
      {list.data && list.data.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[44rem]">
            <thead className="border-b border-slate-200 dark:border-white/10">
              <tr><th className="th">Subject</th><th className="th">Status</th><th className="th text-right">Sent</th><th className="th">Created</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {list.data.map((d) => (
                <tr key={d.id}>
                  <td className="td">
                    <Link to={`/digests/${d.id}`} className="font-medium hover:underline">{d.subject}</Link>
                    <p className="text-xs text-slate-500">{d.post?.title ?? d.postSlug}</p>
                  </td>
                  <td className="td"><Badge tone={DIGEST_TONE[d.status]}>{d.status}</Badge></td>
                  <td className="td text-right tabular-nums">{d.status === 'draft' ? '—' : `${num(d.sentCount)} / ${num(d.recipients)}`}{d.failedCount > 0 && <span className="ml-1 text-rose-600">({d.failedCount} failed)</span>}</td>
                  <td className="td whitespace-nowrap text-slate-500">{ago(d.createdAt)}{d.createdBy && ` · ${d.createdBy}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={creating} onClose={() => setCreating(false)} title="New e-mail">
        {creating && <NewDigestForm onDone={() => setCreating(false)} />}
      </Modal>
    </>
  );
}
