export class StellarError extends Error {
  public readonly code: string;

  constructor(message: string, code = 'STELLAR_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
  }
}

export class InvalidPublicKeyError extends StellarError {
  constructor(message = 'Invalid Stellar public key format') {
    super(message, 'INVALID_PUBLIC_KEY');
  }
}

export class WalletAlreadyLinkedError extends StellarError {
  constructor(message = 'A Stellar wallet is already linked to this account') {
    super(message, 'WALLET_ALREADY_LINKED');
  }
}

export class WalletNotFoundError extends StellarError {
  constructor(message = 'No linked Stellar wallet found for this account') {
    super(message, 'WALLET_NOT_FOUND');
  }
}

export class UnauthorizedStellarOperationError extends StellarError {
  constructor(message = 'Unauthorized Stellar operation') {
    super(message, 'UNAUTHORIZED_STELLAR_OPERATION');
  }
}
