import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import CodeMirror, { EditorView, type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import {
  AlertTriangle, Bold, Code, FileCode, Film, Heading2, Heading3, Image, Images, Info, Italic, Link, Link2, List, ListOrdered, Quote,
} from 'lucide-react';
import { ContentService } from '@/sdk';
import { InsertDialog, type InsertKind } from './dialogs';

/** Follows the admin's light/dark class on <html>. */
function useDark() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const o = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')));
    o.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => o.disconnect();
  }, []);
  return dark;
}

/** The body checked by the API (same rules as on save) a moment after typing stops. */
function useProblems(body: string) {
  const [debounced, setDebounced] = useState(body);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(body), 700);
    return () => clearTimeout(t);
  }, [body]);
  const check = useQuery({
    queryKey: ['validate-body', debounced],
    queryFn: () => ContentService.contentControllerValidate({ requestBody: { body: debounced } }),
    enabled: debounced.trim().length > 0,
    staleTime: Infinity,
  });
  return check.data?.problems ?? [];
}

const theme = EditorView.theme({
  '&': { fontSize: '14px' },
  '.cm-content': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', padding: '12px 0' },
  '.cm-gutters': { display: 'none' },
  '.cm-line': { padding: '0 14px' },
  '&.cm-focused': { outline: 'none' },
});

type Props = {
  value: string;
  onChange: (v: string) => void;
  /** Field error from the API, shown under the editor. */
  error?: string;
  minHeight?: string;
};

/**
 * The post and page body editor: Markdoc source in CodeMirror, a toolbar for Markdown and for the
 * site's blocks (code from a link, images and galleries from the media library, video, callout, link
 * card), and the API's validation of the body as you type.
 */
export function MarkdocEditor({ value, onChange, error, minHeight = '28rem' }: Props) {
  const ref = useRef<ReactCodeMirrorRef>(null);
  const dark = useDark();
  const [dialog, setDialog] = useState<InsertKind | null>(null);
  const [selection, setSelection] = useState('');
  const problems = useProblems(value);
  const extensions = useMemo(() => [markdown(), EditorView.lineWrapping, theme], []);

  const view = () => ref.current?.view;

  /** Wraps the selection (or a placeholder) in markers. */
  const wrap = (before: string, after = before, placeholder = 'text') => {
    const v = view();
    if (!v) return;
    const { from, to } = v.state.selection.main;
    const text = v.state.sliceDoc(from, to) || placeholder;
    v.dispatch({ changes: { from, to, insert: `${before}${text}${after}` }, selection: { anchor: from + before.length, head: from + before.length + text.length } });
    v.focus();
  };

  /** Prefixes every selected line (headings, lists, quotes). */
  const prefix = (p: string | ((i: number) => string)) => {
    const v = view();
    if (!v) return;
    const { from, to } = v.state.selection.main;
    const first = v.state.doc.lineAt(from);
    const last = v.state.doc.lineAt(to);
    const changes = [];
    for (let n = first.number, i = 0; n <= last.number; n++, i++) {
      const line = v.state.doc.line(n);
      changes.push({ from: line.from, insert: typeof p === 'string' ? p : p(i) });
    }
    v.dispatch({ changes });
    v.focus();
  };

  /** Inserts a block on its own lines at the cursor (replacing the selection). */
  const insertBlock = (text: string) => {
    const v = view();
    if (!v) return;
    const { from, to } = v.state.selection.main;
    const before = v.state.sliceDoc(Math.max(0, from - 2), from);
    const after = v.state.sliceDoc(to, to + 2);
    const lead = from === 0 || before === '\n\n' ? '' : before.endsWith('\n') ? '\n' : '\n\n';
    const trail = after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n';
    const insert = `${lead}${text}${trail}`;
    v.dispatch({ changes: { from, to, insert }, selection: { anchor: from + insert.length } });
    v.focus();
  };

  const open = (kind: InsertKind) => {
    const v = view();
    setSelection(v ? v.state.sliceDoc(v.state.selection.main.from, v.state.selection.main.to) : '');
    setDialog(kind);
  };

  const tools: { label: string; icon: typeof Bold; run: () => void; sep?: boolean }[] = [
    { label: 'Bold', icon: Bold, run: () => wrap('**') },
    { label: 'Italic', icon: Italic, run: () => wrap('_') },
    { label: 'Inline code', icon: Code, run: () => wrap('`', '`', 'code') },
    { label: 'Link', icon: Link, run: () => wrap('[', '](https://)', 'link text') },
    { label: 'Heading', icon: Heading2, run: () => prefix('## '), sep: true },
    { label: 'Subheading', icon: Heading3, run: () => prefix('### ') },
    { label: 'Bulleted list', icon: List, run: () => prefix('- ') },
    { label: 'Numbered list', icon: ListOrdered, run: () => prefix((i) => `${i + 1}. `) },
    { label: 'Quote', icon: Quote, run: () => prefix('> ') },
    { label: 'Code block (paste or from GitHub)', icon: FileCode, run: () => open('code'), sep: true },
    { label: 'Image', icon: Image, run: () => open('image') },
    { label: 'Gallery', icon: Images, run: () => open('gallery') },
    { label: 'Video', icon: Film, run: () => open('video') },
    { label: 'Callout', icon: Info, run: () => open('callout') },
    { label: 'Link card', icon: Link2, run: () => open('linkcard') },
  ];

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-2 py-1.5 dark:border-white/10 dark:bg-white/5" role="toolbar" aria-label="Formatting">
        {tools.map((t) => (
          <span key={t.label} className="contents">
            {t.sep && <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-white/10" aria-hidden />}
            <button type="button" className="btn-icon" title={t.label} aria-label={t.label} onMouseDown={(e) => e.preventDefault()} onClick={t.run}>
              <t.icon className="size-4" />
            </button>
          </span>
        ))}
        <a className="ml-auto px-2 text-xs text-slate-500 hover:underline" href="https://markdoc.dev/docs/syntax" target="_blank" rel="noreferrer">Markdoc syntax</a>
      </div>
      <CodeMirror
        ref={ref}
        value={value}
        onChange={onChange}
        extensions={extensions}
        theme={dark ? 'dark' : 'light'}
        basicSetup={{ lineNumbers: false, foldGutter: false, highlightActiveLine: false, autocompletion: false }}
        minHeight={minHeight}
        aria-label="Body"
      />
      {(problems.length > 0 || error) && (
        <div className="space-y-1 border-t border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200" role="status">
          {error && <p className="flex items-start gap-1.5"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" />{error}</p>}
          {!error && problems.map((p, i) => (
            <p key={i} className="flex items-start gap-1.5"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" />{p.line ? `Line ${p.line}: ` : ''}{p.message}</p>
          ))}
        </div>
      )}
      <InsertDialog
        kind={dialog}
        selection={selection}
        onClose={() => setDialog(null)}
        onInsert={(text) => {
          setDialog(null);
          // Let the dialog close (and focus return) before editing.
          setTimeout(() => insertBlock(text), 0);
        }}
      />
    </div>
  );
}
