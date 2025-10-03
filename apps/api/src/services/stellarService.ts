// File: apps/api/src/services/stellarService.ts
import { Keypair, Server, TransactionBuilder, Operation, Asset } from 'stellar-sdk';
import dotenv from 'dotenv';

dotenv.config();

// Initialize the Stellar server for the Testnet
const server = new Server('https://horizon-testnet.stellar.org');

// Load the distributor's secret key from environment variables
const distributorSecretKey = process.env.STELLAR_DISTRIBUTOR_SECRET_KEY;
if (!distributorSecretKey) {
  throw new Error('STELLAR_DISTRIBUTOR_SECRET_KEY must be set in .env file');
}
const distributorKeypair = Keypair.fromSecret(distributorSecretKey);

// Load the QUEUE token issuer details
const assetIssuer = process.env.STELLAR_ISSUER_PUBLIC_KEY;
const assetCode = process.env.STELLAR_ASSET_CODE || 'QUEUE';
if (!assetIssuer) {
  throw new Error('STELLAR_ISSUER_PUBLIC_KEY must be set in .env file');
}
const qyouAsset = new Asset(assetCode, assetIssuer);

/**
 * Creates a new Stellar account, funds it, and establishes a trustline to the QUEUE token.
 * @returns The keypair for the newly created account.
 */
export const createAndFundAccount = async (): Promise<Keypair> => {
  // 1. Create a new, random keypair for the user.
  const newAccountKeypair = Keypair.random();
  console.log(`Generated new keypair: ${newAccountKeypair.publicKey()}`);

  try {
    // 2. Load the distributor account from the network.
    const distributorAccount = await server.loadAccount(
      distributorKeypair.publicKey()
    );

    // 3. Build a transaction to create and set up the new account.
    const transaction = new TransactionBuilder(distributorAccount, {
      fee: '10000', // Set a fee
      networkPassphrase: 'Test SDF Network ; September 2015',
    })
      // Operation 1: Create the account with 2 XLM to meet the minimum balance.
      .addOperation(
        Operation.createAccount({
          destination: newAccountKeypair.publicKey(),
          startingBalance: '2', // in XLM
        })
      )
      // Operation 2: Create a trustline so the new account can hold QUEUE tokens.
      .addOperation(
        Operation.changeTrust({
          source: newAccountKeypair.publicKey(), // The new account is the source of the trust
          asset: qyouAsset,
        })
      )
      .setTimeout(30)
      .build();

    // 4. Sign the transaction with both the distributor's key and the new account's key.
    transaction.sign(distributorKeypair);
    transaction.sign(newAccountKeypair);

    // 5. Submit the transaction to the Stellar network.
    const result = await server.submitTransaction(transaction);
    console.log('Stellar transaction successful!', result._links.transaction.href);

    return newAccountKeypair;
  } catch (error) {
    console.error('Stellar transaction failed:', error);
    throw error;
  }
};