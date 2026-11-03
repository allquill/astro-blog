/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type FetchedCodeDto = {
    content: string;
    /**
     * Guessed from the file extension; empty when unknown
     */
    language: string;
    /**
     * File name, for the code block title
     */
    title: string;
    /**
     * The link to show as "View source"
     */
    source: string;
    fromLine: number | null;
    toLine: number | null;
};

