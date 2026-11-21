// packages/stellar/src/types/transaction.ts
export interface StellarTransaction {
    id: string;
    hash: string;
    ledger: number;
    createdAt: string;
    sourceAccount: string;
    feeCharged: string;
    successful: boolean;
    memo?: string;
    operationsCount: number;
}