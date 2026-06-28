export interface DocsContractPhase1 {
  workspace: string;
  directory: string;
  requiredDocs: string[];
  optionalDocs: string[];
}

export const DOCS_CONTRACTS_PHASE1: DocsContractPhase1[] = [
  { workspace: '@qyou/api', directory: 'apps/api/docs', requiredDocs: ['development.md', 'architecture.md', 'testing.md'], optionalDocs: ['deployment.md'] },
  { workspace: '@qyou/web', directory: 'apps/web/docs', requiredDocs: ['development.md', 'architecture.md', 'testing.md'], optionalDocs: [] },
  { workspace: '@qyou/mobile', directory: 'apps/mobile/docs', requiredDocs: ['development.md', 'architecture.md'], optionalDocs: ['testing.md'] },
  { workspace: '@qyou/shared', directory: 'packages/shared/docs', requiredDocs: ['architecture.md'], optionalDocs: ['development.md'] },
  { workspace: '@qyou/stellar', directory: 'packages/stellar/docs', requiredDocs: ['architecture.md'], optionalDocs: ['development.md'] },
];

export function getDocContractPhase1(name: string): DocsContractPhase1 | undefined {
  return DOCS_CONTRACTS_PHASE1.find((c) => c.workspace === name);
}

export function validateDocsPhase1(
  existingFiles: string[],
  contract: DocsContractPhase1,
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const doc of contract.requiredDocs) {
    if (!existingFiles.includes(doc)) {
      errors.push(`Required doc "${doc}" is missing`);
    }
  }

  for (const doc of contract.optionalDocs) {
    if (!existingFiles.includes(doc)) {
      warnings.push(`Optional doc "${doc}" is missing`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
