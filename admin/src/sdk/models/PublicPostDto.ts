/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PublicImageDto } from './PublicImageDto';
export type PublicPostDto = {
    slug: string;
    title: string;
    excerpt: string;
    /**
     * Markdoc
     */
    body: string;
    publishedDate: string;
    updatedDate: string | null;
    author: string;
    topics: Array<string>;
    tags: Array<string>;
    cover: PublicImageDto | null;
    coverAlt: string;
    series: string;
    featured: boolean;
    canonicalUrl: string | null;
    /**
     * Link to the code behind the post
     */
    repositoryUrl: string | null;
    /**
     * Empty, or the title for <title> and share cards
     */
    seoTitle: string;
    /**
     * Empty, or the meta and share description
     */
    seoDescription: string;
    /**
     * Keep out of search engines and the sitemap
     */
    noindex: boolean;
    /**
     * Only true in a preview
     */
    draft: boolean;
    /**
     * Changes on every edit (render cache key)
     */
    revision: string;
};

