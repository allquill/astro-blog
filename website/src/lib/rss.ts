import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { siteUrl } from './content';
import { authorOf, getSettings, getTopics, topicsOf, type Post } from './site';

/** RSS 2.0 for a list of posts (site-wide, or one topic). */
export async function postsRss(_context: APIContext, posts: Post[], title?: string, description?: string) {
  const settings = await getSettings();
  const topics = await getTopics();
  const items = await Promise.all(
    posts.map(async (post) => {
      const author = await authorOf(post);
      return {
        title: post.data.title,
        description: post.data.excerpt,
        pubDate: post.data.publishedDate,
        customData: `<dc:creator><![CDATA[${author.data.name.replace(/]]>/g, ']]&gt;')}]]></dc:creator>`,
        categories: [...topicsOf(post, topics).map((t) => t.data.name), ...post.data.tags],
        link: `/blog/${post.id}/`,
      };
    }),
  );
  return rss({
    title: title ?? settings.siteName,
    description: description ?? settings.description,
    site: siteUrl,
    xmlns: { dc: 'http://purl.org/dc/elements/1.1/' },
    items,
  });
}
