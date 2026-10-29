/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { UserDto } from './UserDto';
export type UserLinkDto = {
    user: UserDto;
    /**
     * The invite / reset link, to copy if the e-mail did not arrive
     */
    link: string;
    /**
     * Why the e-mail could not be sent
     */
    mailError?: string | null;
};

