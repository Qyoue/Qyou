export interface ContractEvolutionHeader {
  contractVersion: string;
  clientBuildNumber: number;
  strictValidation: boolean;
}

export interface SchemaDeprecationNotice {
  deprecatedVersion: string;
  sunsetDate: string;
  recommendedVersion: string;
}

export interface ContractValidationResult {
  isCompatible: boolean;
  warnings: string[];
  errors: string[];
}
