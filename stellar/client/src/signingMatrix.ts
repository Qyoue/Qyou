/**
 * Signing responsibility matrix for Qyou blockchain actions.
 *
 * Defines which actor signs each operation type, enforcing clear role
 * boundaries between app users, backend services, and operators.
 */

export type SigningActor = 'user' | 'backend-service' | 'operator';

export interface SigningRule {
  operation: string;
  signer: SigningActor;
  description: string;
}

/**
 * Canonical matrix of who signs what.
 * Extend this list as new on-chain operations are added.
 */
export const SIGNING_MATRIX: SigningRule[] = [
  {
    operation: 'reward.claim',
    signer: 'backend-service',
    description: 'Backend distributes rewards from the platform treasury wallet.',
  },
  {
    operation: 'buddy.payment',
    signer: 'user',
    description: 'User signs payment to queue buddy from their own wallet.',
  },
  {
    operation: 'account.create',
    signer: 'backend-service',
    description: 'Backend sponsors new account creation on behalf of the user.',
  },
  {
    operation: 'trust.anchor',
    signer: 'operator',
    description: 'Operator signs trust-line changes for custom asset issuance.',
  },
];

/** Look up the signing rule for a given operation. */
export function getSigningRule(operation: string): SigningRule | undefined {
  return SIGNING_MATRIX.find((r) => r.operation === operation);
}

/** Assert the correct actor is signing; throws if mismatched. */
export function assertSigner(operation: string, actor: SigningActor): void {
  const rule = getSigningRule(operation);
  if (!rule) throw new Error(`No signing rule defined for operation: ${operation}`);
  if (rule.signer !== actor) {
    throw new Error(
      `Signing violation: "${operation}" must be signed by "${rule.signer}", got "${actor}"`,
    );
  }
}
