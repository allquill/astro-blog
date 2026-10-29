import { config, collection, singleton, fields } from '@keystatic/core';
import { block, wrapper } from '@keystatic/core/content-components';
import { CONTENT_ICONS } from './src/lib/icons';
import { ACCENTS } from './src/lib/accents';
import { DEFAULT_SHARE, SHARE_NETWORKS, SOCIAL_NETWORKS } from './src/lib/share';

// Content editing for the blog (at /keystatic under `pnpm run dev`). Keep this file and
// src/content.config.ts in step; the custom blocks below are rendered by markdoc.config.mjs.
//
// Storage: local files by default. PUBLIC_KEYSTATIC_GITHUB_REPO=owner/name (website/.env) makes Keystatic
// commit to that GitHub repository instead, so authors can publish from a hosted Keystatic
// (docs/content-guide.md). PUBLIC_, because this file also runs in the editor's browser bundle.

const githubRepo = import.meta.env.PUBLIC_KEYSTATIC_GITHUB_REPO as `${string}/${string}` | undefined;
const storage = githubRepo ? { kind: 'github' as const, repo: githubRepo } : { kind: 'local' as const };

const iconField = (label = 'Icon') =>
  fields.select({ label, options: CONTENT_ICONS.map((value) => ({ label: value, value })), defaultValue: 'book' });
const linkList = (label: string) =>
  fields.array(
    fields.object({
      label: fields.text({ label: 'Label' }),
      href: fields.text({ label: 'URL', description: 'e.g. /about or https://…' }),
    }),
    { label, itemLabel: (p) => p.fields.label.value || 'Link' },
  );
const socialLinks = (label: string) =>
  fields.array(
    fields.object({
      network: fields.select({ label: 'Network', options: Object.entries(SOCIAL_NETWORKS).map(([value, n]) => ({ label: n.label, value })), defaultValue: 'github' }),
      url: fields.url({ label: 'URL' }),
    }),
    { label, itemLabel: (p) => p.fields.network.value },
  );

/** Blocks authors can insert in a post or page body (the "+" menu of the editor). */
const bodyComponents = {
  video: block({
    label: 'Video',
    description: 'YouTube or Vimeo (loaded only when the reader clicks play), or a video file',
    schema: {
      provider: fields.select({
        label: 'Source',
        options: [
          { label: 'YouTube', value: 'youtube' },
          { label: 'Vimeo', value: 'vimeo' },
          { label: 'Video file (URL)', value: 'file' },
        ],
        defaultValue: 'youtube',
      }),
      id: fields.text({ label: 'Video ID or link', description: 'e.g. dQw4w9WgXcQ or https://youtu.be/… · a full URL for a file' }),
      title: fields.text({ label: 'Title', description: 'For screen readers and the play button' }),
      start: fields.integer({ label: 'Start at (seconds)', defaultValue: 0 }),
    },
  }),
  callout: wrapper({
    label: 'Callout',
    description: 'A highlighted note, tip or warning',
    schema: {
      type: fields.select({
        label: 'Type',
        options: [
          { label: 'Note', value: 'note' },
          { label: 'Tip', value: 'tip' },
          { label: 'Warning', value: 'warning' },
          { label: 'Danger', value: 'danger' },
        ],
        defaultValue: 'note',
      }),
      title: fields.text({ label: 'Title (optional)' }),
    },
  }),
  gallery: block({
    label: 'Image gallery',
    description: 'A grid of images that open full size',
    schema: {
      images: fields.array(
        fields.object({
          src: fields.image({ label: 'Image', directory: 'public/images/gallery', publicPath: '/images/gallery/' }),
          alt: fields.text({ label: 'Alt text' }),
          caption: fields.text({ label: 'Caption' }),
        }),
        { label: 'Images', itemLabel: (p) => p.fields.alt.value || 'Image' },
      ),
      columns: fields.select({
        label: 'Columns',
        options: [{ label: '2', value: '2' }, { label: '3', value: '3' }],
        defaultValue: '2',
      }),
    },
  }),
  linkcard: block({
    label: 'Link card',
    description: 'A highlighted link to another page or site',
    schema: {
      url: fields.url({ label: 'URL', validation: { isRequired: true } }),
      title: fields.text({ label: 'Title' }),
      description: fields.text({ label: 'Description', multiline: true }),
    },
  }),
};

const bodyField = (label: string, imageDir: string) =>
  fields.markdoc({
    label,
    extension: 'mdoc',
    options: {
      image: { directory: `src/assets/${imageDir}`, publicPath: `../../assets/${imageDir}/` },
      // Saved as fence annotations: ```ts {% title="app.ts" highlight="2,4-6" %} (markdoc.config.mjs).
      codeBlock: {
        schema: {
          title: fields.text({ label: 'Title', description: 'e.g. a file name: src/app.ts' }),
          highlight: fields.text({ label: 'Highlight lines', description: 'e.g. 2,4-6' }),
        },
      },
    },
    components: bodyComponents,
  });

