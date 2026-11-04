/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { NavLinkDto } from './NavLinkDto';
import type { SocialLinkInput } from './SocialLinkInput';
export type SiteSettingsDto = {
    siteName: string;
    tagline: string;
    /**
     * Meta description of the home page
     */
    description: string;
    /**
     * Organisation named as publisher in structured data
     */
    publisher: string;
    email: string;
    social: Array<SocialLinkInput>;
    nav: Array<NavLinkDto>;
    footerLinks: Array<NavLinkDto>;
    shareNetworks: Array<'x' | 'linkedin' | 'facebook' | 'reddit' | 'hackernews' | 'bluesky' | 'mastodon' | 'whatsapp' | 'email'>;
    subscribeTitle: string;
    subscribeText: string;
    postsPerPage: number;
    /**
     * IndexNow key: 8–128 letters, digits or dashes, or empty
     */
    indexNowKey: string;
    /**
     * Google Search Console verification: the content of its google-site-verification meta tag, or empty
     */
    googleSiteVerification?: string;
    /**
     * Bing Webmaster Tools verification: the content of its msvalidate.01 meta tag, or empty
     */
    bingSiteVerification?: string;
    /**
     * Brand colour of the site and its e-mails: a Tailwind colour family
     */
    brandColor: 'red' | 'orange' | 'amber' | 'yellow' | 'lime' | 'green' | 'emerald' | 'teal' | 'cyan' | 'sky' | 'blue' | 'indigo' | 'violet' | 'purple' | 'fuchsia' | 'pink' | 'rose' | 'slate' | 'gray' | 'zinc' | 'neutral' | 'stone';
};

