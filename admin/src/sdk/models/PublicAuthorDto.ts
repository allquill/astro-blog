/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PublicImageDto } from './PublicImageDto';
import type { SocialLink } from './SocialLink';
export type PublicAuthorDto = {
    slug: string;
    name: string;
    role: string;
    bio: string;
    avatar: PublicImageDto | null;
    links: Array<SocialLink>;
};

