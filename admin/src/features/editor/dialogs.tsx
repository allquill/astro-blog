import { useState, type FormEvent, type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Download, X } from 'lucide-react';
import { ContentService, type MediaItemDto } from '@/sdk';
import { fieldErrors } from '@/shared/api';
import { ErrorBox, Field, Modal } from '@/shared/ui';
import { MediaGrid } from '../media/MediaPicker';
import {
  HIGHLIGHT, LANGUAGES, calloutSnippet, codeSnippet, gallerySnippet, imageSnippet, linkcardSnippet, thumbUrl, videoSnippet,
} from './markdoc';

export type InsertKind = 'code' | 'image' | 'gallery' | 'video' | 'callout' | 'linkcard';

type DialogProps = { onInsert: (text: string) => void; onClose: () => void; selection: string };

function Actions({ onClose, disabled, label = 'Insert' }: { onClose: () => void; disabled?: boolean; label?: string }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
      <button type="submit" className="btn-primary" disabled={disabled}>{label}</button>
    </div>
  );
}

const submit = (fn: () => void) => (e: FormEvent) => {
  e.preventDefault();
  e.stopPropagation();
  fn();
};

// ------------------------------------------------------------------------------------- code

/** A code block: pasted, or fetched from a GitHub/GitLab/Bitbucket/raw link (embedded as it is now). */
function CodeDialog({ onInsert, onClose, selection }: DialogProps) {
  const [c, setC] = useState({ content: selection, language: '', title: '', highlight: '', source: '' });
  const [url, setUrl] = useState('');
  const fetchCode = useMutation({
    mutationFn: () => ContentService.contentControllerFetchCode({ requestBody: { url } }),
    onSuccess: (r) => setC({ ...c, content: r.content, language: r.language || c.language, title: c.title || r.title, source: r.source }),
  });
  const badHighlight = c.highlight.trim() !== '' && !HIGHLIGHT.test(c.highlight);
  const lines = c.content.replace(/\n+$/, '').split('\n').length;
  return (
    <form onSubmit={submit(() => onInsert(codeSnippet(c)))} className="space-y-4">
      <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
        <Field
          label="Fetch from a link (optional)"
          hint="A public file on GitHub, GitLab, Bitbucket or a Gist, or any https link to a text file. Add #L10-L20 to take only those lines. The code is copied in now; later changes to the file don't change the post."
          error={fieldErrors(fetchCode.error).url}
        >
          <div className="flex gap-2">
            <input className="input" type="url" placeholder="https://github.com/owner/repo/blob/main/src/app.ts#L10-L30" value={url} onChange={(e) => setUrl(e.target.value)} />
            <button type="button" className="btn-secondary" disabled={!url || fetchCode.isPending} onClick={() => fetchCode.mutate()}>
              <Download className="size-4" /> {fetchCode.isPending ? 'Fetching…' : 'Fetch'}
            </button>
          </div>
        </Field>
        {!fieldErrors(fetchCode.error).url && <ErrorBox error={fetchCode.error} className="mt-2" />}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Language" hint="For highlighting">
          <input className="input" list="code-languages" value={c.language} onChange={(e) => setC({ ...c, language: e.target.value })} placeholder="ts" />
          <datalist id="code-languages">{LANGUAGES.map((l) => <option key={l} value={l} />)}</datalist>
        </Field>
        <Field label="Title" hint="Shown above the code, e.g. a file name">
          <input className="input" value={c.title} onChange={(e) => setC({ ...c, title: e.target.value })} placeholder="src/app.ts" />
        </Field>
        <Field label="Highlight lines" hint={`e.g. 2,4-6 (of ${lines})`} error={badHighlight ? 'Use numbers and ranges: 2,4-6' : undefined}>
          <input className="input" value={c.highlight} onChange={(e) => setC({ ...c, highlight: e.target.value })} placeholder="2,4-6" />
        </Field>
      </div>
      <Field label="Source link" hint='Optional. Shown as "View on GitHub" (or the site name) above the code.'>
        <input className="input" type="url" value={c.source} onChange={(e) => setC({ ...c, source: e.target.value })} placeholder="https://github.com/owner/repo/blob/main/src/app.ts#L10-L30" />
      </Field>
      <Field label="Code">
        <textarea className="input min-h-56 font-mono text-xs" spellCheck={false} value={c.content} onChange={(e) => setC({ ...c, content: e.target.value })} />
      </Field>
      <Actions onClose={onClose} disabled={!c.content.trim() || badHighlight} />
    </form>
  );
}

// ------------------------------------------------------------------------------------ images

function ImageDialog({ onInsert, onClose }: DialogProps) {
  const [picked, setPicked] = useState<MediaItemDto | null>(null);
  const [alt, setAlt] = useState('');
  return (
    <form onSubmit={submit(() => picked && onInsert(imageSnippet(picked.id, alt)))} className="space-y-4">
      <MediaGrid
        selected={picked ? [picked] : []}
        onToggle={(m) => {
          setPicked(m);
          setAlt(m.alt);
        }}
      />
      {picked && (
        <Field label="Alt text" hint="Describe the image for people who can't see it. Leave empty only for decoration.">
          <input className="input" value={alt} onChange={(e) => setAlt(e.target.value)} autoFocus />
        </Field>
      )}
      <Actions onClose={onClose} disabled={!picked} />
    </form>
  );
}

