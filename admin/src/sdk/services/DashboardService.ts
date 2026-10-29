/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AdminPostsDto } from '../models/AdminPostsDto';
import type { DashboardDto } from '../models/DashboardDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DashboardService {
    /**
     * @returns DashboardDto
     * @throws ApiError
     */
    public static dashboardControllerGet(): CancelablePromise<DashboardDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/dashboard',
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns AdminPostsDto
     * @throws ApiError
     */
    public static dashboardControllerPosts(): CancelablePromise<AdminPostsDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/posts',
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
}
