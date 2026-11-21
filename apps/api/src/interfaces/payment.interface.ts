// src/interfaces/payment.interface.ts
export interface TransferRequest {
  sourceSecret: string;
  destinationPublicKey: string;
  amount: string;
  assetCode?: string;
  assetIssuer?: string;
  memo?: string;
}

export interface TransferResult {
  transactionHash: string;
  ledger: number;
  feeCharged: string;
}

export interface IPaymentService {
  transfer(request: TransferRequest): Promise<TransferResult>;
  verifyTransaction(transactionHash: string): Promise<boolean>;
}