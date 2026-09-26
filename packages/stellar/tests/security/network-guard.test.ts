import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  NetworkGuard,
  type NetworkType,
} from '../../src/security/network-guard.js';
import { MainnetNotAllowedError } from '../../src/errors/stellar-error.js';
import { IncentivePoolClient } from '../../src/contracts/client.js';
import { IncentivePoolContract } from '../../src/contracts/incentive-pool.js';
import { IncentiveService } from '../../src/services/incentive.service.js';

const ADMIN_KEY = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFTGOBDKR3GYWUM7AZTQU';
const RECIPIENT_KEY = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7';

describe('Network-Config Guard Rails: Blocking Accidental Mainnet Use (#1049)', () => {
  const originalEnvNetwork = process.env.STELLAR_NETWORK;
  const originalEnvAllowMainnet = process.env.STELLAR_ALLOW_MAINNET;

  beforeEach(() => {
    delete process.env.STELLAR_NETWORK;
    delete process.env.STELLAR_ALLOW_MAINNET;
    NetworkGuard.setDefaultNetwork('TESTNET');
  });

  afterEach(() => {
    if (originalEnvNetwork !== undefined) {
      process.env.STELLAR_NETWORK = originalEnvNetwork;
    } else {
      delete process.env.STELLAR_NETWORK;
    }

    if (originalEnvAllowMainnet !== undefined) {
      process.env.STELLAR_ALLOW_MAINNET = originalEnvAllowMainnet;
    } else {
      delete process.env.STELLAR_ALLOW_MAINNET;
    }
  });

  describe('Direct NetworkGuard Inspection & Invariants', () => {
    it('defaults to TESTNET when no environment overrides are set', () => {
      assert.equal(NetworkGuard.getActiveNetwork(), 'TESTNET');
      assert.equal(NetworkGuard.isTestnet(), true);
      assert.equal(NetworkGuard.isMainnet(), false);
      assert.equal(NetworkGuard.networkLabel(), '🟢 TESTNET');
    });

    it('identifies MAINNET when STELLAR_NETWORK=MAINNET or PUBLIC is set', () => {
      process.env.STELLAR_NETWORK = 'MAINNET';
      assert.equal(NetworkGuard.getActiveNetwork(), 'MAINNET');
      assert.equal(NetworkGuard.isMainnet(), true);
      assert.equal(NetworkGuard.isTestnet(), false);
      assert.equal(NetworkGuard.networkLabel(), '🔴 MAINNET');

      process.env.STELLAR_NETWORK = 'PUBLIC';
      assert.equal(NetworkGuard.getActiveNetwork(), 'MAINNET');
    });

    it('requireTestnet() throws MainnetNotAllowedError when running on MAINNET without opt-in', () => {
      process.env.STELLAR_NETWORK = 'MAINNET';

      assert.throws(
        () => {
          NetworkGuard.requireTestnet('TransferOperation');
        },
        (err: unknown) => {
          assert.ok(err instanceof MainnetNotAllowedError);
          assert.match((err as Error).message, /blocked on MAINNET without explicit opt-in/);
          return true;
        }
      );
    });

    it('requireTestnet() succeeds on MAINNET when explicit allowMainnet=true option is passed', () => {
      process.env.STELLAR_NETWORK = 'MAINNET';

      // Should not throw when explicit opt-in is passed
      assert.doesNotThrow(() => {
        NetworkGuard.requireTestnet('TransferOperation', { allowMainnet: true });
      });
    });

    it('requireTestnet() succeeds on MAINNET when STELLAR_ALLOW_MAINNET=true env var is set', () => {
      process.env.STELLAR_NETWORK = 'MAINNET';
      process.env.STELLAR_ALLOW_MAINNET = 'true';

      assert.doesNotThrow(() => {
        NetworkGuard.requireTestnet('TransferOperation');
      });
    });

    it('requireTestnet() always passes for TESTNET, FUTURENET, and STANDALONE', () => {
      const nonMainnetTypes: NetworkType[] = ['TESTNET', 'FUTURENET', 'STANDALONE'];

      for (const net of nonMainnetTypes) {
        NetworkGuard.setDefaultNetwork(net);
        assert.doesNotThrow(() => {
          NetworkGuard.requireTestnet(`Context-${net}`, { network: net });
        });
      }
    });

    it('assertNetwork() verifies expected network and enforces opt-in guard on MAINNET', () => {
      assert.doesNotThrow(() => {
        NetworkGuard.assertNetwork('TESTNET', { network: 'TESTNET' });
      });

      assert.throws(() => {
        NetworkGuard.assertNetwork('MAINNET', { network: 'TESTNET' });
      }, /Expected network MAINNET but running on TESTNET/);

      // On MAINNET without opt-in, throws MainnetNotAllowedError
      assert.throws(
        () => {
          NetworkGuard.assertNetwork('MAINNET', { network: 'MAINNET' });
        },
        (err) => err instanceof MainnetNotAllowedError
      );

      // On MAINNET with opt-in, passes
      assert.doesNotThrow(() => {
        NetworkGuard.assertNetwork('MAINNET', { network: 'MAINNET', allowMainnet: true });
      });
    });

    it('warnMainnetWrite() outputs warning on MAINNET and remains silent on TESTNET', () => {
      const warnings: string[] = [];
      const originalWarn = console.warn;
      console.warn = (...args: unknown[]) => warnings.push(args.join(' '));

      try {
        NetworkGuard.warnMainnetWrite('deployContract', 'TESTNET');
        assert.equal(warnings.length, 0);

        NetworkGuard.warnMainnetWrite('deployContract', 'MAINNET');
        assert.equal(warnings.length, 1);
        assert.match(warnings[0], /⚠️  \[NetworkGuard\] MAINNET write operation/);
      } finally {
        console.warn = originalWarn;
      }
    });
  });

  describe('Integration with IncentivePoolClient & IncentiveService (#1049)', () => {
    it('blocks IncentivePoolClient.distribute() on mainnet without opt-in', async () => {
      const contract = new IncentivePoolContract();
      contract.initialize({
        admin: ADMIN_KEY,
        token: 'CDUMMYTOKENCONTRACT',
        upgradeAdmin: ADMIN_KEY,
        emergencyAdmin: ADMIN_KEY,
      });

      const client = new IncentivePoolClient({
        contractId: 'CMAINNETCONTRACT',
        network: 'MAINNET',
        adminSignerKey: ADMIN_KEY,
        contractInstance: contract,
      });

      await assert.rejects(
        async () => {
          await client.distribute({
            recipient: RECIPIENT_KEY,
            amount: 100n,
            idempotencyKey: 'idemp-1',
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof MainnetNotAllowedError);
          assert.match((err as Error).message, /IncentivePoolClient\.distribute.*blocked on MAINNET/);
          return true;
        }
      );
    });

    it('allows IncentivePoolClient.distribute() on mainnet with explicit allowMainnet=true', async () => {
      const contract = new IncentivePoolContract();
      contract.initialize({
        admin: ADMIN_KEY,
        token: 'CDUMMYTOKENCONTRACT',
        upgradeAdmin: ADMIN_KEY,
        emergencyAdmin: ADMIN_KEY,
      });
      contract.deposit({ from: ADMIN_KEY, amount: 1_000_000n });

      const client = new IncentivePoolClient({
        contractId: 'CMAINNETCONTRACT',
        network: 'MAINNET',
        allowMainnet: true,
        adminSignerKey: ADMIN_KEY,
        contractInstance: contract,
      });

      const res = await client.distribute({
        recipient: RECIPIENT_KEY,
        amount: 100n,
        idempotencyKey: 'idemp-allowed-mainnet',
      });

      assert.equal(res.success, true);
    });

    it('blocks IncentiveService.reward() when running on MAINNET without opt-in', async () => {
      process.env.STELLAR_NETWORK = 'MAINNET';

      const contract = new IncentivePoolContract();
      contract.initialize({
        admin: ADMIN_KEY,
        token: 'CDUMMYTOKENCONTRACT',
        upgradeAdmin: ADMIN_KEY,
        emergencyAdmin: ADMIN_KEY,
      });
      contract.deposit({ from: ADMIN_KEY, amount: 10_000_000n });

      const client = new IncentivePoolClient({
        contractId: 'CMAINNETINCENTIVE',
        adminSignerKey: ADMIN_KEY,
        contractInstance: contract,
      });

      const service = new IncentiveService({ client });
      service.setQueueConfig({
        queueId: 'q-guard-mainnet',
        enabled: true,
        rewardAmount: '1.0000000',
        asset: 'native',
      });

      await assert.rejects(
        async () => {
          await service.reward({
            userId: 'guard-user-1',
            queueId: 'q-guard-mainnet',
            recipient: RECIPIENT_KEY,
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof MainnetNotAllowedError);
          assert.match((err as Error).message, /IncentiveService\.reward.*blocked on MAINNET/);
          return true;
        }
      );
    });
  });
});
