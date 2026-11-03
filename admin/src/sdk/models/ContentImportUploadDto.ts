/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ContentImportUploadDto = {
    /**
     * .zip export or a single .md
     */
    file: Blob;
    /**
     * JSON array of the archive paths (`source` from a dry run) to import; leave it out to import everything
     */
    only?: string;
};

