/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { HomeDto } from './HomeDto';
import type { PublicAuthorDto } from './PublicAuthorDto';
import type { PublicPageDto } from './PublicPageDto';
import type { PublicPostDto } from './PublicPostDto';
import type { PublicTopicDto } from './PublicTopicDto';
import type { SiteSettingsDto } from './SiteSettingsDto';
export type ContentSnapshotDto = {
    /**
     * Same value as GET /api/public/content/version while nothing has changed
     */
    version: string;
    /**
     * Published posts whose date has come, newest first
     */
    posts: Array<PublicPostDto>;
    topics: Array<PublicTopicDto>;
    authors: Array<PublicAuthorDto>;
    pages: Array<PublicPageDto>;
    site: SiteSettingsDto;
    home: HomeDto;
};

