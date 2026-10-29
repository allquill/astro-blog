/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AssignableUserDto } from '../models/AssignableUserDto';
import type { InviteUserDto } from '../models/InviteUserDto';
import type { OkDto } from '../models/OkDto';
import type { UpdateUserDto } from '../models/UpdateUserDto';
import type { UserDto } from '../models/UserDto';
import type { UserLinkDto } from '../models/UserLinkDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class UsersService {
    /**
     * @returns AssignableUserDto
     * @throws ApiError
     */
    public static usersControllerAssignable(): CancelablePromise<Array<AssignableUserDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/users/assignable',
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns UserDto
     * @throws ApiError
     */
    public static usersControllerList(): CancelablePromise<Array<UserDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/users',
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns UserLinkDto
     * @throws ApiError
     */
    public static usersControllerInvite({
        requestBody,
    }: {
        requestBody: InviteUserDto,
    }): CancelablePromise<UserLinkDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/admin/users',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns UserDto
     * @throws ApiError
     */
    public static usersControllerUpdate({
        id,
        requestBody,
    }: {
        id: number,
        requestBody: UpdateUserDto,
    }): CancelablePromise<UserDto> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/admin/users/{id}',
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
    public static usersControllerRemove({
        id,
    }: {
        id: number,
    }): CancelablePromise<OkDto> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/admin/users/{id}',
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
     * @returns UserLinkDto
     * @throws ApiError
     */
    public static usersControllerLink({
        id,
    }: {
        id: number,
    }): CancelablePromise<UserLinkDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/admin/users/{id}/link',
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
