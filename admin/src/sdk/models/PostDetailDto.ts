/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Media } from './Media';
export type PostDetailDto = {
    id: number;
    slug: string;
    title: string;
    excerpt: string;
    body: string;
    status: 'draft' | 'published';
    publishedDate: number | null;
    updatedDate: number | null;
    firstPublishedAt: number | null;
    authorSlug: string;
    topics: Array<string>;
    tags: Array<string>;
    coverId: string | null;
    coverAlt: string;
    series: string;
    featured: boolean;
    canonicalUrl: string;
    /**
     * Empty, or an https link to the code behind the post (e.g. a GitHub repository)
     */
    repositoryUrl: string;
    updatedBy: string;
    createdAt: string;
    updatedAt: string;
    slugLocked: boolean;
    url: string;
    cover: Media | null;
};

