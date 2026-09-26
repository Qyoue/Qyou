import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  WalletChallengeService,
  ChallengeNotFoundError,
  ChallengeExpiredError,
  ChallengeReplayedError,
  ChallengeKeyMismatchError,
  InvalidSignatureError,
} from '../../src/security/index.js';
import { IncentiveService } from '../../src/services/incentive.service.js';
import { IncentivePoolClient } from '../../src/contracts/client.js';
import { UnauthorizedDistributionError } from '../../src/errors/stellar-error.js';
import { StellarTestHarness } from '../harness/test-environment.js';

describe('Testing Infrastructure, Wallet Challenges & Access Controls (#1034, #1035, #1037)', () => {
  const ADMIN_KEY = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFTGOBDKR3GYWUM7AZTQU';
  const USER_KEY = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7';
  const FORGED_KEY = 'GCXTAQ5QG3Z2YOMRLP2BGLF3J5O2U76X6U32V25W75L27YQ7H37K6Z5A';

  describe('Real Test Infrastructure & Harness Health Check (#1037)', () => {
    it('initializes a test environment with simulated pool balance and contract client', async () => {
      const env = await StellarTestHarness.createEnvironment({
        initialPoolBalance: 50_000_000n,
      });

      assert.equal(env.adminKey, ADMIN_KEY);
      assert.ok(env.client);
      assert.ok(env.incentiveService);
      assert.ok(env.walletService);

      const balance = await env.incentiveService.getPoolBalance();
      assert.equal(balance, 50_000_000n);
    });
  });

  describe('Unauthorized Distribution Rejection (#1034)', () => {
    let service: IncentiveService;

    beforeEach(async () => {
      const client = new IncentivePoolClient({
        contractId: 'CTESTCONTRACT1234567890123456789012345678901234567890123456',
        adminSignerKey: ADMIN_KEY,
      });
      await client.initialize({
        admin: ADMIN_KEY,
        token: 'CTESTTOKEN1234567890',
        upgradeAdmin: ADMIN_KEY,
      });
      await client.deposit({
        from: ADMIN_KEY,
        amount: 100_000_000n,
      });

      service = new IncentiveService({
        client,
        adminSignerKey: ADMIN_KEY,
        requireInternalTrigger: true,
        internalTriggerSecret: 'secret-queue-completion-token-999',
      });

      service.setQueueConfig({
        queueId: 'q-vip-queue',
        rewardAmount: '5.0',
        asset: 'XLM',
        enabled: true,
      });
    });

    it('rejects distribution requests from unauthorized external callers or users', async () => {
      await assert.rejects(
        async () => {
          // Attempt call without internal trigger credentials (simulating a direct user/API call)
          await service.reward({
            userId: 'user-unauthorized',
            queueId: 'q-vip-queue',
            recipient: USER_KEY,
            callerContext: {
              role: 'authenticated_user',
              isInternalTrigger: false,
            },
          });
        },
        (err: Error) => {
          assert.ok(err instanceof UnauthorizedDistributionError);
          assert.match(err.message, /distributions can only be triggered by the internal queue-completion service/);
          return true;
        }
      );
    });

    it('rejects distribution when internal secret does not match', async () => {
      await assert.rejects(
        async () => {
          await service.reward({
            userId: 'user-bad-token',
            queueId: 'q-vip-queue',
            recipient: USER_KEY,
            callerContext: {
              role: 'external_client',
              internalSecret: 'wrong-secret-token',
            },
          });
        },
        (err: Error) => {
          assert.ok(err instanceof UnauthorizedDistributionError);
          return true;
        }
      );
    });

    it('permits distribution when initiated by verified internal queue-completion worker', async () => {
      const reward = await service.reward({
        userId: 'user-legitimate-1',
        queueId: 'q-vip-queue',
        recipient: USER_KEY,
        callerContext: {
          role: 'internal_queue_worker',
          isInternalTrigger: true,
          internalSecret: 'secret-queue-completion-token-999',
        },
      });

      assert.equal(reward.status, 'confirmed');
      assert.ok(reward.transactionHash);
    });
  });

  describe('Wallet-Connect Signature Challenge & Replay Protection (#1035)', () => {
    let challengeService: WalletChallengeService;

    beforeEach(() => {
      challengeService = new WalletChallengeService({
        defaultTtlSeconds: 60,
      });
    });

    it('generates nonce-based, single-use, time-limited challenge', () => {
      const challenge = challengeService.createChallenge({
        userId: 'u-challenge-1',
        publicKey: USER_KEY,
      });

      assert.ok(challenge.challengeId.startsWith('chal-'));
      assert.ok(challenge.nonce.length >= 64);
      assert.equal(challenge.used, false);
      assert.ok(challenge.expiresAt > Date.now());
      assert.match(challenge.message, new RegExp(USER_KEY));
      assert.match(challenge.message, new RegExp(challenge.nonce));
    });

    it('successfully verifies a valid, fresh challenge signature', async () => {
      const challenge = challengeService.createChallenge({
        userId: 'u-challenge-2',
        publicKey: USER_KEY,
      });

      const validSignature = 'valid-ed25519-signature-hex-1234567890abcdef';
      const result = await challengeService.verifyChallenge({
        challengeId: challenge.challengeId,
        publicKey: USER_KEY,
        signature: validSignature,
      });

      assert.equal(result.verified, true);
      assert.equal(result.challengeId, challenge.challengeId);
      assert.equal(result.userId, 'u-challenge-2');
      assert.equal(result.publicKey, USER_KEY);

      // Challenge is marked as used
      const stored = challengeService.getChallenge(challenge.challengeId);
      assert.equal(stored?.used, true);
    });

    it('strictly rejects replayed signature challenges (Replay Attack Defense)', async () => {
      const challenge = challengeService.createChallenge({
        userId: 'u-challenge-3',
        publicKey: USER_KEY,
      });

      const validSignature = 'valid-signature-stream-sample-abcdef123456';

      // First verification succeeds
      await challengeService.verifyChallenge({
        challengeId: challenge.challengeId,
        publicKey: USER_KEY,
        signature: validSignature,
      });

      // Second verification with the exact same challenge MUST fail due to replay protection
      await assert.rejects(
        async () => {
          await challengeService.verifyChallenge({
            challengeId: challenge.challengeId,
            publicKey: USER_KEY,
            signature: validSignature,
          });
        },
        (err: Error) => {
          assert.ok(err instanceof ChallengeReplayedError);
          assert.match(err.message, /Replay attack detected/);
          return true;
        }
      );
    });

    it('rejects expired challenges', async () => {
      // Create challenge with negative TTL so it is already expired
      const expiredChallenge = challengeService.createChallenge({
        userId: 'u-expired',
        publicKey: USER_KEY,
        ttlSeconds: -10,
      });

      await assert.rejects(
        async () => {
          await challengeService.verifyChallenge({
            challengeId: expiredChallenge.challengeId,
            publicKey: USER_KEY,
            signature: 'any-valid-length-signature-123456',
          });
        },
        (err: Error) => {
          assert.ok(err instanceof ChallengeExpiredError);
          assert.match(err.message, /expired/);
          return true;
        }
      );
    });

    it('rejects challenges when public key does not match', async () => {
      const challenge = challengeService.createChallenge({
        userId: 'u-mismatch',
        publicKey: USER_KEY,
      });

      await assert.rejects(
        async () => {
          await challengeService.verifyChallenge({
            challengeId: challenge.challengeId,
            publicKey: FORGED_KEY,
            signature: 'valid-signature-bytes-abcdef12345678',
          });
        },
        (err: Error) => {
          assert.ok(err instanceof ChallengeKeyMismatchError);
          assert.match(err.message, /mismatch/);
          return true;
        }
      );
    });
  });
});
