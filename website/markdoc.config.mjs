import { component, defineMarkdocConfig, nodes } from '@astrojs/markdoc/config';

// How post and page bodies render. The tags match the blocks offered in Keystatic
// (keystatic.config.ts → bodyComponents); keep the two in step.
export default defineMarkdocConfig({
  nodes: {
    // Images inside bodies are optimised into responsive WebP sizes instead of one full-size file.
    image: {
      ...nodes.image,
      render: component('./src/components/MarkdocImage.astro'),
    },
    // ```ts {% title="app.ts" highlight="2,4-6" %} — Shiki highlighting at build time, light and dark.
    // Keystatic edits title and highlight on the code block itself (keystatic.config.ts → codeBlock).
    fence: {
      // content and language are passed to the component as props (Markdoc's defaults don't render them).
      attributes: {
        ...nodes.fence.attributes,
        content: { type: String, required: true },
        language: { type: String },
        title: { type: String },
        highlight: { type: String },
      },
      render: component('./src/components/content/CodeBlock.astro'),
    },
  },
  tags: {
    video: {
      selfClosing: true,
      attributes: {
        provider: { type: String, default: 'youtube', matches: ['youtube', 'vimeo', 'file'] },
        id: { type: String, required: true },
        title: { type: String, default: '' },
        start: { type: Number, default: 0 },
      },
      render: component('./src/components/content/Video.astro'),
    },
    callout: {
      attributes: {
        type: { type: String, default: 'note', matches: ['note', 'tip', 'warning', 'danger'] },
        title: { type: String, default: '' },
      },
      render: component('./src/components/content/Callout.astro'),
    },
    gallery: {
      selfClosing: true,
      attributes: {
        images: { type: Array, default: [] },
        columns: { type: String, default: '2', matches: ['2', '3'] },
      },
      render: component('./src/components/content/Gallery.astro'),
    },
    linkcard: {
      selfClosing: true,
      attributes: {
        url: { type: String, required: true },
        title: { type: String, default: '' },
        description: { type: String, default: '' },
      },
      render: component('./src/components/content/LinkCard.astro'),
    },
  },
});
