export interface CiJob {
  name: string;
  steps: string[];
  timeoutMinutes: number;
  required: boolean;
}

export interface CiPipelinePhase4Contract {
  workflowFile: string;
  jobs: CiJob[];
  nodeVersion: string;
  osImage: string;
  caching: boolean;
  cachePaths: string[];
  expectedDuration: number;
  lockFileRequired: boolean;
  hashVerification: boolean;
}

export const CI_PIPELINE_PHASE4_CONTRACTS: CiPipelinePhase4Contract[] = [
  {
    workflowFile: 'backend.yml',
    jobs: [
      { name: 'install', steps: ['actions/checkout@v4', 'actions/setup-node@v4', 'npm ci'], timeoutMinutes: 5, required: true },
      { name: 'typecheck', steps: ['npm run typecheck'], timeoutMinutes: 3, required: true },
      { name: 'lint', steps: ['npm run lint'], timeoutMinutes: 3, required: true },
      { name: 'test', steps: ['npm run test'], timeoutMinutes: 5, required: true },
      { name: 'build', steps: ['npm run build'], timeoutMinutes: 5, required: true },
    ],
    nodeVersion: '20.x',
    osImage: 'ubuntu-22.04',
    caching: true,
    cachePaths: ['node_modules', '.npm'],
    expectedDuration: 12,
    lockFileRequired: true,
    hashVerification: true,
  },
  {
    workflowFile: 'web.yml',
    jobs: [
      { name: 'install', steps: ['actions/checkout@v4', 'actions/setup-node@v4', 'npm ci'], timeoutMinutes: 5, required: true },
      { name: 'typecheck', steps: ['npm run typecheck'], timeoutMinutes: 3, required: true },
      { name: 'lint', steps: ['npm run lint'], timeoutMinutes: 3, required: true },
      { name: 'test', steps: ['npm run test'], timeoutMinutes: 5, required: true },
      { name: 'build', steps: ['npm run build'], timeoutMinutes: 10, required: true },
    ],
    nodeVersion: '20.x',
    osImage: 'ubuntu-22.04',
    caching: true,
    cachePaths: ['node_modules', '.npm', '.next/cache'],
    expectedDuration: 15,
    lockFileRequired: true,
    hashVerification: true,
  },
  {
    workflowFile: 'mobile.yml',
    jobs: [
      { name: 'install', steps: ['actions/checkout@v4', 'actions/setup-node@v4', 'npm ci'], timeoutMinutes: 5, required: true },
      { name: 'typecheck', steps: ['npm run typecheck'], timeoutMinutes: 3, required: true },
      { name: 'lint', steps: ['npm run lint'], timeoutMinutes: 3, required: true },
      { name: 'test', steps: ['npm run test'], timeoutMinutes: 10, required: true },
    ],
    nodeVersion: '20.x',
    osImage: 'ubuntu-22.04',
    caching: true,
    cachePaths: ['node_modules', '.npm'],
    expectedDuration: 20,
    lockFileRequired: true,
    hashVerification: true,
  },
  {
    workflowFile: 'packages.yml',
    jobs: [
      { name: 'install', steps: ['actions/checkout@v4', 'actions/setup-node@v4', 'npm ci'], timeoutMinutes: 5, required: true },
      { name: 'build', steps: ['npm run build'], timeoutMinutes: 5, required: true },
      { name: 'lint', steps: ['npm run lint'], timeoutMinutes: 3, required: true },
      { name: 'test', steps: ['npm run test'], timeoutMinutes: 5, required: false },
    ],
    nodeVersion: '20.x',
    osImage: 'ubuntu-22.04',
    caching: true,
    cachePaths: ['node_modules', '.npm'],
    expectedDuration: 10,
    lockFileRequired: true,
    hashVerification: true,
  },
];

export function getCiPipelinePhase4Contract(name: string): CiPipelinePhase4Contract | undefined {
  return CI_PIPELINE_PHASE4_CONTRACTS.find((c) => c.workflowFile === name);
}

export function validateCiPipelinePhase4Contract(contract: CiPipelinePhase4Contract): string[] {
  const errors: string[] = [];
  if (contract.jobs.length === 0) errors.push(`${contract.workflowFile}: no jobs defined`);
  if (!contract.lockFileRequired) errors.push(`${contract.workflowFile}: lock file must be required`);
  if (!contract.caching) errors.push(`${contract.workflowFile}: caching must be enabled`);
  if (contract.cachePaths.length === 0) errors.push(`${contract.workflowFile}: at least one cache path needed`);
  if (contract.expectedDuration < 5) errors.push(`${contract.workflowFile}: expected duration must be at least 5 minutes`);
  if (contract.jobs.filter((j) => j.required).length === 0) errors.push(`${contract.workflowFile}: at least one required job`);
  return errors;
}
