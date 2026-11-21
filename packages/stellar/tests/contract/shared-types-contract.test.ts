import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  walletAccountSchema,
  walletBalancesSchema,
  walletResponseSchema,
  unlinkWalletResponseSchema,
  rewardRecordSchema,
  rewardHistoryResponseSchema,
  queueIncentiveConfigSchema,
  type WalletAccountDto,
  type WalletBalancesDto,
  type WalletResponseDto,
  type UnlinkWalletResponseDto,
  type RewardRecordDto,
  type RewardHistoryResponseDto,
  type QueueIncentiveConfigDto,
} from '@qyou/shared';
import { IncentiveService } from '../../src/services/incentive.service.js';
import { WalletService } from '../../src/services/wallet.service.js';
import { IncentivePoolContract } from '../../src/contracts/incentive-pool.js';
import { IncentivePoolClient } from '../../src/contracts/client.js';

const VALID_KEY = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFTGOBDKR3GYWUM7AZTQU';

describe('Shared Stellar Types & DTO Contract Conformance (#1046)', () => {
  it('WalletService output conforms to @qyou/shared WalletBalancesDto schema', async () => {
    const walletService = new WalletService({
      balanceProvider: async (pk) => ({
        xlm: '100.0000000',
        balances: [{ asset: 'native', balance: '100.0000000', isNative: true }],
      }),
    });

    const balances = await walletService.getBalances(VALID_KEY);
    const validated = walletBalancesSchema.parse(balances);

    assert.equal(validated.publicKey, VALID_KEY);
    assert.equal(validated.xlm, '100.0000000');
    assert.equal(validated.balances[0].isNative, true);

    const dto: WalletBalancesDto = validated;
    assert.equal(dto.xlm, '100.0000000');
  });

  it('IncentiveService queue config conforms to QueueIncentiveConfigDto schema', () => {
    const incentiveService = new IncentiveService();
    const config: QueueIncentiveConfigDto = {
      queueId: 'q-test-1',
      enabled: true,
      rewardAmount: '10.0000000',
      asset: 'native',
      maxRewardsPerUser: 1,
    };

    incentiveService.setQueueConfig(config);
    const retrieved = incentiveService.getQueueConfig('q-test-1');
    assert.ok(retrieved);

    const validated = queueIncentiveConfigSchema.parse(retrieved);
    assert.equal(validated.queueId, 'q-test-1');
    assert.equal(validated.rewardAmount, '10.0000000');
  });

  it('IncentiveService distribution record conforms to RewardRecordDto schema', async () => {
    const contract = new IncentivePoolContract();
    contract.initialize({
      admin: VALID_KEY,
      token: 'CDUMMYTOKENCONTRACT',
      upgradeAdmin: VALID_KEY,
      emergencyAdmin: VALID_KEY,
    });
    contract.deposit({ from: VALID_KEY, amount: 1_000_000_000n });

    const client = new IncentivePoolClient({
      contractId: 'CINCENTIVEPOOLTESTCONTRACT',
      adminSignerKey: VALID_KEY,
      contractInstance: contract,
    });

    const incentiveService = new IncentiveService({ client });
    incentiveService.setQueueConfig({
      queueId: 'queue-contract-1',
      enabled: true,
      rewardAmount: '5.0000000',
      asset: 'native',
    });

    const record = await incentiveService.reward({
      userId: 'user-contract-1',
      queueId: 'queue-contract-1',
      recipient: VALID_KEY,
    });

    const validated = rewardRecordSchema.parse(record);
    assert.equal(validated.userId, 'user-contract-1');
    assert.equal(validated.status, 'confirmed');
    assert.equal(validated.amount, '5.0000000');
    assert.ok(validated.transactionHash);

    const dto: RewardRecordDto = validated;
    assert.equal(dto.status, 'confirmed');

    const history: RewardHistoryResponseDto = {
      success: true,
      rewards: [dto],
      totalClaimed: '5.0000000',
    };
    const validatedHistory = rewardHistoryResponseSchema.parse(history);
    assert.equal(validatedHistory.rewards.length, 1);
  });
});
