import { Horizon } from '@stellar/stellar-sdk';
import { STELLAR_CONFIG } from './config';

const server = new Horizon.Server(STELLAR_CONFIG.horizonUrl);

async function checkConnection() {
  try {
    console.log(`✨ Connecting to Stellar (${STELLAR_CONFIG.network})...`);
    console.log(`   URL: ${STELLAR_CONFIG.horizonUrl}`);

    const ledger = await server.ledgers().limit(1).order('desc').call();
    console.log(
      `✅ Connection Successful! Latest Ledger: ${ledger.records[0].sequence}`,
    );
  } catch (e: any) {
    console.error('❌ Stellar Connection Failed:', e.message);
  }
}

if (require.main === module) {
  checkConnection();
}

export { server, STELLAR_CONFIG };

export * from './wallet';

export { Keypair } from '@stellar/stellar-sdk';
