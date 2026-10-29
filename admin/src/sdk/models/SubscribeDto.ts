/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type SubscribeDto = {
    email: string;
    name?: string;
    /**
     * Topic slugs; empty = all topics
     */
    topics?: Array<string>;
    /**
     * Page the form was on
     */
    source?: string;
    /**
     * Honeypot: must stay empty
     */
    website?: string;
};

