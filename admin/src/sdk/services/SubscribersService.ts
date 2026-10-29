/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ImportResultDto } from '../models/ImportResultDto';
import type { ImportSubscribersDto } from '../models/ImportSubscribersDto';
import type { OkDto } from '../models/OkDto';
import type { SubscriberCountsDto } from '../models/SubscriberCountsDto';
import type { SubscriberDto } from '../models/SubscriberDto';
import type { SubscriberPageDto } from '../models/SubscriberPageDto';
import type { UpdateSubscriberDto } from '../models/UpdateSubscriberDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class SubscribersService {
    /**
     * @returns SubscriberPageDto
     * @throws ApiError
     */
    public static adminSubscribersControllerList({
        q,
        status,
        topic,
        page = 1,
        pageSize = 50,
    }: {
        /**
         * Search e-mail and name
         */
        q?: string,
        status?: 'pending' | 'active' | 'unsubscribed' | 'bounced',
        /**
         * Topic slug (subscribers to all topics match too)
         */
        topic?: string,
        page?: number,
        pageSize?: number,
    }): CancelablePromise<SubscriberPageDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/subscribers',
            query: {
                'q': q,
                'status': status,
                'topic': topic,
                'page': page,
                'pageSize': pageSize,
            },
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns SubscriberCountsDto
     * @throws ApiError
     */
    public static adminSubscribersControllerCounts(): CancelablePromise<SubscriberCountsDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/subscribers/counts',
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns string
     * @throws ApiError
     */
    public static adminSubscribersControllerCsv({
        q,
        status,
        topic,
    }: {
        /**
         * Search e-mail and name
         */
        q?: string,
        status?: 'pending' | 'active' | 'unsubscribed' | 'bounced',
        /**
         * Topic slug (subscribers to all topics match too)
         */
        topic?: string,
    }): CancelablePromise<string> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/subscribers/export.csv',
            query: {
                'q': q,
                'status': status,
                'topic': topic,
            },
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns ImportResultDto
     * @throws ApiError
     */
    public static adminSubscribersControllerImport({
        requestBody,
    }: {
        requestBody: ImportSubscribersDto,
    }): CancelablePromise<ImportResultDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/admin/subscribers/import',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns SubscriberDto
     * @throws ApiError
     */
    public static adminSubscribersControllerUpdate({
        id,
        requestBody,
    }: {
        id: number,
        requestBody: UpdateSubscriberDto,
    }): CancelablePromise<SubscriberDto> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/admin/subscribers/{id}',
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
    public static adminSubscribersControllerRemove({
        id,
    }: {
        id: number,
    }): CancelablePromise<OkDto> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/admin/subscribers/{id}',
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
     * @returns OkDto
     * @throws ApiError
     */
    public static adminSubscribersControllerResend({
        id,
    }: {
        id: number,
    }): CancelablePromise<OkDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/admin/subscribers/{id}/resend-confirm',
            path: {
                'id': id,
            },
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
}
