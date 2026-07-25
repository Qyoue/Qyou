import type { ContractEvolutionHeaderInput } from '@qyou/shared';

export function getContractHeaders(buildNumber = 100): Record<string, string> {
  const headerPayload: ContractEvolutionHeaderInput = {
    contractVersion: 'v1',
    clientBuildNumber: buildNumber,
    strictValidation: true,
  };

  return {
    'x-contract-version': headerPayload.contractVersion,
    'x-client-build': String(headerPayload.clientBuildNumber),
  };
}
