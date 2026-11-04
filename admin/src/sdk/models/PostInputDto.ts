/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type PostInputDto = {
    title: string;
    /**
     * Defaults to the title, slugified. Locked once the post has been published.
     */
    slug?: string;
    excerpt: string;
    /**
     * Markdoc
     */
    body: string;
    /**
     * ISO date or date-time; required to publish
     */
    publishedDate: string | null;
    updatedDate: string | null;
    /**
     * Author slug
     */
    author: string;
    topics: Array<string>;
    tags: Array<string>;
    /**
     * Media id
     */
    coverId: string | null;
    coverAlt: string;
    series: string;
    featured: boolean;
    /**
     * Empty, or the original URL when the post was first published elsewhere
     */
    canonicalUrl: string;
    /**
     * Empty, or an https link to the code behind the post (e.g. a GitHub repository)
     */
    repositoryUrl: string;
    /**
     * Empty, or the title for search results and share cards (about 60 characters)
     */
    seoTitle?: string;
    /**
     * Empty, or the description for search results and share cards (about 155 characters)
     */
    seoDescription?: string;
    /**
     * Keep the post out of search engines and the sitemap
     */
    noindex?: boolean;
};

