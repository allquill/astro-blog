/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type DigestDelivery = {
    id: number;
    digestId: number;
    subscriberId: number;
    email: string;
    status: 'pending' | 'sent' | 'failed';
    error: string;
    sentAt: number | null;
};

