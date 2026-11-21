// packages/stellar/src/types/account.ts
export interface StellarAccount {
    accountId: string;
    balances: Array<{
        balance: string;
        assetType: string;
        assetCode?: string;
        assetIssuer?: string;
    }>;
    sequenceNumber: string;
    subentryCount: number;
    flags: {
        authRequired: boolean;
        authRevocable: boolean;
        authImmutable: boolean;
    };
}