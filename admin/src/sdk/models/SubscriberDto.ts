/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type SubscriberDto = {
    id: number;
    email: string;
    name: string;
    status: 'pending' | 'active' | 'unsubscribed' | 'bounced';
    topics: Array<string>;
    source: string;
    confirmedAt: number | null;
    unsubscribedAt: number | null;
    createdAt: string;
};

