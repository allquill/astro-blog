/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ConfirmResultDto } from '../models/ConfirmResultDto';
import type { CreateFeedbackDto } from '../models/CreateFeedbackDto';
import type { CreateFeedbackResultDto } from '../models/CreateFeedbackResultDto';
import type { FeedbackMessageDto } from '../models/FeedbackMessageDto';
import type { ManageSubscriptionDto } from '../models/ManageSubscriptionDto';
import type { OkDto } from '../models/OkDto';
import type { PostCountsDto } from '../models/PostCountsDto';
import type { PostStatsDto } from '../models/PostStatsDto';
import type { ShareDto } from '../models/ShareDto';
import type { SubscribeDto } from '../models/SubscribeDto';
import type { SubscribeResultDto } from '../models/SubscribeResultDto';
import type { SubscriptionDto } from '../models/SubscriptionDto';
import type { TokenDto } from '../models/TokenDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class PublicService {
    /**
     * Like and share counts for several posts (list pages)
     * @returns PostCountsDto
     * @throws ApiError
     */
    public static engagementControllerCounts({
        slugs,
    }: {
        /**
         * Comma-separated post slugs (up to 100)
         */
        slugs: any,
    }): CancelablePromise<Array<PostCountsDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/public/stats',
            query: {
                'slugs': slugs,
            },
        });
    }
    /**
     * @returns PostStatsDto
     * @throws ApiError
     */
    public static engagementControllerStats({
        slug,
    }: {
        slug: string,
    }): CancelablePromise<PostStatsDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/public/posts/{slug}/stats',
            path: {
                'slug': slug,
            },
        });
    }
    /**
     * @returns PostStatsDto
     * @throws ApiError
     */
    public static engagementControllerLike({
        slug,
    }: {
        slug: string,
    }): CancelablePromise<PostStatsDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/public/posts/{slug}/like',
            path: {
                'slug': slug,
            },
        });
    }
    /**
     * @returns PostStatsDto
     * @throws ApiError
     */
    public static engagementControllerUnlike({
        slug,
    }: {
        slug: string,
    }): CancelablePromise<PostStatsDto> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/public/posts/{slug}/like',
            path: {
                'slug': slug,
            },
        });
    }
    /**
     * Count a share-button click (the share itself happens on the network)
     * @returns PostStatsDto
     * @throws ApiError
     */
    public static engagementControllerShare({
        slug,
        requestBody,
    }: {
        slug: string,
        requestBody: ShareDto,
    }): CancelablePromise<PostStatsDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/public/posts/{slug}/share',
            path: {
                'slug': slug,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Subscribe (double opt-in): e-mails a confirm link. The answer never says whether the address was already on the list.
     * @returns SubscribeResultDto
     * @throws ApiError
     */
    public static publicSubscribeControllerSubscribe({
        requestBody,
    }: {
        requestBody: SubscribeDto,
    }): CancelablePromise<SubscribeResultDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/public/subscribe',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Confirm a subscription with the token from the e-mail (a POST, so link scanners cannot confirm it)
     * @returns ConfirmResultDto
     * @throws ApiError
     */
    public static publicSubscribeControllerConfirm({
        requestBody,
    }: {
        requestBody: TokenDto,
    }): CancelablePromise<ConfirmResultDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/public/subscribe/confirm',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns SubscriptionDto
     * @throws ApiError
     */
    public static publicSubscribeControllerSubscription({
        token,
    }: {
        token: string,
    }): CancelablePromise<SubscriptionDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/public/subscribe/manage',
            query: {
                'token': token,
            },
        });
    }
    /**
     * Change topics or name, unsubscribe or re-subscribe
     * @returns SubscriptionDto
     * @throws ApiError
     */
    public static publicSubscribeControllerManage({
        requestBody,
    }: {
        requestBody: ManageSubscriptionDto,
    }): CancelablePromise<SubscriptionDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/public/subscribe/manage',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns OkDto
     * @throws ApiError
     */
    public static publicSubscribeControllerOneClick({
        token,
    }: {
        token: string,
    }): CancelablePromise<OkDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/public/unsubscribe',
            query: {
                'token': token,
            },
        });
    }
    /**
     * A "was this helpful?" vote and/or a message, about a post or the blog in general
     * @returns CreateFeedbackResultDto
     * @throws ApiError
     */
    public static publicFeedbackControllerCreate({
        requestBody,
    }: {
        requestBody: CreateFeedbackDto,
    }): CancelablePromise<CreateFeedbackResultDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/public/feedback',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Add a message to the vote this visitor just sent
     * @returns OkDto
     * @throws ApiError
     */
    public static publicFeedbackControllerAttach({
        id,
        requestBody,
    }: {
        id: number,
        requestBody: FeedbackMessageDto,
    }): CancelablePromise<OkDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/public/feedback/{id}/message',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
