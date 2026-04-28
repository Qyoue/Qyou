# Stellar Client

Stellar integration layer for Qyou reputation and payment flows.

## Treasury Wallet Management

### Wallet Rotation
For production deployments, treasury wallets should be rotated periodically:

```bash
# 1. Generate new wallet
npm run stellar:create-wallet

# 2. Update STELLAR_TREASURY_SECRET in environment config

# 3. Transfer funds from old to new wallet
npm run stellar:transfer-treasury

# 4. Verify new wallet is operational
npm run stellar:check-connection
```

### Recovery
If treasury wallet secret is lost or compromised:
- Follow rotation procedure immediately
- Review `docs/architecture/payment-flow.md` for detailed recovery steps
- Maintain offline backups of wallet secrets in secure locations

## Development

Run smoke tests to verify package entrypoints:
```bash
npm run test:wallet
npm run test:rewards
```
