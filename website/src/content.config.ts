import { defineCollection, reference } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { z } from 'astro/zod';
import { load as loadYaml } from 'js-yaml';
import { CONTENT_ICONS } from './lib/icons';
import { ACCENTS } from './lib/accents';
import { DEFAULT_SHARE, SHARE_NETWORK_KEYS, SOCIAL_NETWORK_KEYS } from './lib/share';

// Mirrors keystatic.config.ts. Keystatic omits empty optional fields, hence the defaults.
// Icons, accents and networks are validated against the same lists the CMS offers, so a hand-edited
// value that Keystatic would reject fails the build instead.

const link = z.object({ label: z.string(), href: z.string() });
const social = z.object({ network: z.enum(SOCIAL_NETWORK_KEYS), url: z.url() });

const posts = defineCollection({
  loader: glob({ pattern: '*.mdoc', base: './src/content/posts' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      excerpt: z.string().default(''),
      publishedDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      // reference() fails the build if a post names an author or topic that doesn't exist.
      author: reference('authors'),
      topics: z.array(reference('topics')).default([]),
      tags: z.array(z.string()).default([]),
      cover: image().nullish(),
      coverAlt: z.string().default(''),
      series: z.string().default(''),
      featured: z.boolean().default(false),
      draft: z.boolean().default(false),
      canonicalUrl: z.url().nullish(),
    }),
});

const topics = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/topics' }),
  schema: z.object({
    name: z.string(),
    description: z.string().default(''),
    icon: z.enum(CONTENT_ICONS).default('book'),
    accent: z.enum(Object.keys(ACCENTS) as [keyof typeof ACCENTS]).default('teal'),
    order: z.number().default(10),
  }),
});

const authors = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/authors' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      role: z.string().default(''),
      bio: z.string().default(''),
      avatar: image().nullish(),
      links: z.array(social).default([]),
    }),
});

const pages = defineCollection({
  loader: glob({ pattern: '*.mdoc', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string().default(''),
    updatedDate: z.coerce.date().optional(),
    showInFooter: z.boolean().default(true),
    showInHeader: z.boolean().default(false),
  }),
});

// Singletons: one YAML file each, exposed as a single entry with id "default".
const singletonFile = (path: string) =>
  file(path, { parser: (text) => ({ default: (loadYaml(text) ?? {}) as Record<string, unknown> }) });

const settings = defineCollection({
  loader: singletonFile('./src/content/settings.yaml'),
  schema: z.object({
    siteName: z.string(),
    tagline: z.string().default(''),
    description: z.string().default(''),
    publisher: z.string().default(''),
    email: z.string().default(''),
    social: z.array(social).default([]),
    nav: z.array(link).default([]),
    footerLinks: z.array(link).default([]),
    shareNetworks: z.array(z.enum(SHARE_NETWORK_KEYS)).default(DEFAULT_SHARE),
    subscribeTitle: z.string().default('Get new posts by e-mail'),
    subscribeText: z.string().default(''),
    postsPerPage: z.number().int().min(3).max(48).default(12),
    indexNowKey: z
      .string()
      .regex(/^([A-Za-z0-9-]{8,128})?$/, 'IndexNow key: 8–128 letters, digits or dashes')
      .default(''),
  }),
});

const home = defineCollection({
  loader: singletonFile('./src/content/home.yaml'),
  schema: z.object({
    eyebrow: z.string().default(''),
    heroTitle: z.string(),
    heroSubtitle: z.string().default(''),
    latestTitle: z.string().default('Latest posts'),
    topicsTitle: z.string().default('Browse by topic'),
  }),
});

export const collections = { posts, topics, authors, pages, settings, home };
