export interface Phase5ContractCompatibilityMatrix {
  minimumSupportedVersion: string;
  activeVersion: string;
  experimentalFeatures: string[];
}

export interface ContractAssertionToken {
  token: string;
  issuedVersion: string;
  expiresTimestamp: number;
}

export interface ContractValidationReport {
  isCompatible: boolean;
  versionMismatch: boolean;
  unsupportedFeatures: string[];
}
