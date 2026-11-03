// Post and page bodies are Markdoc (Markdown plus the tags below), stored by the API and rendered here
// on request. The schema must match server/src/content/markdoc-schema.ts (which validates bodies on
// save) and the admin editor's insert dialogs (admin/src/features/content/editor/). Tags render the
// components in components/content/ through components/MarkdocContent.astro.
import Markdoc, { type Config, type Node, type RenderableTreeNode, type Schema } from '@markdoc/markdoc';

// A CommonJS package: named runtime exports only through the default export.
const { Tag } = Markdoc;

const tags: Record<string, Schema> = {
  video: {
    render: 'Video',
    selfClosing: true,
    attributes: {
      provider: { type: String, default: 'youtube', matches: ['youtube', 'vimeo', 'file'] },
      id: { type: String, required: true },
      title: { type: String, default: '' },
      start: { type: Number, default: 0 },
    },
  },
  callout: {
    render: 'Callout',
    attributes: {
      type: { type: String, default: 'note', matches: ['note', 'tip', 'warning', 'danger'] },
      title: { type: String, default: '' },
    },
  },
  gallery: {
    render: 'Gallery',
    selfClosing: true,
    attributes: {
      images: { type: Array, default: [] },
      columns: { type: String, default: '2', matches: ['2', '3'] },
    },
  },
  linkcard: {
    render: 'LinkCard',
    selfClosing: true,
    attributes: {
      url: { type: String, required: true },
      title: { type: String, default: '' },
      description: { type: String, default: '' },
    },
  },
};

const nodes: Record<string, Schema> = {
  // ```ts {% title="app.ts" highlight="2,4-6" source="https://github.com/…#L10-L20" %}
  fence: {
    render: 'CodeBlock',
    attributes: {
      content: { type: String, required: true },
      language: { type: String },
      title: { type: String },
      highlight: { type: String },
      source: { type: String },
    },
    transform(node, config) {
      return new Tag('CodeBlock', node.transformAttributes(config), []);
    },
  },
  image: {
    render: 'MarkdocImage',
    attributes: { src: { type: String, required: true }, alt: { type: String }, title: { type: String } },
  },
};

const config: Config = { tags, nodes };

export type Heading = { depth: number; slug: string; text: string };

/** Heading ids as GitHub (and Astro's Markdown) make them: "Hello, World!" → "hello-world". */
function slugger() {
  const seen = new Map<string, number>();
  return (text: string) => {
    const base = text.toLowerCase().trim().replace(/[^\p{L}\p{M}\p{N}\p{Pc}\- ]/gu, '').replace(/ /g, '-');
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return n ? `${base}-${n}` : base;
  };
}

const textOf = (n: RenderableTreeNode): string =>
  typeof n === 'string' ? n : Tag.isTag(n) ? n.children.map(textOf).join('') : Array.isArray(n) ? n.map(textOf).join('') : '';

/** Gives h1–h6 an id (for links and the table of contents) and lists h2/h3. */
function headingsOf(tree: RenderableTreeNode) {
  const slug = slugger();
  const out: Heading[] = [];
  const walk = (n: RenderableTreeNode) => {
    if (Array.isArray(n)) return n.forEach(walk);
    if (!Tag.isTag(n)) return;
    const m = /^h([1-6])$/.exec(n.name);
    if (m) {
      const text = textOf(n).trim();
      n.attributes.id ??= slug(text);
      out.push({ depth: Number(m[1]), slug: String(n.attributes.id), text });
    }
    n.children.forEach(walk);
  };
  walk(tree);
  return out;
}

const cache = new Map<string, { tree: RenderableTreeNode; headings: Heading[] }>();
const MAX_CACHED = 500;

/**
 * Parses and transforms a body (cached by `key`, which should change with every edit). A body that
 * fails validation still renders; the API rejects invalid bodies on save, so this is only a guard.
 */
export function renderMarkdoc(body: string, key: string) {
  const hit = cache.get(key);
  if (hit) return hit;
  const ast: Node = Markdoc.parse(body);
  const tree = Markdoc.transform(ast, config);
  const result = { tree, headings: headingsOf(tree) };
  if (cache.size >= MAX_CACHED) cache.delete(cache.keys().next().value!);
  cache.set(key, result);
  return result;
}
