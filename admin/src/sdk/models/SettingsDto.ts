/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type SettingsDto = {
    /**
     * Blog name used in e-mail subjects and signatures
     */
    blogName: string;
    /**
     * Who is e-mailed about new feedback (and new subscribers, when on)
     */
    notifyTo: Array<string>;
    /**
     * E-mail the notify list when feedback with a message arrives
     */
    notifyOnFeedback: boolean;
    /**
     * E-mail the notify list when someone confirms a subscription
     */
    notifyOnSubscribe: boolean;
    /**
     * Thank readers who leave an e-mail address with their feedback
     */
    acknowledgeFeedback: boolean;
    /**
     * Send a welcome e-mail once a subscription is confirmed
     */
    sendWelcome: boolean;
    /**
     * Appended to every e-mail to readers
     */
    signature: string;
    /**
     * Shown at the bottom of every digest, above the unsubscribe link (e.g. your postal address)
     */
    digestFooter: string;
};

