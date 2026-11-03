import { useRef, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Check, ImagePlus, Search } from 'lucide-react';
import { ContentService, type MediaItemDto } from '@/sdk';
import { useUpload } from './useUpload';
import { ErrorBox, Modal, Pager, Spinner } from '@/shared/ui';
import { thumbUrl } from '../editor/markdoc';

const PAGE_SIZE = 48;

/** Image grid with search and upload. `multiple` picks several (gallery); otherwise a click picks one. */
export function MediaGrid({ multiple = false, selected, onToggle }: { multiple?: boolean; selected: MediaItemDto[]; onToggle: (m: MediaItemDto) => void }) {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const input = useRef<HTMLInputElement>(null);
  const list = useQuery({
    queryKey: ['media', q, page],
    queryFn: () => ContentService.contentControllerListMedia({ q: q || undefined, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });
  const upload = useUpload();
  const chosen = new Set(selected.map((s) => s.id));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <label className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-slate-400" />
          <input className="input pl-8" placeholder="Search file names and alt texts" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </label>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          multiple={multiple}
          hidden
          onChange={(e) => {
            const files = [...(e.target.files ?? [])];
            e.target.value = '';
            if (files.length) upload.mutate(files, { onSuccess: (items) => items.forEach(onToggle) });
          }}
        />
        <button type="button" className="btn-primary" onClick={() => input.current?.click()} disabled={upload.isPending}>
          <ImagePlus className="size-4" /> {upload.isPending ? 'Uploading…' : 'Upload'}
        </button>
      </div>
      <ErrorBox error={list.error || upload.error} />
      {list.isLoading && <Spinner />}
      {list.data && !list.data.data.length && <p className="py-6 text-center text-sm text-slate-500">No images yet. Upload one.</p>}
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {list.data?.data.map((m) => {
          const on = chosen.has(m.id);
          return (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => onToggle(m)}
                title={m.alt || m.fileName}
                className={`relative block aspect-square w-full overflow-hidden rounded-lg ring-2 ${on ? 'ring-brand-600' : 'ring-transparent hover:ring-slate-300 dark:hover:ring-white/20'}`}
              >
                <img src={thumbUrl(m.id)} alt={m.alt} loading="lazy" className="size-full bg-slate-100 object-cover dark:bg-white/5" />
                {on && <span className="absolute top-1 right-1 rounded-full bg-brand-700 p-0.5 text-white"><Check className="size-3.5" /></span>}
              </button>
            </li>
          );
        })}
      </ul>
      {list.data && <Pager page={page} pageSize={PAGE_SIZE} total={list.data.total} onPage={setPage} />}
    </div>
  );
}

/** A dialog that returns one image. */
export function MediaPickerModal({ open, onClose, onPick, title = 'Choose an image' }: { open: boolean; onClose: () => void; onPick: (m: MediaItemDto) => void; title?: string }) {
  return (
    <Modal open={open} onClose={onClose} title={title} wide>
      <MediaGrid
        selected={[]}
        onToggle={(m) => {
          onPick(m);
          onClose();
        }}
      />
    </Modal>
  );
}

/** A form field holding one image id (covers, avatars), with a thumbnail and change/remove buttons. */
export function ImageField({ value, onChange, round = false }: { value: string | null; onChange: (id: string | null, item?: MediaItemDto) => void; round?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center gap-3">
      {value ? (
        <img src={thumbUrl(value)} alt="" className={`h-16 w-24 bg-slate-100 object-cover ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10 ${round ? 'w-16 rounded-full' : 'rounded-lg'}`} />
      ) : (
        <span className={`grid h-16 w-24 place-items-center bg-slate-100 text-xs text-slate-400 dark:bg-white/5 ${round ? 'w-16 rounded-full' : 'rounded-lg'}`}>None</span>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-secondary" onClick={() => setOpen(true)}>{value ? 'Change' : 'Choose'}</button>
        {value && <button type="button" className="btn-ghost" onClick={() => onChange(null)}>Remove</button>}
      </div>
      <MediaPickerModal open={open} onClose={() => setOpen(false)} onPick={(m) => onChange(m.id, m)} />
    </div>
  );
}
