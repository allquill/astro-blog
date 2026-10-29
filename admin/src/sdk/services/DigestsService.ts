/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AudienceDto } from '../models/AudienceDto';
import type { CreateDigestDto } from '../models/CreateDigestDto';
import type { DeliveryPageDto } from '../models/DeliveryPageDto';
import type { DigestDto } from '../models/DigestDto';
import type { DigestPreviewDto } from '../models/DigestPreviewDto';
import type { OkDto } from '../models/OkDto';
import type { TestDigestDto } from '../models/TestDigestDto';
import type { UpdateDigestDto } from '../models/UpdateDigestDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DigestsService {
    /**
     * @returns DigestDto
     * @throws ApiError
     */
    public static digestsControllerList(): CancelablePromise<Array<DigestDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/digests',
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns DigestDto
     * @throws ApiError
     */
    public static digestsControllerCreate({
        requestBody,
    }: {
        requestBody: CreateDigestDto,
    }): CancelablePromise<DigestDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/admin/digests',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns AudienceDto
     * @throws ApiError
     */
    public static digestsControllerAudience({
        post,
    }: {
        /**
         * Post slug
         */
        post: string,
    }): CancelablePromise<AudienceDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/digests/audience',
            query: {
                'post': post,
            },
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns DigestDto
     * @throws ApiError
     */
    public static digestsControllerGet({
        id,
    }: {
        id: number,
    }): CancelablePromise<DigestDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/digests/{id}',
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
     * @returns DigestDto
     * @throws ApiError
     */
    public static digestsControllerUpdate({
        id,
        requestBody,
    }: {
        id: number,
        requestBody: UpdateDigestDto,
    }): CancelablePromise<DigestDto> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/admin/digests/{id}',
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
    public static digestsControllerRemove({
        id,
    }: {
        id: number,
    }): CancelablePromise<OkDto> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/admin/digests/{id}',
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
     * @returns DigestPreviewDto
     * @throws ApiError
     */
    public static digestsControllerPreview({
        id,
    }: {
        id: number,
    }): CancelablePromise<DigestPreviewDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/digests/{id}/preview',
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
    public static digestsControllerTest({
        id,
        requestBody,
    }: {
        id: number,
        requestBody: TestDigestDto,
    }): CancelablePromise<OkDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/admin/digests/{id}/test',
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
     * @returns DigestDto
     * @throws ApiError
     */
    public static digestsControllerSend({
        id,
    }: {
        id: number,
    }): CancelablePromise<DigestDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/admin/digests/{id}/send',
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
     * @returns DeliveryPageDto
     * @throws ApiError
     */
    public static digestsControllerDeliveries({
        id,
        page = 1,
        pageSize = 50,
        status,
    }: {
        id: number,
        page?: number,
        pageSize?: number,
        status?: 'pending' | 'sent' | 'failed',
    }): CancelablePromise<DeliveryPageDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/digests/{id}/deliveries',
            path: {
                'id': id,
            },
            query: {
                'page': page,
                'pageSize': pageSize,
                'status': status,
            },
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
}
