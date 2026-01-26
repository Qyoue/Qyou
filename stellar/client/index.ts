import { Horizon } from '@stellar/stellar-sdk';

const server = new Horizon.Server('https://horizon-testnet.stellar.org');

async function checkConnection() {
  try {
    console.log('✨ Connecting to Stellar Testnet...');

    const ledger = await server.ledgers().limit(1).order('desc').call();
    console.log(
      `✅ Stellar Connected! Latest Ledger: ${ledger.records[0].sequence}`,
    );
  } catch (e: any) {
    console.error('❌ Stellar Error:', e.message);
  }
}

checkConnection();

export { server };
