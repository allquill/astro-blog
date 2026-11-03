/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type PostSummaryDto = {
    id: number;
    slug: string;
    title: string;
    /**
     * scheduled = published with a future date
     */
    status: 'draft' | 'published' | 'scheduled';
    publishedDate: number | null;
    author: string;
    topics: Array<string>;
    tags: Array<string>;
    coverId: string | null;
    featured: boolean;
    slugLocked: boolean;
    url: string;
    updatedAt: string;
    updatedBy: string;
    likes: number;
    shares: number;
    messages: number;
};

