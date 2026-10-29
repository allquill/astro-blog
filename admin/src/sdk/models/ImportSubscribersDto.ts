/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ImportSubscribersDto = {
    /**
     * CSV text with an "email" column (and optionally "name", "topics" separated by ";")
     */
    csv: string;
    /**
     * true = add as active (you already hold their consent); false = add as pending and send each a confirm e-mail
     */
    consented: boolean;
};

