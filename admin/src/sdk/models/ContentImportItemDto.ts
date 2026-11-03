/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ContentImportItemDto = {
    kind: 'topic' | 'author' | 'post' | 'page' | 'site' | 'home';
    slug: string;
    /**
     * Path inside the archive
     */
    source: string;
    action: 'create' | 'update' | 'skip' | 'error';
    messages: Array<string>;
};

