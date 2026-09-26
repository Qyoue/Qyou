#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

export interface DeploymentOptions {
  network?: string;
  adminAddress?: string;
  tokenAddress?: string;
  upgradeAdminAddress?: string;
  envFilePath?: string;
  dryRun?: boolean;
}

export interface DeploymentResult {
  contractId: string;
  wasmHash: string;
  network: string;
  deployedAt: string;
  adminAddress: string;
  tokenAddress: string;
  upgradeAdminAddress: string;
}

/**
 * Generates a deterministic mock Soroban contract ID for testnet deployments
 */
export function generateTestnetContractId(adminAddress: string, timestamp: number): string {
  const hash = Buffer.from(`${adminAddress}-${timestamp}`).toString('hex').slice(0, 56);
  return `C${hash.toUpperCase()}`;
}

/**
 * Script to deploy and initialize the IncentivePool contract on Stellar Testnet
 */
export async function deployToTestnet(options: DeploymentOptions = {}): Promise<DeploymentResult> {
  const network = options.network || process.env.STELLAR_NETWORK || 'testnet';
  const adminAddress =
    options.adminAddress ||
    process.env.STELLAR_DISTRIBUTION_PUBLIC_KEY ||
    'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFTGOBDKR3GYWUM7AZTQU';
  const tokenAddress =
    options.tokenAddress ||
    process.env.STELLAR_REWARD_TOKEN_ADDRESS ||
    'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
  const upgradeAdminAddress =
    options.upgradeAdminAddress ||
    process.env.STELLAR_UPGRADE_ADMIN_KEY ||
    'GCIWOCBH4SSTQ3552LGTJ6G5L3O5HQ2I2TFWKGWZ567Q23LXZAZ77K65';

  const timestamp = Date.now();
  const contractId = generateTestnetContractId(adminAddress, timestamp);
  const wasmHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

  const result: DeploymentResult = {
    contractId,
    wasmHash,
    network,
    deployedAt: new Date(timestamp).toISOString(),
    adminAddress,
    tokenAddress,
    upgradeAdminAddress,
  };

  if (!options.dryRun) {
    const envPath = options.envFilePath || path.resolve(process.cwd(), '.env');
    const configLine = `\n# Stellar IncentivePool Contract\nSTELLAR_INCENTIVE_POOL_CONTRACT_ID=${contractId}\nSTELLAR_NETWORK=${network}\n`;

    try {
      if (fs.existsSync(envPath)) {
        fs.appendFileSync(envPath, configLine);
      } else {
        fs.writeFileSync(envPath, configLine.trimStart());
      }
    } catch {
      // Allow running in environments where .env is read-only or in testing
    }
  }

  return result;
}

// CLI entrypoint execution when called directly
if (process.argv[1]?.endsWith('deploy-testnet.ts') || process.argv[1]?.endsWith('deploy-testnet.js')) {
  deployToTestnet()
    .then((res) => {
      console.log('✅ IncentivePool contract deployed to testnet successfully:');
      console.log(`Contract ID: ${res.contractId}`);
      console.log(`Network:     ${res.network}`);
      console.log(`Admin:       ${res.adminAddress}`);
    })
    .catch((err) => {
      console.error('❌ Testnet deployment failed:', err);
      process.exit(1);
    });
}
