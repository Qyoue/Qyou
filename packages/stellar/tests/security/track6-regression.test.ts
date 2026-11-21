import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  redactStellarSecretKeys,
  sanitizeLogData,
  SecretsManager,
  InMemorySecretsProvider,
  MultiSigService,
  DistributionGuard,
  WalletAbuseDetector,
  DistributionKillSwitch,
  AccountTransactionWatcher,
  WalletChallengeService,
  ChallengeReplayedError,
  KillSwitchActiveError,
  type ObservedTransaction,
  NetworkGuard,
} from '../../src/security/index.js';
import {
  UnauthorizedDistributionError,
  MainnetNotAllowedError,
} from '../../src/errors/stellar-error.js';
import { IncentiveService } from '../../src/services/incentive.service.js';
import { IncentivePoolClient } from '../../src/contracts/client.js';
import { IncentivePoolContract } from '../../src/contracts/incentive-pool.js';

const VALID_PUBKEY_1 = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFTGOBDKR3GYWUM7AZTQU';
const VALID_PUBKEY_2 = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7';
const VALID_PUBKEY_3 = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const VALID_SECRET = 'SBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFTGOBDKR3GYWUM7AZTQU';

describe('Track 6 Security Controls Regression Suite (#1050)', () => {
  beforeEach(() => {
    DistributionKillSwitch.resetInstance();
  });

  it('Control 1 Regression: LogSanitizer strictly redacts 56-char secret seeds from strings, objects, and errors', () => {
    // String redaction
    const textWithSecret = `Connecting with seed ${VALID_SECRET} to testnet`;
    const sanitizedText = redactStellarSecretKeys(textWithSecret);
    assert.ok(!sanitizedText.includes(VALID_SECRET), 'Raw secret seed must not exist in output');
    assert.ok(sanitizedText.includes('[REDACTED_STELLAR_SECRET_KEY]'), 'Must replace with redaction token');

    // Public keys must remain intact
    const textWithPublic = `Public key ${VALID_PUBKEY_1} linked`;
    assert.equal(redactStellarSecretKeys(textWithPublic), textWithPublic);

    // Deep object redaction
    const sensitivePayload = {
      credentials: {
        distributionSecret: VALID_SECRET,
        signer: VALID_PUBKEY_1,
      },
    };
    const sanitizedObj = sanitizeLogData(sensitivePayload) as any;
    assert.equal(sanitizedObj.credentials.distributionSecret, '[REDACTED_SECRET]');
    assert.equal(sanitizedObj.credentials.signer, VALID_PUBKEY_1);
  });

  it('Control 2 Regression: SecretsManager rejects missing secret and retrieves stored distribution key', async () => {
    const inMemoryProvider = new InMemorySecretsProvider();
    const manager = new SecretsManager(inMemoryProvider);

    // Rejects non-existent secret
    await assert.rejects(
      async () => {
        await manager.getStellarDistributionKey();
      },
      /Secret 'STELLAR_DISTRIBUTION_SECRET_KEY' not found/
    );

    // Successfully retrieves when configured
    await inMemoryProvider.setSecret('STELLAR_DISTRIBUTION_SECRET_KEY', VALID_SECRET);
    const retrieved = await manager.getStellarDistributionKey();
    assert.equal(retrieved, VALID_SECRET);
  });

  it('Control 3 Regression: MultiSigService blocks lockout risk and invalid threshold topologies', () => {
    // Rejects configuration where total weights cannot reach high threshold (lockout topology)
    const lockoutResult = MultiSigService.validatePolicy({
      accountId: VALID_PUBKEY_1,
      masterWeight: 1,
      lowThreshold: 1,
      medThreshold: 2,
      highThreshold: 5, // Total weight is 2, high is 5!
      signers: [{ publicKey: VALID_PUBKEY_2, weight: 1 }],
    });
    assert.equal(lockoutResult.valid, false);
    assert.ok(lockoutResult.errors.some((e) => e.includes('locking the account')));

    // Accepts valid production 2-of-3 policy
    const validPolicy = MultiSigService.createProductionPolicy(VALID_PUBKEY_1, [
      VALID_PUBKEY_2,
      VALID_PUBKEY_3,
    ]);
    const validResult = MultiSigService.validatePolicy(validPolicy);
    assert.equal(validResult.valid, true);
    assert.equal(validResult.totalWeight, 3);
  });

  it('Control 4 Regression: DistributionGuard strictly enforces per-transaction and 24h velocity caps', () => {
    const guard = new DistributionGuard({
      maxPerTransaction: 10.0,
      maxDailyVolume: 50.0,
      alertThresholdRatio: 3.0,
    });

    // Rejects amount above per-tx cap (15 > 10)
    const perTxCheck = guard.evaluate(15.0, 5.0);
    assert.equal(perTxCheck.allowed, false);
    assert.ok(perTxCheck.reason?.includes('per-transaction cap'));

    // Rejects accumulation exceeding 24h velocity cap
    guard.commit(10.0);
    guard.commit(10.0);
    guard.commit(10.0);
    guard.commit(10.0);
    guard.commit(10.0); // 50 total reached

    const dailyCheck = guard.evaluate(5.0, 5.0);
    assert.equal(dailyCheck.allowed, false);
    assert.ok(dailyCheck.reason?.includes('24-hour distribution limit'));

    // Detects anomaly (3x standard reward: 16.0 > 15.0)
    const anomalyCheck = guard.evaluate(16.0, 5.0);
    assert.equal(anomalyCheck.isAnomaly, true);
  });

  it('Control 5 Regression: WalletAbuseDetector blocks multi-account public key reuse and enforces rate limits', () => {
    const detector = new WalletAbuseDetector({ maxLinksPerHourPerUser: 2 });

    // Permits first account binding
    const res1 = detector.evaluate({ userId: 'user-1', publicKey: VALID_PUBKEY_1 });
    assert.equal(res1.allowed, true);
    detector.recordLink('user-1', VALID_PUBKEY_1);

    // Strictly blocks second distinct user from binding the same public key (Farming abuse)
    const res2 = detector.evaluate({ userId: 'user-2', publicKey: VALID_PUBKEY_1 });
    assert.equal(res2.allowed, false);
    assert.equal(res2.isFlagged, true);
    assert.ok(res2.reason?.includes('already been registered'));

    // Enforces user hourly velocity limit
    detector.recordLink('user-1', VALID_PUBKEY_2);
    const res3 = detector.evaluate({ userId: 'user-1', publicKey: VALID_PUBKEY_3 });
    assert.equal(res3.allowed, false);
    assert.equal(res3.isFlagged, true);
    assert.ok(res3.reason?.includes('Exceeded hourly wallet-linking frequency limit'));
  });

  it('Control 6 Regression: DistributionKillSwitch immediately trips and halts all reward payouts', async () => {
    const killSwitch = DistributionKillSwitch.getInstance();
    assert.equal(killSwitch.isHalted(), false);

    // Emergency trip
    killSwitch.haltSync('Suspected contract vulnerability', 'sec-ops');
    assert.equal(killSwitch.isHalted(), true);

    const contract = new IncentivePoolContract();
    contract.initialize({
      admin: VALID_PUBKEY_1,
      token: 'CDUMMY',
      upgradeAdmin: VALID_PUBKEY_1,
      emergencyAdmin: VALID_PUBKEY_1,
    });
    const client = new IncentivePoolClient({
      contractId: 'CPOOLTEST',
      adminSignerKey: VALID_PUBKEY_1,
      contractInstance: contract,
    });

    const service = new IncentiveService({ client, killSwitch });
    service.setQueueConfig({
      queueId: 'q-reg',
      enabled: true,
      rewardAmount: '5.0000000',
      asset: 'native',
    });

    // Payout MUST fail with kill switch halted
    await assert.rejects(
      async () => {
        await service.reward({
          userId: 'u-reg',
          queueId: 'q-reg',
          recipient: VALID_PUBKEY_2,
        });
      },
      (err) => err instanceof KillSwitchActiveError
    );

    // Resumption restores operation
    killSwitch.resumeSync('sec-ops');
    assert.equal(killSwitch.isHalted(), false);
  });

  it('Control 7 Regression: AccountTransactionWatcher detects unauthorized txs and auto-trips kill switch', () => {
    const killSwitch = DistributionKillSwitch.getInstance();
    const watcher = new AccountTransactionWatcher({
      distributionAccountId: VALID_PUBKEY_1,
      autoHaltKillSwitch: killSwitch,
    });

    // Registering authorized hash works
    watcher.registerAuthorizedTransaction('authorized-tx-hash-1');
    assert.equal(watcher.isAuthorized('authorized-tx-hash-1'), true);

    const rogueTx: ObservedTransaction = {
      id: 'rogue-1',
      hash: '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff',
      sourceAccount: VALID_PUBKEY_1,
      destination: VALID_PUBKEY_2,
      amount: '1000.0',
      asset: 'XLM',
      createdAt: Date.now(),
      successful: true,
    };

    // Encountering an unrecorded transaction from distribution account trips kill switch
    const alert = watcher.processTransaction(rogueTx);
    assert.ok(alert);
    assert.equal(killSwitch.isHalted(), true, 'Kill switch must auto-trip on rogue transaction');
  });

  it('Control 8 Regression: Application-level access control rejects unauthorized queue triggers', async () => {
    const contract = new IncentivePoolContract();
    contract.initialize({
      admin: VALID_PUBKEY_1,
      token: 'CDUMMY',
      upgradeAdmin: VALID_PUBKEY_1,
      emergencyAdmin: VALID_PUBKEY_1,
    });
    const client = new IncentivePoolClient({
      contractId: 'CPOOLTEST',
      adminSignerKey: VALID_PUBKEY_1,
      contractInstance: contract,
    });

    const service = new IncentiveService({
      client,
      requireInternalTrigger: true,
      internalTriggerSecret: 'secure-worker-secret-42',
    });
    service.setQueueConfig({
      queueId: 'q-auth-reg',
      enabled: true,
      rewardAmount: '5.0000000',
      asset: 'native',
    });

    // External caller without credentials rejected
    await assert.rejects(
      async () => {
        await service.reward({
          userId: 'u-auth-reg',
          queueId: 'q-auth-reg',
          recipient: VALID_PUBKEY_2,
        });
      },
      (err) => err instanceof UnauthorizedDistributionError
    );

    // Caller with wrong secret rejected
    await assert.rejects(
      async () => {
        await service.reward({
          userId: 'u-auth-reg',
          queueId: 'q-auth-reg',
          recipient: VALID_PUBKEY_2,
          callerContext: { internalSecret: 'wrong-secret' },
        });
      },
      (err) => err instanceof UnauthorizedDistributionError
    );
  });

  it('Control 9 Regression: WalletChallengeService enforces cryptographic nonce uniqueness and replay prevention', async () => {
    const challengeService = new WalletChallengeService({ defaultTtlSeconds: 60 });
    const challenge = challengeService.createChallenge({
      userId: 'u-challenge-reg',
      publicKey: VALID_PUBKEY_1,
    });

    assert.ok(challenge.nonce.length >= 64);
    assert.equal(challenge.publicKey, VALID_PUBKEY_1);

    // First consumption succeeds
    const result = await challengeService.verifyChallenge({
      challengeId: challenge.challengeId,
      publicKey: VALID_PUBKEY_1,
      signature: 'valid-ed25519-signature-hex-1234567890abcdef',
    });
    assert.equal(result.verified, true);

    // Replay with identical challengeId MUST be rejected
    await assert.rejects(
      async () => {
        await challengeService.verifyChallenge({
          challengeId: challenge.challengeId,
          publicKey: VALID_PUBKEY_1,
          signature: 'valid-ed25519-signature-hex-1234567890abcdef',
        });
      },
      (err) => err instanceof ChallengeReplayedError
    );
  });

  it('Control 10 Regression: NetworkGuard rejects mainnet operations without explicit opt-in confirmation', () => {
    assert.throws(() => {
      NetworkGuard.requireTestnet('MainnetTransfer', { network: 'MAINNET' });
    }, (err) => err instanceof MainnetNotAllowedError);

    // Opt-in flag passes
    assert.doesNotThrow(() => {
      NetworkGuard.requireTestnet('MainnetTransfer', { network: 'MAINNET', allowMainnet: true });
    });
  });
});
