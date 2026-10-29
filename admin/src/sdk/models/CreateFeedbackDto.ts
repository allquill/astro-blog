/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CreateFeedbackDto = {
    /**
     * Slug of the post the feedback is about; empty = general feedback
     */
    postSlug?: string;
    /**
     * Answer to "Was this helpful?"
     */
    helpful?: boolean;
    name?: string;
    /**
     * Only needed for a reply
     */
    email?: string;
    message?: string;
    /**
     * Honeypot: must stay empty
     */
    website?: string;
};

