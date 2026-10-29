/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CountDto } from './CountDto';
import type { FeedbackCountsDto } from './FeedbackCountsDto';
import type { SubscriberCountsDto } from './SubscriberCountsDto';
import type { TopPostDto } from './TopPostDto';
export type DashboardDto = {
    /**
     * Published posts in the site feed
     */
    posts: number;
    /**
     * True when the API could not read the site feed (titles are missing)
     */
    feedUnavailable: boolean;
    likes: number;
    shares: number;
    subscribers: SubscriberCountsDto;
    feedback: FeedbackCountsDto;
    /**
     * Confirmed subscriptions per week, last 12 weeks (key = Monday, YYYY-MM-DD)
     */
    subscribersPerWeek: Array<CountDto>;
    /**
     * Likes per day, last 30 days
     */
    likesPerDay: Array<CountDto>;
    /**
     * Feedback per day, last 30 days
     */
    feedbackPerDay: Array<CountDto>;
    /**
     * Share clicks by network, all time
     */
    sharesByNetwork: Array<CountDto>;
    topPosts: Array<TopPostDto>;
};

