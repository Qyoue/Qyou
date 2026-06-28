export interface CiPipelinePhase5Job {
  name: string;
  steps: string[];
  timeoutMinutes: number;
  required: boolean;
  failureHandling: 'abort' | 'continue';
  retryCount: number;
  cacheKey: string;
  runner: string;
}

export interface CiPipelinePhase5Contract {
  workflowFile: string;
  jobs: CiPipelinePhase5Job[];
  reproducibility: {
    lockFileRequired: boolean;
    nodeVersion: string;
    osImage: string;
    hashVerification: boolean;
  };
  caching: {
    enabled: boolean;
    paths: string[];
    keyStrategy: string;
  };
  stability: {
    expectedDuration: number;
    flakeDetection: boolean;
    maxRetriesPerJob: number;
    notifyOnFailure: string;
  };
  postSteps: string[];
}

export const CI_PIPELINE_PHASE5_CONTRACTS: CiPipelinePhase5Contract[] = [
  {
    workflowFile: 'backend.yml',
    jobs: [
      { name: 'install', steps: ['actions/checkout@v4', 'actions/setup-node@v4', 'npm ci'], timeoutMinutes: 5, required: true, failureHandling: 'abort', retryCount: 0, cacheKey: 'npm-${{ hashFiles(\"package-lock.json\") }}', runner: 'ubuntu-latest' },
      { name: 'lint', steps: ['npm run lint'], timeoutMinutes: 3, required: true, failureHandling: 'abort', retryCount: 0, cacheKey: '', runner: 'ubuntu-latest' },
      { name: 'typecheck', steps: ['npm run typecheck'], timeoutMinutes: 3, required: true, failureHandling: 'abort', retryCount: 0, cacheKey: '', runner: 'ubuntu-latest' },
      { name: 'test', steps: ['npm run test'], timeoutMinutes: 5, required: true, failureHandling: 'abort', retryCount: 1, cacheKey: '', runner: 'ubuntu-latest' },
      { name: 'build', steps: ['npm run build'], timeoutMinutes: 5, required: true, failureHandling: 'abort', retryCount: 1, cacheKey: '', runner: 'ubuntu-latest' },
    ],
    reproducibility: { lockFileRequired: true, nodeVersion: '20.x', osImage: 'ubuntu-22.04', hashVerification: true },
    caching: { enabled: true, paths: ['node_modules', '.npm'], keyStrategy: 'lockfile-hash' },
    stability: { expectedDuration: 12, flakeDetection: true, maxRetriesPerJob: 1, notifyOnFailure: 'slack' },
    postSteps: ['upload-test-results', 'upload-build-artifacts'],
  },
  {
    workflowFile: 'web.yml',
    jobs: [
      { name: 'install', steps: ['actions/checkout@v4', 'actions/setup-node@v4', 'npm ci'], timeoutMinutes: 5, required: true, failureHandling: 'abort', retryCount: 0, cacheKey: 'npm-${{ hashFiles(\"package-lock.json\") }}', runner: 'ubuntu-latest' },
      { name: 'lint', steps: ['npm run lint'], timeoutMinutes: 3, required: true, failureHandling: 'abort', retryCount: 0, cacheKey: '', runner: 'ubuntu-latest' },
      { name: 'test', steps: ['npm run test'], timeoutMinutes: 5, required: true, failureHandling: 'abort', retryCount: 1, cacheKey: '', runner: 'ubuntu-latest' },
      { name: 'build', steps: ['npm run build'], timeoutMinutes: 10, required: true, failureHandling: 'abort', retryCount: 1, cacheKey: '', runner: 'ubuntu-latest' },
    ],
    reproducibility: { lockFileRequired: true, nodeVersion: '20.x', osImage: 'ubuntu-22.04', hashVerification: true },
    caching: { enabled: true, paths: ['node_modules', '.npm', '.next/cache'], keyStrategy: 'lockfile-hash' },
    stability: { expectedDuration: 15, flakeDetection: true, maxRetriesPerJob: 1, notifyOnFailure: 'slack' },
    postSteps: ['upload-test-results', 'upload-build-artifacts'],
  },
  {
    workflowFile: 'mobile.yml',
    jobs: [
      { name: 'install', steps: ['actions/checkout@v4', 'actions/setup-node@v4', 'npm ci'], timeoutMinutes: 5, required: true, failureHandling: 'abort', retryCount: 0, cacheKey: 'npm-${{ hashFiles(\"package-lock.json\") }}', runner: 'ubuntu-latest' },
      { name: 'lint', steps: ['npm run lint'], timeoutMinutes: 3, required: true, failureHandling: 'abort', retryCount: 0, cacheKey: '', runner: 'ubuntu-latest' },
      { name: 'test', steps: ['npm run test'], timeoutMinutes: 10, required: true, failureHandling: 'abort', retryCount: 1, cacheKey: '', runner: 'ubuntu-latest' },
      { name: 'build', steps: ['npm run build'], timeoutMinutes: 15, required: true, failureHandling: 'abort', retryCount: 2, cacheKey: '', runner: 'ubuntu-latest' },
    ],
    reproducibility: { lockFileRequired: true, nodeVersion: '20.x', osImage: 'ubuntu-22.04', hashVerification: true },
    caching: { enabled: true, paths: ['node_modules', '.npm'], keyStrategy: 'lockfile-hash' },
    stability: { expectedDuration: 20, flakeDetection: true, maxRetriesPerJob: 2, notifyOnFailure: 'slack' },
    postSteps: ['upload-test-results'],
  },
  {
    workflowFile: 'packages.yml',
    jobs: [
      { name: 'install', steps: ['actions/checkout@v4', 'actions/setup-node@v4', 'npm ci'], timeoutMinutes: 5, required: true, failureHandling: 'abort', retryCount: 0, cacheKey: 'npm-${{ hashFiles(\"package-lock.json\") }}', runner: 'ubuntu-latest' },
      { name: 'build', steps: ['npm run build'], timeoutMinutes: 5, required: true, failureHandling: 'abort', retryCount: 0, cacheKey: '', runner: 'ubuntu-latest' },
      { name: 'lint', steps: ['npm run lint'], timeoutMinutes: 3, required: true, failureHandling: 'abort', retryCount: 0, cacheKey: '', runner: 'ubuntu-latest' },
      { name: 'test', steps: ['npm run test'], timeoutMinutes: 5, required: false, failureHandling: 'continue', retryCount: 1, cacheKey: '', runner: 'ubuntu-latest' },
    ],
    reproducibility: { lockFileRequired: true, nodeVersion: '20.x', osImage: 'ubuntu-22.04', hashVerification: true },
    caching: { enabled: true, paths: ['node_modules', '.npm'], keyStrategy: 'lockfile-hash' },
    stability: { expectedDuration: 10, flakeDetection: false, maxRetriesPerJob: 1, notifyOnFailure: 'email' },
    postSteps: ['upload-test-results'],
  },
];

export function getCiPipelinePhase5Contract(fileName: string): CiPipelinePhase5Contract | undefined {
  return CI_PIPELINE_PHASE5_CONTRACTS.find((c) => c.workflowFile === fileName);
}

export function validateCiPipelinePhase5(contract: CiPipelinePhase5Contract): string[] {
  const errors: string[] = [];
  if (!contract.reproducibility.lockFileRequired) errors.push(`${contract.workflowFile}: lockFileRequired must be true`);
  if (!contract.reproducibility.hashVerification) errors.push(`${contract.workflowFile}: hashVerification must be true`);
  if (!contract.caching.enabled) errors.push(`${contract.workflowFile}: caching must be enabled`);
  const timeoutSum = contract.jobs.reduce((s, j) => s + j.timeoutMinutes, 0);
  if (timeoutSum < 5) errors.push(`${contract.workflowFile}: total job time must be at least 5 minutes`);
  if (contract.jobs.filter((j) => j.required).length === 0) errors.push(`${contract.workflowFile}: at least one required job needed`);
  return errors;
}
