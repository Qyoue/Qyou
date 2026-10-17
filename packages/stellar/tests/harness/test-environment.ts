/**
 * Test Infrastructure Harness & Mock Stellar Environment (#1037)
 *
 * Provides standardized fixtures, simulated keypairs, and testing utilities
 * matching the Node.js native test runner pattern used throughout the monorepo.
 */

import { IncentivePoolClient } from '../../src/contracts/client.js';
import { IncentiveService } from '../../src/services/incentive.service.js';
import { WalletService } from '../../src/services/wallet.service.js';

export interface TestHarnessContext {
  readonly adminKey: string;
  readonly userKey1: string;
  readonly userKey2: string;
  readonly contractId: string;
  readonly client: IncentivePoolClient;
  readonly incentiveService: IncentiveService;
  readonly walletService: WalletService;
}

export class StellarTestHarness {
  public static readonly TEST_ADMIN_KEY =
    'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFTGOBDKR3GYWUM7AZTQU';
  public static readonly TEST_USER_KEY_1 =
    'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7';
  public static readonly TEST_USER_KEY_2 =
    'GCXTAQ5QG3Z2YOMRLP2BGLF3J5O2U76X6U32V25W75L27YQ7H37K6Z5A';
  public static readonly TEST_CONTRACT_ID =
    'CHARTTESTCONTRACTID0000000000000000000000000000000000000';

  /**
   * Initializes a fresh in-memory test environment.
   */
  public static async createEnvironment(options: {
    initialPoolBalance?: bigint;
    requireInternalTrigger?: boolean;
  } = {}): Promise<TestHarnessContext> {
    const client = new IncentivePoolClient({
      contractId: StellarTestHarness.TEST_CONTRACT_ID,
      adminSignerKey: StellarTestHarness.TEST_ADMIN_KEY,
    });

    await client.initialize({
      admin: StellarTestHarness.TEST_ADMIN_KEY,
      token: 'CTESTTOKEN1234567890',
      upgradeAdmin: StellarTestHarness.TEST_ADMIN_KEY,
    });

    if (options.initialPoolBalance && options.initialPoolBalance > 0n) {
      await client.deposit({
        from: StellarTestHarness.TEST_ADMIN_KEY,
        amount: options.initialPoolBalance,
      });
    }

    const incentiveService = new IncentiveService({
      client,
      adminSignerKey: StellarTestHarness.TEST_ADMIN_KEY,
      requireInternalTrigger: options.requireInternalTrigger ?? false,
    });

    const walletService = new WalletService();

    return {
      adminKey: StellarTestHarness.TEST_ADMIN_KEY,
      userKey1: StellarTestHarness.TEST_USER_KEY_1,
      userKey2: StellarTestHarness.TEST_USER_KEY_2,
      contractId: StellarTestHarness.TEST_CONTRACT_ID,
      client,
      incentiveService,
      walletService,
    };
  }
}
