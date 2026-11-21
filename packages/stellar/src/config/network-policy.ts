/**
 * Network policy for Friendbot and Futurenet (#1132, #1133).
 *
 * #1133 decision: Futurenet is NOT supported. It resets periodically and nothing tests its
 * passphrase or URLs, so keeping the entry would advertise a network that silently breaks.
 * `STELLAR_NETWORKS` should drop `futurenet`; until then this policy refuses it explicitly.
 * Re-adding it requires tests for its passphrase and endpoints plus reset documentation.
 */
export type NetworkName = 'testnet' | 'mainnet' | 'futurenet' | (string & {});

export const SUPPORTED_NETWORKS: readonly NetworkName[] = ['testnet', 'mainnet'];
const FRIENDBOT_NETWORKS: readonly NetworkName[] = ['testnet'];

export class NetworkPolicyError extends Error {
  constructor(message: string, readonly network: string) {
    super(message);
    this.name = 'NetworkPolicyError';
  }
}

export function isSupportedNetwork(network: string): boolean {
  return SUPPORTED_NETWORKS.includes(network);
}

/**
 * Allow-list based, so a new network is refused by default. Call this with the *configured
 * network* (the same value `NetworkGuard` checks), not by inspecting the Friendbot URL.
 */
export function assertFriendbotAllowed(network: string): void {
  if (!FRIENDBOT_NETWORKS.includes(network)) {
    throw new NetworkPolicyError(`Friendbot is only available on ${FRIENDBOT_NETWORKS.join(', ')}; refused for "${network}"`, network);
  }
}

/** Friendbot URL from the network config, never from a hard-coded constant. */
export function friendbotUrlFor(network: string, config: { friendbotUrl?: string }): string {
  assertFriendbotAllowed(network);
  if (!config.friendbotUrl) throw new NetworkPolicyError(`No friendbotUrl configured for "${network}"`, network);
  return config.friendbotUrl;
}
