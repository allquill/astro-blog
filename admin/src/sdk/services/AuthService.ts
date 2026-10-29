/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AcceptInviteDto } from '../models/AcceptInviteDto';
import type { ChangePasswordDto } from '../models/ChangePasswordDto';
import type { InviteInfoDto } from '../models/InviteInfoDto';
import type { LoginDto } from '../models/LoginDto';
import type { MeDto } from '../models/MeDto';
import type { OkDto } from '../models/OkDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AuthService {
    /**
     * @returns MeDto
     * @throws ApiError
     */
    public static authControllerLogin({
        requestBody,
    }: {
        requestBody: LoginDto,
    }): CancelablePromise<MeDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth/login',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                429: `Too many attempts; try again in 15 minutes`,
            },
        });
    }
    /**
     * @returns OkDto
     * @throws ApiError
     */
    public static authControllerLogout(): CancelablePromise<OkDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth/logout',
        });
    }
    /**
     * @returns MeDto
     * @throws ApiError
     */
    public static authControllerMe(): CancelablePromise<MeDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/auth/me',
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
    public static authControllerChangePassword({
        requestBody,
    }: {
        requestBody: ChangePasswordDto,
    }): CancelablePromise<OkDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth/password',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns InviteInfoDto
     * @throws ApiError
     */
    public static authControllerInviteInfo({
        token,
    }: {
        token: string,
    }): CancelablePromise<InviteInfoDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/auth/invite',
            query: {
                'token': token,
            },
        });
    }
    /**
     * @returns MeDto
     * @throws ApiError
     */
    public static authControllerAcceptInvite({
        requestBody,
    }: {
        requestBody: AcceptInviteDto,
    }): CancelablePromise<MeDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth/invite',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
