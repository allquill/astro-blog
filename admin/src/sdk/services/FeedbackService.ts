/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FeedbackCountsDto } from '../models/FeedbackCountsDto';
import type { FeedbackDto } from '../models/FeedbackDto';
import type { FeedbackPageDto } from '../models/FeedbackPageDto';
import type { OkDto } from '../models/OkDto';
import type { ReplyFeedbackDto } from '../models/ReplyFeedbackDto';
import type { UpdateFeedbackDto } from '../models/UpdateFeedbackDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class FeedbackService {
    /**
     * @returns FeedbackPageDto
     * @throws ApiError
     */
    public static adminFeedbackControllerList({
        page = 1,
        pageSize = 50,
        status,
        kind,
        post,
        q,
        withMessage,
    }: {
        page?: number,
        pageSize?: number,
        /**
         * Default: everything but archived and spam
         */
        status?: 'new' | 'read' | 'archived' | 'spam',
        kind?: 'post' | 'general',
        /**
         * Post slug
         */
        post?: string,
        /**
         * Search message, name and e-mail
         */
        q?: string,
        /**
         * Only feedback with a message (not bare votes)
         */
        withMessage?: boolean,
    }): CancelablePromise<FeedbackPageDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/feedback',
            query: {
                'page': page,
                'pageSize': pageSize,
                'status': status,
                'kind': kind,
                'post': post,
                'q': q,
                'withMessage': withMessage,
            },
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns FeedbackCountsDto
     * @throws ApiError
     */
    public static adminFeedbackControllerCounts(): CancelablePromise<FeedbackCountsDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/feedback/counts',
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns FeedbackDto
     * @throws ApiError
     */
    public static adminFeedbackControllerGet({
        id,
    }: {
        id: number,
    }): CancelablePromise<FeedbackDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/feedback/{id}',
            path: {
                'id': id,
            },
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns FeedbackDto
     * @throws ApiError
     */
    public static adminFeedbackControllerUpdate({
        id,
        requestBody,
    }: {
        id: number,
        requestBody: UpdateFeedbackDto,
    }): CancelablePromise<FeedbackDto> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/admin/feedback/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns OkDto
     * @throws ApiError
     */
    public static adminFeedbackControllerRemove({
        id,
    }: {
        id: number,
    }): CancelablePromise<OkDto> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/admin/feedback/{id}',
            path: {
                'id': id,
            },
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns FeedbackDto
     * @throws ApiError
     */
    public static adminFeedbackControllerReply({
        id,
        requestBody,
    }: {
        id: number,
        requestBody: ReplyFeedbackDto,
    }): CancelablePromise<FeedbackDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/admin/feedback/{id}/reply',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
}
