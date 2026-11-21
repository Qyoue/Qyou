import {
  contractEvolutionHeaderSchema,
  type ContractValidationResult,
} from '@qyou/shared';

export function validateContractHeader(header: unknown): ContractValidationResult {
  const parseResult = contractEvolutionHeaderSchema.safeParse(header);
  if (!parseResult.success) {
    return {
      isCompatible: false,
      warnings: [],
      errors: parseResult.error.errors.map((e) => e.message),
    };
  }

  return {
    isCompatible: true,
    warnings: [],
    errors: [],
  };
}