function GalleryDialog({ onInsert, onClose }: DialogProps) {
  const [items, setItems] = useState<{ id: string; alt: string; caption: string }[]>([]);
  const [columns, setColumns] = useState<'2' | '3'>('2');
  const toggle = (m: MediaItemDto) =>
    setItems((list) => (list.some((i) => i.id === m.id) ? list.filter((i) => i.id !== m.id) : [...list, { id: m.id, alt: m.alt, caption: '' }]));
  return (
    <form onSubmit={submit(() => onInsert(gallerySnippet(items, columns)))} className="space-y-4">
      <MediaGrid multiple selected={items.map((i) => ({ id: i.id }) as MediaItemDto)} onToggle={toggle} />
      {items.length > 0 && (
        <div className="space-y-2">
          <p className="label">In the gallery, in this order</p>
          {items.map((it, n) => (
            <div key={it.id} className="flex items-center gap-2">
              <img src={thumbUrl(it.id)} alt="" className="size-12 rounded object-cover" />
              <input className="input" placeholder="Alt text" value={it.alt} onChange={(e) => setItems(items.map((x, j) => (j === n ? { ...x, alt: e.target.value } : x)))} />
              <input className="input" placeholder="Caption (optional)" value={it.caption} onChange={(e) => setItems(items.map((x, j) => (j === n ? { ...x, caption: e.target.value } : x)))} />
              <button type="button" className="btn-icon" aria-label="Remove" onClick={() => setItems(items.filter((_, j) => j !== n))}><X className="size-4" /></button>
            </div>
          ))}
          <Field label="Columns">
            <select className="input w-auto" value={columns} onChange={(e) => setColumns(e.target.value as '2' | '3')}>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>
          </Field>
        </div>
      )}
      <Actions onClose={onClose} disabled={items.length < 1} />
    </form>
  );
}

// ------------------------------------------------------------------------------ other blocks

function VideoDialog({ onInsert, onClose }: DialogProps) {
  const [v, setV] = useState({ provider: 'youtube', id: '', title: '', start: 0 });
  return (
    <form onSubmit={submit(() => onInsert(videoSnippet(v)))} className="space-y-4">
      <Field label="Source">
        <select className="input" value={v.provider} onChange={(e) => setV({ ...v, provider: e.target.value })}>
          <option value="youtube">YouTube</option>
          <option value="vimeo">Vimeo</option>
          <option value="file">Video file (URL)</option>
        </select>
      </Field>
      <Field label={v.provider === 'file' ? 'Video URL' : 'Video link or ID'} hint={v.provider === 'file' ? 'A full https:// URL of an .mp4 or .webm file' : 'e.g. https://youtu.be/dQw4w9WgXcQ. Nothing loads from the video site until the reader presses play.'}>
        <input className="input" value={v.id} onChange={(e) => setV({ ...v, id: e.target.value })} autoFocus />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Title" hint="For screen readers" className="sm:col-span-2">
          <input className="input" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} />
        </Field>
        <Field label="Start at (seconds)">
          <input className="input" type="number" min={0} value={v.start} onChange={(e) => setV({ ...v, start: Number(e.target.value) || 0 })} />
        </Field>
      </div>
      <Actions onClose={onClose} disabled={!v.id.trim()} />
    </form>
  );
}

function CalloutDialog({ onInsert, onClose, selection }: DialogProps) {
  const [c, setC] = useState({ type: 'note', title: '', text: selection });
  return (
    <form onSubmit={submit(() => onInsert(calloutSnippet(c)))} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Kind">
          <select className="input" value={c.type} onChange={(e) => setC({ ...c, type: e.target.value })}>
            <option value="note">Note</option>
            <option value="tip">Tip</option>
            <option value="warning">Warning</option>
            <option value="danger">Danger</option>
          </select>
        </Field>
        <Field label="Title" hint="Optional; defaults to the kind" className="sm:col-span-2">
          <input className="input" value={c.title} onChange={(e) => setC({ ...c, title: e.target.value })} />
        </Field>
      </div>
      <Field label="Text" hint="Markdown is fine.">
        <textarea className="input min-h-28" value={c.text} onChange={(e) => setC({ ...c, text: e.target.value })} autoFocus />
      </Field>
      <Actions onClose={onClose} />
    </form>
  );
}

function LinkCardDialog({ onInsert, onClose }: DialogProps) {
  const [l, setL] = useState({ url: '', title: '', description: '' });
  return (
    <form onSubmit={submit(() => onInsert(linkcardSnippet(l)))} className="space-y-4">
      <Field label="Link" hint="A full URL, or a path on this site like /blog/my-post/">
        <input className="input" value={l.url} onChange={(e) => setL({ ...l, url: e.target.value })} autoFocus />
      </Field>
      <Field label="Title">
        <input className="input" value={l.title} onChange={(e) => setL({ ...l, title: e.target.value })} />
      </Field>
      <Field label="Description">
        <input className="input" value={l.description} onChange={(e) => setL({ ...l, description: e.target.value })} />
      </Field>
      <Actions onClose={onClose} disabled={!l.url.trim()} />
    </form>
  );
}

const DIALOGS: Record<InsertKind, { title: string; wide?: boolean; Body: (p: DialogProps) => ReactNode }> = {
  code: { title: 'Insert code', wide: true, Body: CodeDialog },
  image: { title: 'Insert an image', wide: true, Body: ImageDialog },
  gallery: { title: 'Insert a gallery', wide: true, Body: GalleryDialog },
  video: { title: 'Insert a video', Body: VideoDialog },
  callout: { title: 'Insert a callout', Body: CalloutDialog },
  linkcard: { title: 'Insert a link card', Body: LinkCardDialog },
};

export function InsertDialog({ kind, selection, onInsert, onClose }: { kind: InsertKind | null; selection: string; onInsert: (text: string) => void; onClose: () => void }) {
  const d = kind ? DIALOGS[kind] : null;
  return (
    <Modal open={!!d} onClose={onClose} title={d?.title ?? ''} wide={d?.wide}>
      {d && <d.Body key={kind} selection={selection} onInsert={onInsert} onClose={onClose} />}
    </Modal>
  );
}
