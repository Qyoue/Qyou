// src/interfaces/incentive.interface.ts
export interface IncentiveClaimRequest {
  recipientPublicKey: string;
  amount: string;
  contractId: string;
}

export interface IncentiveClaimResult {
  transactionHash: string;
  claimedAmount: string;
}

export interface IIncentiveService {
  distributeIncentive(request: IncentiveClaimRequest): Promise<IncentiveClaimResult>;
  getIncentiveBalance(contractId: string, accountPublicKey: string): Promise<string>;
}