export default config({
  storage,
  ui: {
    brand: { name: 'Blog' },
    navigation: {
      Content: ['posts', 'topics', 'authors', 'pages'],
      Settings: ['home', 'settings'],
    },
  },
  collections: {
    posts: collection({
      label: 'Posts',
      slugField: 'title',
      path: 'src/content/posts/*',
      format: { contentField: 'body' },
      entryLayout: 'content',
      columns: ['title', 'publishedDate'],
      previewUrl: '/blog/{slug}/',
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        excerpt: fields.text({ label: 'Excerpt', multiline: true, description: 'Shown on cards, in search results and in the new-post e-mail' }),
        publishedDate: fields.date({ label: 'Published', defaultValue: { kind: 'today' }, validation: { isRequired: true } }),
        updatedDate: fields.date({ label: 'Last updated' }),
        author: fields.relationship({ label: 'Author', collection: 'authors', validation: { isRequired: true } }),
        topics: fields.array(fields.relationship({ label: 'Topic', collection: 'topics' }), {
          label: 'Topics',
          description: 'Subscribers who follow one of these topics get the new-post e-mail',
          itemLabel: (p) => p.value ?? 'Topic',
        }),
        tags: fields.array(fields.text({ label: 'Tag' }), { label: 'Tags', itemLabel: (p) => p.value }),
        cover: fields.image({ label: 'Cover image', directory: 'src/assets/posts', publicPath: '../../assets/posts/' }),
        coverAlt: fields.text({ label: 'Cover alt text' }),
        series: fields.text({ label: 'Series (optional)', description: 'Posts with the same series name link to each other, oldest first' }),
        featured: fields.checkbox({ label: 'Featured', description: 'Shown large at the top of the home page', defaultValue: false }),
        draft: fields.checkbox({ label: 'Draft', description: 'Drafts are left out of production builds', defaultValue: false }),
        canonicalUrl: fields.url({ label: 'Canonical URL (optional)', description: 'Only when this post was first published elsewhere' }),
        body: bodyField('Body', 'posts'),
      },
    }),
    topics: collection({
      label: 'Topics',
      slugField: 'name',
      path: 'src/content/topics/*',
      format: 'yaml',
      columns: ['name', 'order'],
      schema: {
        name: fields.slug({ name: { label: 'Name' }, slug: { label: 'Slug', description: 'Part of the URL (/topics/<slug>/) and of subscribers\' preferences: avoid changing it' } }),
        description: fields.text({ label: 'Description', multiline: true }),
        icon: iconField(),
        accent: fields.select({
          label: 'Accent colour',
          options: Object.entries(ACCENTS).map(([value, a]) => ({ label: a.label, value })),
          defaultValue: 'teal',
        }),
        order: fields.integer({ label: 'Order', defaultValue: 10 }),
      },
    }),
    authors: collection({
      label: 'Authors',
      slugField: 'name',
      path: 'src/content/authors/*',
      format: 'yaml',
      schema: {
        name: fields.slug({ name: { label: 'Name' } }),
        role: fields.text({ label: 'Role', description: 'e.g. Staff engineer' }),
        bio: fields.text({ label: 'Bio', multiline: true }),
        avatar: fields.image({ label: 'Photo', directory: 'src/assets/authors', publicPath: '../../assets/authors/' }),
        links: socialLinks('Profiles'),
      },
    }),
    pages: collection({
      label: 'Pages',
      slugField: 'title',
      path: 'src/content/pages/*',
      format: { contentField: 'body' },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        description: fields.text({ label: 'Description', multiline: true }),
        updatedDate: fields.date({ label: 'Last updated' }),
        showInFooter: fields.checkbox({ label: 'Show in footer', defaultValue: true }),
        showInHeader: fields.checkbox({ label: 'Show in header', defaultValue: false }),
        body: bodyField('Body', 'pages'),
      },
    }),
  },
  singletons: {
    settings: singleton({
      label: 'Site settings',
      path: 'src/content/settings',
      format: 'yaml',
      schema: {
        siteName: fields.text({ label: 'Blog name' }),
        tagline: fields.text({ label: 'Tagline', description: 'One line next to the name, e.g. "Notes on building for the web"' }),
        description: fields.text({ label: 'Description', multiline: true, description: 'Default meta description and RSS description' }),
        publisher: fields.text({ label: 'Publisher', description: 'Person or organisation behind the blog (structured data, copyright)' }),
        email: fields.text({ label: 'Contact e-mail' }),
        social: socialLinks('Social profiles'),
        nav: linkList('Extra header links'),
        footerLinks: linkList('Extra footer links'),
        shareNetworks: fields.multiselect({
          label: 'Share buttons',
          options: Object.entries(SHARE_NETWORKS).map(([value, n]) => ({ label: n.label, value })),
          defaultValue: DEFAULT_SHARE,
        }),
        subscribeTitle: fields.text({ label: 'Subscribe box title', defaultValue: 'Get new posts by e-mail' }),
        subscribeText: fields.text({ label: 'Subscribe box text', multiline: true, defaultValue: 'One e-mail per new post. Pick your topics, unsubscribe in one click.' }),
        postsPerPage: fields.integer({ label: 'Posts per page', defaultValue: 12, validation: { min: 3, max: 48 } }),
        indexNowKey: fields.text({ label: 'IndexNow key', description: '8–128 letters, digits or dashes. Empty = IndexNow off.' }),
      },
    }),
    home: singleton({
      label: 'Home page',
      path: 'src/content/home',
      format: 'yaml',
      schema: {
        eyebrow: fields.text({ label: 'Eyebrow' }),
        heroTitle: fields.text({ label: 'Hero title' }),
        heroSubtitle: fields.text({ label: 'Hero subtitle', multiline: true }),
        latestTitle: fields.text({ label: 'Latest posts title', defaultValue: 'Latest posts' }),
        topicsTitle: fields.text({ label: 'Topics title', defaultValue: 'Browse by topic' }),
      },
    }),
  },
});
