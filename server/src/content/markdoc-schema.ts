import Markdoc, { type Config, type Node, type Schema, type ValidateError } from '@markdoc/markdoc';

// The body tags the site renders (website/src/lib/markdoc.ts holds the same schema with renderers,
// and the admin editor's insert dialogs write them). Change all three together. Used here to reject a
// broken body when it is saved or imported, as a failed build did when content was files.

const tags: Record<string, Schema> = {
  video: {
    selfClosing: true,
    attributes: {
      provider: { type: String, default: 'youtube', matches: ['youtube', 'vimeo', 'file'] },
      id: { type: String, required: true },
      title: { type: String, default: '' },
      start: { type: Number, default: 0 },
    },
  },
  callout: {
    attributes: {
      type: { type: String, default: 'note', matches: ['note', 'tip', 'warning', 'danger'] },
      title: { type: String, default: '' },
    },
  },
  gallery: {
    selfClosing: true,
    attributes: {
      images: { type: Array, default: [] },
      columns: { type: String, default: '2', matches: ['2', '3'] },
    },
  },
  linkcard: {
    selfClosing: true,
    attributes: {
      url: { type: String, required: true },
      title: { type: String, default: '' },
      description: { type: String, default: '' },
    },
  },
};

const nodes: Record<string, Schema> = {
  fence: {
    ...Markdoc.nodes.fence,
    attributes: {
      ...Markdoc.nodes.fence.attributes,
      title: { type: String },
      /** "2,4-6": lines to highlight. */
      highlight: { type: String, matches: /^\s*\d+(\s*-\s*\d+)?(\s*,\s*\d+(\s*-\s*\d+)?)*\s*$/ },
      /** Where the code comes from (e.g. a GitHub file); shown as a "View source" link. */
      source: { type: String },
    },
  },
};

export const MARKDOC_CONFIG: Config = { tags, nodes };

export type BodyProblem = { line: number | null; message: string };

/** Problems that would stop the body from rendering, or [] when it is fine. */
export function validateBody(body: string): BodyProblem[] {
  const ast = Markdoc.parse(body);
  return Markdoc.validate(ast, MARKDOC_CONFIG)
    .filter((e: ValidateError) => e.error.level === 'error' || e.error.level === 'critical')
    .map((e) => ({ line: e.lines?.[0] != null ? e.lines[0] + 1 : null, message: e.error.message }));
}

/** Every image URL in a body: Markdown images and gallery entries. */
export function bodyImageUrls(body: string): string[] {
  const out = new Set<string>();
  const walk = (n: Node) => {
    if (n.type === 'image' && typeof n.attributes.src === 'string') out.add(n.attributes.src);
    if (n.type === 'tag' && n.tag === 'gallery' && Array.isArray(n.attributes.images)) {
      for (const i of n.attributes.images as { src?: unknown }[]) if (typeof i?.src === 'string') out.add(i.src);
    }
    for (const c of n.children) walk(c);
  };
  walk(Markdoc.parse(body));
  return [...out];
}
