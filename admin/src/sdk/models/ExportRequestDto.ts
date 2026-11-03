/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ExportRequestDto = {
    /**
     * Kinds to export (default all)
     */
    include?: Array<'posts' | 'topics' | 'authors' | 'pages' | 'settings'>;
    status?: 'all' | 'published';
    /**
     * Only these post slugs (leave out for all)
     */
    posts?: Array<string>;
    /**
     * Only these page slugs (leave out for all)
     */
    pages?: Array<string>;
    /**
     * Only these topic slugs (leave out for all)
     */
    topics?: Array<string>;
    /**
     * Only these author slugs (leave out for all)
     */
    authors?: Array<string>;
    /**
     * Also export the topics and authors the exported posts use
     */
    withDependencies?: boolean;
};

