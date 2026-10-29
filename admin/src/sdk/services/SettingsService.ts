/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SettingsDto } from '../models/SettingsDto';
import type { UpdateSettingsDto } from '../models/UpdateSettingsDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class SettingsService {
    /**
     * @returns SettingsDto
     * @throws ApiError
     */
    public static settingsControllerGet(): CancelablePromise<SettingsDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/settings',
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
    /**
     * @returns SettingsDto
     * @throws ApiError
     */
    public static settingsControllerUpdate({
        requestBody,
    }: {
        requestBody: UpdateSettingsDto,
    }): CancelablePromise<SettingsDto> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/admin/settings',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Not signed in`,
                403: `Signed in, but the role may not do this`,
            },
        });
    }
}
