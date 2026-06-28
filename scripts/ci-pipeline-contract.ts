export interface CiJobDef {
  name: string;
  steps: string[];
  timeoutMinutes: number;
  required: boolean;
  failureHandling: 'abort' | 'continue';
}

export interface CiPipelineContract {
  workflowFile: string;
  jobs: CiJobDef[];
  envChecks?: string[];
  postSteps?: string[];
}

export const CI_PIPELINE_CONTRACTS: CiPipelineContract[] = [
  {
    workflowFile: 'backend.yml',
    jobs: [
      { name: 'install', steps: ['actions/checkout@v4', 'actions/setup-node@v4', 'npm ci'], timeoutMinutes: 5, required: true, failureHandling: 'abort' },
      { name: 'lint', steps: ['eslint'], timeoutMinutes: 3, required: true, failureHandling: 'abort' },
      { name: 'test', steps: ['node --test'], timeoutMinutes: 5, required: true, failureHandling: 'abort' },
      { name: 'build', steps: ['tsc'], timeoutMinutes: 5, required: true, failureHandling: 'abort' },
    ],
  },
  {
    workflowFile: 'web.yml',
    jobs: [
      { name: 'install', steps: ['actions/checkout@v4', 'actions/setup-node@v4', 'npm ci'], timeoutMinutes: 5, required: true, failureHandling: 'abort' },
      { name: 'lint', steps: ['eslint'], timeoutMinutes: 3, required: true, failureHandling: 'abort' },
      { name: 'test', steps: ['jest'], timeoutMinutes: 5, required: true, failureHandling: 'abort' },
      { name: 'build', steps: ['next build'], timeoutMinutes: 10, required: true, failureHandling: 'abort' },
    ],
  },
  {
    workflowFile: 'mobile.yml',
    jobs: [
      { name: 'install', steps: ['actions/checkout@v4', 'actions/setup-node@v4', 'npm ci'], timeoutMinutes: 5, required: true, failureHandling: 'abort' },
      { name: 'lint', steps: ['eslint'], timeoutMinutes: 3, required: true, failureHandling: 'abort' },
      { name: 'test', steps: ['jest'], timeoutMinutes: 5, required: true, failureHandling: 'abort' },
    ],
  },
  {
    workflowFile: 'packages.yml',
    jobs: [
      { name: 'install', steps: ['actions/checkout@v4', 'actions/setup-node@v4', 'npm ci'], timeoutMinutes: 5, required: true, failureHandling: 'abort' },
      { name: 'build', steps: ['tsc'], timeoutMinutes: 5, required: true, failureHandling: 'abort' },
      { name: 'lint', steps: ['eslint'], timeoutMinutes: 3, required: true, failureHandling: 'abort' },
    ],
  },
];

export function getPipelineContract(fileName: string): CiPipelineContract | undefined {
  return CI_PIPELINE_CONTRACTS.find((c) => c.workflowFile === fileName);
}
