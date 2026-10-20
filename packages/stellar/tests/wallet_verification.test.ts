import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Keypair } from '@stellar/stellar-sdk';
import { WalletVerificationService } from '../src/wallet_verification.js';

describe('WalletVerificationService.verifyKeyOwnership', () => {
  it('verifies a valid signature', () => {
    const svc = new WalletVerificationService();
    const kp = Keypair.random();
    const msg = 'sign-this-challenge';
    const sig = kp.sign(Buffer.from(msg)).toString('base64');
    assert.equal(svc.verifyKeyOwnership(kp.publicKey(), msg, sig), true);
  });

  it('rejects a signature made by the wrong key', () => {
    const svc = new WalletVerificationService();
    const kp1 = Keypair.random();
    const kp2 = Keypair.random();
    const msg = 'sign-this-challenge';
    const sig = kp1.sign(Buffer.from(msg)).toString('base64');
    assert.equal(svc.verifyKeyOwnership(kp2.publicKey(), msg, sig), false);
  });

  it('rejects a tampered message', () => {
    const svc = new WalletVerificationService();
    const kp = Keypair.random();
    const msg = 'sign-this-challenge';
    const sig = kp.sign(Buffer.from(msg)).toString('base64');
    assert.equal(svc.verifyKeyOwnership(kp.publicKey(), msg + 'x', sig), false);
  });

  it('rejects a truncated signature', () => {
    const svc = new WalletVerificationService();
    const kp = Keypair.random();
    const msg = 'sign-this-challenge';
    const sig = kp.sign(Buffer.from(msg)).toString('base64');
    assert.equal(svc.verifyKeyOwnership(kp.publicKey(), msg, sig.slice(0, 10)), false);
  });

  it('rejects malformed base64 input', () => {
    const svc = new WalletVerificationService();
    const kp = Keypair.random();
    const msg = 'sign-this-challenge';
    assert.equal(svc.verifyKeyOwnership(kp.publicKey(), msg, '!!!not-base64!!!'), false);
  });

  it('rejects an all-zero signature of >=8 characters', () => {
    const svc = new WalletVerificationService();
    const kp = Keypair.random();
    const msg = 'sign-this-challenge';
    assert.equal(svc.verifyKeyOwnership(kp.publicKey(), msg, 'AAAAAAAAAAAA'), false);
  });

  it('rejects missing inputs', () => {
    const svc = new WalletVerificationService();
    const kp = Keypair.random();
    const msg = 'sign-this-challenge';
    const sig = kp.sign(Buffer.from(msg)).toString('base64');
    assert.equal(svc.verifyKeyOwnership('', msg, sig), false);
    assert.equal(svc.verifyKeyOwnership(kp.publicKey(), msg, ''), false);
  });
});
