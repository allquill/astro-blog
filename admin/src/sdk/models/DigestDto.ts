/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FeedPostDto } from './FeedPostDto';
export type DigestDto = {
    id: number;
    postSlug: string;
    subject: string;
    intro: string;
    status: 'draft' | 'sending' | 'sent' | 'failed';
    recipients: number;
    sentCount: number;
    failedCount: number;
    createdBy: string;
    startedAt: number | null;
    finishedAt: number | null;
    createdAt: string;
    updatedAt: string;
    /**
     * The post as the site feed (or the send snapshot) describes it
     */
    post: FeedPostDto | null;
};

