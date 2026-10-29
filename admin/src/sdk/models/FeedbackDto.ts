/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type FeedbackDto = {
    id: number;
    kind: 'post' | 'general';
    postSlug: string | null;
    helpful: boolean | null;
    name: string;
    email: string;
    message: string;
    status: 'new' | 'read' | 'archived' | 'spam';
    reply: string;
    repliedAt: number | null;
    repliedBy: string;
    createdAt: string;
    updatedAt: string;
    /**
     * Title of the post, from the site feed
     */
    postTitle?: string | null;
    postUrl?: string | null;
};

