import type { DigestDto } from '@/sdk';
import type { Tone } from '@/shared/ui';

export const DIGEST_TONE: Record<DigestDto['status'], Tone> = { draft: 'slate', sending: 'amber', sent: 'emerald', failed: 'rose' };
