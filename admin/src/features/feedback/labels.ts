import type { FeedbackDto } from '@/sdk';
import type { Tone } from '@/shared/ui';

export type FeedbackStatus = FeedbackDto['status'];
export const FEEDBACK_STATUSES: FeedbackStatus[] = ['new', 'read', 'archived', 'spam'];
export const STATUS_TONE: Record<FeedbackStatus, Tone> = { new: 'brand', read: 'slate', archived: 'slate', spam: 'rose' };

export const helpfulLabel = (h: boolean | null) => (h === null ? null : h ? '👍 Helpful' : '👎 Not helpful');
