import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { ContentService, type TopicDto, type TopicInputDto } from '@/sdk';
import { fieldErrors } from '@/shared/api';
import { useAuth } from '@/shared/auth-context';
import { slugify } from '@/shared/format';
import { Empty, ErrorBox, Field, Modal, PageHeader, Spinner } from '@/shared/ui';
import { ACCENTS, CONTENT_ICONS } from '../editor/options';

const EMPTY: TopicInputDto = { slug: '', name: '', description: '', icon: 'book', accent: 'teal', sortOrder: 10 };

function TopicForm({ topic, onDone }: { topic: TopicDto | null; onDone: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState<TopicInputDto>(topic ? { slug: topic.slug, name: topic.name, description: topic.description, icon: topic.icon as TopicInputDto['icon'], accent: topic.accent as TopicInputDto['accent'], sortOrder: topic.sortOrder } : EMPTY);
  const save = useMutation({
    mutationFn: () => (topic ? ContentService.contentControllerUpdateTopic({ id: topic.id, requestBody: f }) : ContentService.contentControllerCreateTopic({ requestBody: f })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['topics'] });
      onDone();
    },
  });
  const errs = fieldErrors(save.error);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate();
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Name" error={errs.name}>
        <input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value, slug: topic ? f.slug : slugify(e.target.value) })} autoFocus />
      </Field>
      <Field label="Slug" hint={topic ? "Can't change: posts and subscribers' topic choices use it." : `The topic's URL: /topics/${f.slug || '…'}/`} error={errs.slug}>
        <input className="input font-mono text-xs" value={f.slug} disabled={!!topic} onChange={(e) => setF({ ...f, slug: e.target.value.toLowerCase() })} />
      </Field>
      <Field label="Description" error={errs.description}>
        <textarea className="input min-h-20" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Icon" error={errs.icon}>
          <select className="input" value={f.icon} onChange={(e) => setF({ ...f, icon: e.target.value as TopicInputDto['icon'] })}>
            {CONTENT_ICONS.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </Field>
        <Field label="Colour" error={errs.accent}>
          <select className="input" value={f.accent} onChange={(e) => setF({ ...f, accent: e.target.value as TopicInputDto['accent'] })}>
            {Object.keys(ACCENTS).map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </Field>
        <Field label="Order" hint="Lower first" error={errs.sortOrder}>
          <input className="input" type="number" min={0} max={1000} value={f.sortOrder} onChange={(e) => setF({ ...f, sortOrder: Number(e.target.value) || 0 })} />
        </Field>
      </div>
      <ErrorBox error={Object.keys(errs).length ? null : save.error} />
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onDone}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={save.isPending || !f.name.trim()}>{topic ? 'Save' : 'Create topic'}</button>
      </div>
    </form>
  );
}

/** Topics group posts (a page each, and the choices readers subscribe to). */
export function TopicsPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<TopicDto | 'new' | null>(null);
  const topics = useQuery({ queryKey: ['topics'], queryFn: () => ContentService.contentControllerListTopics() });
  const remove = useMutation({
    mutationFn: (id: number) => ContentService.contentControllerRemoveTopic({ id }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['topics'] }),
  });
  return (
    <>
      <PageHeader
        title="Topics"
        subtitle="Each topic with a published post gets a page on the site, and readers can subscribe to topics."
        actions={<button type="button" className="btn-primary" onClick={() => setEditing('new')}><Plus className="size-4" /> New topic</button>}
      />
      <ErrorBox error={topics.error || remove.error} className="mb-4" />
      {topics.isLoading && <Spinner />}
      {topics.data && !topics.data.length && <Empty>No topics yet.</Empty>}
      {topics.data && topics.data.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[40rem]">
            <thead className="border-b border-slate-200 dark:border-white/10">
              <tr><th className="th">Topic</th><th className="th">Slug</th><th className="th text-right">Posts</th><th className="th text-right">Order</th><th className="th" /></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {topics.data.map((t) => (
                <tr key={t.id}>
                  <td className="td">
                    <span className="flex items-center gap-2 font-medium"><span className={`size-2.5 rounded-full ${ACCENTS[t.accent] ?? 'bg-slate-400'}`} />{t.name}</span>
                    {t.description && <p className="mt-0.5 text-xs text-slate-500">{t.description}</p>}
                  </td>
                  <td className="td font-mono text-xs text-slate-500">{t.slug}</td>
                  <td className="td text-right tabular-nums">{t.posts}</td>
                  <td className="td text-right tabular-nums text-slate-500">{t.sortOrder}</td>
                  <td className="td">
                    <div className="flex justify-end gap-1">
                      <button type="button" className="btn-icon" aria-label={`Edit ${t.name}`} onClick={() => setEditing(t)}><Pencil className="size-4" /></button>
                      {isAdmin && (
                        <button
                          type="button"
                          className="btn-icon-danger"
                          aria-label={`Delete ${t.name}`}
                          disabled={t.posts > 0 || remove.isPending}
                          title={t.posts > 0 ? 'Used by posts' : 'Delete'}
                          onClick={() => window.confirm(`Delete the topic “${t.name}”?`) && remove.mutate(t.id)}
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
      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'New topic' : 'Edit topic'}>
        {editing !== null && <TopicForm topic={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />}
      </Modal>
    </>
  );
}
