export { linkWalletSchema, unlinkWalletSchema } from '@qyou/shared';
import type { z } from 'zod';
import type { linkWalletSchema, unlinkWalletSchema } from '@qyou/shared';

export type LinkWalletInputType = z.infer<typeof linkWalletSchema>;
export type UnlinkWalletInputType = z.infer<typeof unlinkWalletSchema>;
