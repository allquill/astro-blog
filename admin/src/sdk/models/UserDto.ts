/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UserDto = {
    id: number;
    username: string;
    email?: string | null;
    role: 'admin' | 'staff';
    status: 'active' | 'invited' | 'invite expired' | 'disabled';
    /**
     * Epoch ms
     */
    lastLoginAt?: number | null;
    /**
     * Epoch ms
     */
    inviteExpiresAt?: number | null;
    createdAt: string;
};

