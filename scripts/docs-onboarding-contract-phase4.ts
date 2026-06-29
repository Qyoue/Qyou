export interface DocsFile {
  filename: string;
  required: boolean;
  minChars: number;
}

export interface OnboardingStep {
  description: string;
  command: string;
  estimatedMinutes: number;
}

export interface DocsOnboardingPhase4Contract {
  workspace: string;
  files: DocsFile[];
  onboardingSteps: OnboardingStep[];
  estimatedSetupMinutes: number;
  coverageTarget: number;
}

export const DOCS_ONBOARDING_PHASE4_CONTRACTS: DocsOnboardingPhase4Contract[] = [
  {
    workspace: '@qyou/api',
    files: [
      { filename: 'development.md', required: true, minChars: 500 },
      { filename: 'architecture.md', required: true, minChars: 500 },
      { filename: 'testing.md', required: true, minChars: 300 },
      { filename: 'deployment.md', required: true, minChars: 200 },
      { filename: 'api-reference.md', required: true, minChars: 400 },
    ],
    onboardingSteps: [
      { description: 'Clone repository', command: 'git clone https://github.com/Qyoue/Qyou.git', estimatedMinutes: 2 },
      { description: 'Install dependencies', command: 'npm ci', estimatedMinutes: 3 },
      { description: 'Set up environment', command: 'cp .env.example .env', estimatedMinutes: 1 },
      { description: 'Build shared packages', command: 'npm run build -w @qyou/shared', estimatedMinutes: 2 },
      { description: 'Run tests', command: 'npm run test -w @qyou/api', estimatedMinutes: 3 },
    ],
    estimatedSetupMinutes: 11,
    coverageTarget: 90,
  },
  {
    workspace: '@qyou/web',
    files: [
      { filename: 'development.md', required: true, minChars: 400 },
      { filename: 'architecture.md', required: true, minChars: 400 },
      { filename: 'testing.md', required: true, minChars: 300 },
      { filename: 'component-library.md', required: true, minChars: 300 },
    ],
    onboardingSteps: [
      { description: 'Clone repository', command: 'git clone https://github.com/Qyoue/Qyou.git', estimatedMinutes: 2 },
      { description: 'Install dependencies', command: 'npm ci', estimatedMinutes: 3 },
      { description: 'Set up environment', command: 'cp .env.example .env', estimatedMinutes: 1 },
      { description: 'Start dev server', command: 'npm run dev -w @qyou/web', estimatedMinutes: 1 },
    ],
    estimatedSetupMinutes: 7,
    coverageTarget: 85,
  },
  {
    workspace: '@qyou/mobile',
    files: [
      { filename: 'development.md', required: true, minChars: 400 },
      { filename: 'architecture.md', required: true, minChars: 400 },
      { filename: 'testing.md', required: true, minChars: 250 },
    ],
    onboardingSteps: [
      { description: 'Clone repository', command: 'git clone https://github.com/Qyoue/Qyou.git', estimatedMinutes: 2 },
      { description: 'Install dependencies', command: 'npm ci', estimatedMinutes: 3 },
      { description: 'Start Expo', command: 'npm run dev -w @qyou/mobile', estimatedMinutes: 1 },
    ],
    estimatedSetupMinutes: 6,
    coverageTarget: 80,
  },
  {
    workspace: '@qyou/shared',
    files: [
      { filename: 'architecture.md', required: true, minChars: 300 },
      { filename: 'api-reference.md', required: true, minChars: 300 },
    ],
    onboardingSteps: [
      { description: 'Build shared package', command: 'npm run build -w @qyou/shared', estimatedMinutes: 2 },
    ],
    estimatedSetupMinutes: 2,
    coverageTarget: 80,
  },
  {
    workspace: '@qyou/stellar',
    files: [
      { filename: 'architecture.md', required: true, minChars: 300 },
      { filename: 'contracts.md', required: true, minChars: 400 },
    ],
    onboardingSteps: [
      { description: 'Build stellar package', command: 'npm run build -w @qyou/stellar', estimatedMinutes: 3 },
    ],
    estimatedSetupMinutes: 3,
    coverageTarget: 85,
  },
];

export function getDocsOnboardingPhase4Contract(name: string): DocsOnboardingPhase4Contract | undefined {
  return DOCS_ONBOARDING_PHASE4_CONTRACTS.find((c) => c.workspace === name);
}

export function validateDocsOnboardingPhase4Contract(contract: DocsOnboardingPhase4Contract): string[] {
  const errors: string[] = [];
  if (contract.files.length === 0) errors.push(`${contract.workspace}: no files defined`);
  const requiredFiles = contract.files.filter((f) => f.required);
  if (requiredFiles.length === 0) errors.push(`${contract.workspace}: no required files defined`);
  if (contract.onboardingSteps.length < 2) errors.push(`${contract.workspace}: at least 2 onboarding steps required`);
  if (contract.coverageTarget < 50) errors.push(`${contract.workspace}: coverage target must be at least 50%`);
  return errors;
}
