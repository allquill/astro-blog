/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TopicOptionDto } from './TopicOptionDto';
export type SubscriptionDto = {
    ok: boolean;
    email: string;
    name: string;
    status: 'pending' | 'active' | 'unsubscribed' | 'bounced';
    topics: Array<string>;
    allTopics: Array<TopicOptionDto>;
};

