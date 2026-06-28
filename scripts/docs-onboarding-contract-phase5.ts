export interface DocsOnboardingPhase5Step {
  step: string;
  description: string;
  required: boolean;
  estimatedMinutes: number;
  verificationCommand?: string;
}

export interface DocsOnboardingPhase5Section {
  name: string;
  minWords: number;
}

export interface DocsPhase5File {
  filename: string;
  required: boolean;
  minChars: number;
  sections: DocsOnboardingPhase5Section[];
}

export interface DocsOnboardingPhase5Contract {
  workspace: string;
  docsDir: string;
  files: DocsPhase5File[];
  maxOrphanedFiles: number;
  onboarding: {
    steps: DocsOnboardingPhase5Step[];
    estimatedTotalMinutes: number;
    requiredCheckpoints: string[];
  };
  coverage: {
    targetPercentage: number;
    minimumFilesPerWorkspace: number;
  };
  validation: {
    enforceSectionHeaders: boolean;
    checkDeadLinks: boolean;
    verifyCodeExamplesCompile: boolean;
  };
}

const ONBOARDING_STEPS_API: DocsOnboardingPhase5Step[] = [
  { step: 'Clone and install', description: 'git clone + npm ci', required: true, estimatedMinutes: 5, verificationCommand: 'npm run build' },
  { step: 'Environment setup', description: 'Copy .env.example to .env and fill required vars', required: true, estimatedMinutes: 3, verificationCommand: 'node -e "require(\"./src/env\")"' },
  { step: 'Run API tests', description: 'Verify test suite passes', required: true, estimatedMinutes: 2, verificationCommand: 'npm run test' },
  { step: 'Run linter', description: 'Verify code style compliance', required: true, estimatedMinutes: 1, verificationCommand: 'npm run lint' },
];

const ONBOARDING_STEPS_WEB: DocsOnboardingPhase5Step[] = [
  { step: 'Clone and install', description: 'git clone + npm ci', required: true, estimatedMinutes: 5, verificationCommand: 'npm run build' },
  { step: 'Environment setup', description: 'Copy .env.example to .env', required: true, estimatedMinutes: 2, verificationCommand: 'npm run dev -- --dry-run' },
  { step: 'Run web tests', description: 'Verify test suite passes', required: true, estimatedMinutes: 3, verificationCommand: 'npm run test' },
];

const ONBOARDING_STEPS_MOBILE: DocsOnboardingPhase5Step[] = [
  { step: 'Clone and install', description: 'git clone + npm ci', required: true, estimatedMinutes: 5, verificationCommand: 'npm run build' },
  { step: 'Environment setup', description: 'Copy .env.example to .env', required: true, estimatedMinutes: 2 },
  { step: 'Run mobile tests', description: 'Verify test suite passes', required: false, estimatedMinutes: 5, verificationCommand: 'npm run test' },
];

