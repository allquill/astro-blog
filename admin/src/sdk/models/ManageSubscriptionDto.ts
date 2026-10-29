/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ManageSubscriptionDto = {
    token: string;
    action: 'update' | 'unsubscribe' | 'resubscribe';
    topics?: Array<string>;
    name?: string;
};

