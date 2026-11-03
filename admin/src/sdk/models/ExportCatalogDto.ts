/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ExportNamedItemDto } from './ExportNamedItemDto';
import type { ExportPageItemDto } from './ExportPageItemDto';
import type { ExportPostItemDto } from './ExportPostItemDto';
export type ExportCatalogDto = {
    posts: Array<ExportPostItemDto>;
    pages: Array<ExportPageItemDto>;
    topics: Array<ExportNamedItemDto>;
    authors: Array<ExportNamedItemDto>;
};