export const DOCS_ONBOARDING_PHASE5_CONTRACTS: DocsOnboardingPhase5Contract[] = [
  {
    workspace: '@qyou/api',
    docsDir: 'apps/api/docs',
    maxOrphanedFiles: 0,
    files: [
      { filename: 'development.md', required: true, minChars: 500, sections: [{ name: 'Setup', minWords: 30 }, { name: 'Configuration', minWords: 20 }, { name: 'Running Locally', minWords: 25 }, { name: 'Troubleshooting', minWords: 15 }] },
      { filename: 'architecture.md', required: true, minChars: 500, sections: [{ name: 'Overview', minWords: 40 }, { name: 'Modules', minWords: 30 }, { name: 'Data Flow', minWords: 25 }, { name: 'Sequence Diagrams', minWords: 10 }] },
      { filename: 'testing.md', required: true, minChars: 300, sections: [{ name: 'Running Tests', minWords: 15 }, { name: 'Writing Tests', minWords: 20 }, { name: 'Fixtures', minWords: 10 }] },
      { filename: 'deployment.md', required: true, minChars: 200, sections: [{ name: 'Environment', minWords: 15 }, { name: 'CI/CD Pipeline', minWords: 15 }, { name: 'Rollback', minWords: 10 }] },
      { filename: 'api-reference.md', required: true, minChars: 400, sections: [{ name: 'Endpoints', minWords: 30 }, { name: 'Authentication', minWords: 15 }, { name: 'Error Codes', minWords: 10 }] },
    ],
    onboarding: {
      steps: ONBOARDING_STEPS_API,
      estimatedTotalMinutes: ONBOARDING_STEPS_API.reduce((s, st) => s + st.estimatedMinutes, 0),
      requiredCheckpoints: ['build succeeds', 'tests pass', 'linter passes'],
    },
    coverage: { targetPercentage: 90, minimumFilesPerWorkspace: 5 },
    validation: { enforceSectionHeaders: true, checkDeadLinks: true, verifyCodeExamplesCompile: false },
  },
  {
    workspace: '@qyou/web',
    docsDir: 'apps/web/docs',
    maxOrphanedFiles: 0,
    files: [
      { filename: 'development.md', required: true, minChars: 400, sections: [{ name: 'Setup', minWords: 25 }, { name: 'Configuration', minWords: 15 }, { name: 'Running Locally', minWords: 20 }] },
      { filename: 'architecture.md', required: true, minChars: 400, sections: [{ name: 'Overview', minWords: 35 }, { name: 'Pages', minWords: 25 }, { name: 'State Management', minWords: 15 }] },
      { filename: 'testing.md', required: true, minChars: 300, sections: [{ name: 'Running Tests', minWords: 15 }, { name: 'Component Tests', minWords: 15 }] },
      { filename: 'component-library.md', required: true, minChars: 300, sections: [{ name: 'UI Components', minWords: 20 }, { name: 'Forms', minWords: 15 }] },
    ],
    onboarding: {
      steps: ONBOARDING_STEPS_WEB,
      estimatedTotalMinutes: ONBOARDING_STEPS_WEB.reduce((s, st) => s + st.estimatedMinutes, 0),
      requiredCheckpoints: ['build succeeds', 'tests pass'],
    },
    coverage: { targetPercentage: 85, minimumFilesPerWorkspace: 4 },
    validation: { enforceSectionHeaders: true, checkDeadLinks: true, verifyCodeExamplesCompile: false },
  },
  {
    workspace: '@qyou/mobile',
    docsDir: 'apps/mobile/docs',
    maxOrphanedFiles: 0,
    files: [
      { filename: 'development.md', required: true, minChars: 400, sections: [{ name: 'Setup', minWords: 25 }, { name: 'Configuration', minWords: 15 }, { name: 'Running Locally', minWords: 20 }] },
      { filename: 'architecture.md', required: true, minChars: 400, sections: [{ name: 'Overview', minWords: 35 }, { name: 'Screens', minWords: 25 }, { name: 'Navigation', minWords: 15 }] },
      { filename: 'testing.md', required: true, minChars: 250, sections: [{ name: 'Running Tests', minWords: 10 }, { name: 'E2E Tests', minWords: 15 }] },
    ],
    onboarding: {
      steps: ONBOARDING_STEPS_MOBILE,
      estimatedTotalMinutes: ONBOARDING_STEPS_MOBILE.reduce((s, st) => s + st.estimatedMinutes, 0),
      requiredCheckpoints: ['build succeeds'],
    },
    coverage: { targetPercentage: 80, minimumFilesPerWorkspace: 3 },
    validation: { enforceSectionHeaders: true, checkDeadLinks: true, verifyCodeExamplesCompile: false },
  },
  {
    workspace: '@qyou/shared',
    docsDir: 'packages/shared/docs',
    maxOrphanedFiles: 0,
    files: [
      { filename: 'architecture.md', required: true, minChars: 300, sections: [{ name: 'Overview', minWords: 25 }, { name: 'Exports', minWords: 15 }, { name: 'Usage Examples', minWords: 15 }] },
      { filename: 'api-reference.md', required: true, minChars: 300, sections: [{ name: 'Types', minWords: 20 }, { name: 'Utilities', minWords: 15 }] },
    ],
    onboarding: {
      steps: [{ step: 'Build package', description: 'Compile shared package', required: true, estimatedMinutes: 2, verificationCommand: 'npm run build -w @qyou/shared' }],
      estimatedTotalMinutes: 2,
      requiredCheckpoints: ['build succeeds'],
    },
    coverage: { targetPercentage: 80, minimumFilesPerWorkspace: 2 },
    validation: { enforceSectionHeaders: false, checkDeadLinks: false, verifyCodeExamplesCompile: true },
  },
  {
    workspace: '@qyou/stellar',
    docsDir: 'packages/stellar/docs',
    maxOrphanedFiles: 0,
    files: [
      { filename: 'architecture.md', required: true, minChars: 300, sections: [{ name: 'Overview', minWords: 25 }, { name: 'Contracts', minWords: 20 }, { name: 'Usage', minWords: 15 }] },
      { filename: 'contracts.md', required: true, minChars: 400, sections: [{ name: 'Contract List', minWords: 20 }, { name: 'Deployment', minWords: 15 }, { name: 'Testing', minWords: 15 }] },
    ],
    onboarding: {
      steps: [{ step: 'Build package', description: 'Compile stellar package', required: true, estimatedMinutes: 3, verificationCommand: 'npm run build -w @qyou/stellar' }],
      estimatedTotalMinutes: 3,
      requiredCheckpoints: ['build succeeds', 'tests pass'],
    },
    coverage: { targetPercentage: 85, minimumFilesPerWorkspace: 2 },
    validation: { enforceSectionHeaders: false, checkDeadLinks: false, verifyCodeExamplesCompile: true },
  },
];

export function getDocsOnboardingPhase5Contract(name: string): DocsOnboardingPhase5Contract | undefined {
  return DOCS_ONBOARDING_PHASE5_CONTRACTS.find((c) => c.workspace === name);
}

export function validateDocsPhase5Contract(contract: DocsOnboardingPhase5Contract): string[] {
  const errors: string[] = [];
  if (contract.files.length < contract.coverage.minimumFilesPerWorkspace) {
    errors.push(`${contract.workspace}: file count ${contract.files.length} < minimum ${contract.coverage.minimumFilesPerWorkspace}`);
  }
  const totalRequired = contract.files.filter((f) => f.required).length;
  const totalMinChars = contract.files.reduce((s, f) => s + f.minChars, 0);
  if (totalRequired === 0) errors.push(`${contract.workspace}: at least one required file needed`);
  if (totalMinChars < 500) errors.push(`${contract.workspace}: combined minChars ${totalMinChars} < 500`);
  if (contract.onboarding.steps.length === 0) errors.push(`${contract.workspace}: must have onboarding steps`);
  return errors;
}
