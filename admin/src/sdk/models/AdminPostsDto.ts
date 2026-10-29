/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AdminPostDto } from './AdminPostDto';
import type { AdminTopicDto } from './AdminTopicDto';
export type AdminPostsDto = {
    feedUnavailable: boolean;
    feedUrl: string;
    data: Array<AdminPostDto>;
    /**
     * Topics from the site feed
     */
    topics: Array<AdminTopicDto>;
};

