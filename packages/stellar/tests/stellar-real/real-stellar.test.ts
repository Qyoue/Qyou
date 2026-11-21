import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Keypair, Networks, StrKey, TransactionBuilder } from '@stellar/stellar-sdk';
import { WalletService } from '../../src/services/wallet.service.js';
import { PaymentTransactionBuilder, TransactionSigner } from '../../src/transaction_signer.js';
import { AccountExistenceChecker, WalletVerificationService } from '../../src/wallet_verification.js';

const kp = Keypair.random();
const dest = Keypair.random().publicKey();

describe('real Stellar primitives', () => {
  it('createAccount returns valid strkeys', () => {
    const acct = new WalletService().createAccount();
    assert.ok(StrKey.isValidEd25519PublicKey(acct.publicKey));
    assert.ok(StrKey.isValidEd25519SecretSeed(acct.secretKey));
  });

  it('signs a real transaction without leaking the secret', () => {
    const xdr = PaymentTransactionBuilder.buildPaymentXdr({ sourceAccount: kp.publicKey(), destinationAccount: dest, amount: '10', assetCode: 'XLM', memo: 'hi' });
    const signed = TransactionSigner.signTransactionXdr(xdr, kp.secret());
    const tx = TransactionBuilder.fromXDR(signed, Networks.TESTNET);
    assert.equal(tx.signatures.length, 1);
    assert.ok(kp.verify(tx.hash(), tx.signatures[0].signature()));
    const secret = kp.secret();
    for (let i = 0; i + 12 <= secret.length; i++) assert.ok(!signed.includes(secret.slice(i, i + 12)));
    assert.ok(!signed.includes(secret));
  });

  it('verifyKeyOwnership checks the signature', () => {
    const msg = 'challenge';
    const sig = kp.sign(Buffer.from(msg)).toString('base64');
    const svc = new WalletVerificationService();
    assert.equal(svc.verifyKeyOwnership(kp.publicKey(), msg, sig), true);
    assert.equal(svc.verifyKeyOwnership(kp.publicKey(), msg, 'AAAAAAAAAAAA'), false);
  });

  it('checkAccountExists handles 200, 404 and network failure', async () => {
    const key = kp.publicKey();
    assert.equal(await new AccountExistenceChecker(async () => ({})).checkAccountExists(key), true);
    assert.equal(await new AccountExistenceChecker(async () => { throw { response: { status: 404 } }; }).checkAccountExists(key), false);
    await assert.rejects(new AccountExistenceChecker(async () => { throw new Error('ECONNRESET'); }).checkAccountExists(key));
  });
});
