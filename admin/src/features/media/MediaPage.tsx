import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { ContentService, type MediaItemDto } from '@/sdk';
import { useAuth } from '@/shared/auth-context';
import { fmtDateTime } from '@/shared/format';
import { CopyButton, ErrorBox, Field, Modal, Notice, PageHeader } from '@/shared/ui';
import { thumbUrl } from '../editor/markdoc';
import { MediaGrid } from './MediaPicker';

const kb = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);

function MediaDetails({ item, onDone }: { item: MediaItemDto; onDone: () => void }) {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [alt, setAlt] = useState(item.alt);
  const usage = useQuery({ queryKey: ['media-usage', item.id], queryFn: () => ContentService.contentControllerMediaUsage({ id: item.id }) });
  const save = useMutation({
    mutationFn: () => ContentService.contentControllerUpdateMedia({ id: item.id, requestBody: { alt } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['media'] });
      onDone();
    },
  });
  const remove = useMutation({
    mutationFn: () => ContentService.contentControllerRemoveMedia({ id: item.id }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['media'] });
      onDone();
    },
  });
  const used = usage.data?.usedBy ?? [];
  return (
    <div className="space-y-4">
      <img src={thumbUrl(item.id, 960)} alt={item.alt} className="max-h-80 w-full rounded-lg bg-slate-100 object-contain dark:bg-white/5" />
      <p className="text-xs text-slate-500">
        {item.fileName} · {item.width}×{item.height} · {kb(item.bytes)} · uploaded {fmtDateTime(item.createdAt)}{item.createdBy ? ` by ${item.createdBy}` : ''}
      </p>
      <Field label="Default alt text" hint="Suggested when the image is inserted into a post.">
        <input className="input" value={alt} onChange={(e) => setAlt(e.target.value)} />
      </Field>
      <div className="flex flex-wrap items-center gap-2">
        <CopyButton text={`![${alt}](${item.url})`} label="Copy Markdown" />
        <CopyButton text={new URL(item.url, window.location.origin).toString()} label="Copy URL" />
      </div>
      {used.length > 0 ? (
        <Notice>Used by {used.join(', ')}.</Notice>
      ) : usage.data ? (
        <Notice tone="warning">Not used by any post, page or author.</Notice>
      ) : null}
      <ErrorBox error={save.error || remove.error} />
      <div className="flex justify-between gap-2">
        {isAdmin ? (
          <button type="button" className="btn-danger-ghost" disabled={used.length > 0 || remove.isPending} onClick={() => window.confirm('Delete this image?') && remove.mutate()} title={used.length ? 'Still in use' : 'Delete'}>
            <Trash2 className="size-4" /> Delete
          </button>
        ) : <span />}
        <div className="flex gap-2">
          <button type="button" className="btn-secondary" onClick={onDone}>Close</button>
          <button type="button" className="btn-primary" disabled={alt === item.alt || save.isPending} onClick={() => save.mutate()}>Save</button>
        </div>
      </div>
    </div>
  );
}

/** Every uploaded image. Upload here, or straight from the post editor. */
export function MediaPage() {
  const [open, setOpen] = useState<MediaItemDto | null>(null);
  return (
    <>
      <PageHeader title="Images" subtitle="Covers, author photos and images in posts. The site serves resized copies; uploads keep no location or camera data." />
      <MediaGrid multiple selected={[]} onToggle={setOpen} />
      <Modal open={!!open} onClose={() => setOpen(null)} title="Image" wide>
        {open && <MediaDetails key={open.id} item={open} onDone={() => setOpen(null)} />}
      </Modal>
    </>
  );
}
