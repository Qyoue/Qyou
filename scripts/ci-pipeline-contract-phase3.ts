export interface CiPipelineRule {
  rule: string;
  description: string;
  required: boolean;
  check: 'yaml-key' | 'yaml-content' | 'step-order' | 'file-exists';
  target: string;
}

export interface CiPipelineContractPhase3 {
  workflowFile: string;
  rules: CiPipelineRule[];
}

export const CI_CONTRACTS_PHASE3: CiPipelineContractPhase3[] = [
  {
    workflowFile: 'backend.yml',
    rules: [
      { rule: 'timeout-minutes', description: 'Job must declare timeout-minutes', required: true, check: 'yaml-key', target: 'timeout-minutes' },
      { rule: 'pinned-actions', description: 'All actions must be pinned to a version (not @main/@master)', required: true, check: 'yaml-content', target: '@' },
      { rule: 'npm-ci', description: 'Must use npm ci not npm install', required: true, check: 'yaml-content', target: 'npm ci' },
      { rule: 'no-npm-install', description: 'Must not use npm install', required: true, check: 'yaml-content', target: 'npm install' },
      { rule: 'step-order', description: 'Install must come before lint/test/build', required: true, check: 'step-order', target: 'install' },
    ],
  },
  {
    workflowFile: 'web.yml',
    rules: [
      { rule: 'timeout-minutes', description: 'Job must declare timeout-minutes', required: true, check: 'yaml-key', target: 'timeout-minutes' },
      { rule: 'pinned-actions', description: 'All actions must be pinned to a version', required: true, check: 'yaml-content', target: '@' },
      { rule: 'npm-ci', description: 'Must use npm ci', required: true, check: 'yaml-content', target: 'npm ci' },
      { rule: 'no-npm-install', description: 'Must not use npm install', required: true, check: 'yaml-content', target: 'npm install' },
      { rule: 'step-order', description: 'Install must come before lint/test/build', required: true, check: 'step-order', target: 'install' },
    ],
  },
  {
    workflowFile: 'mobile.yml',
    rules: [
      { rule: 'timeout-minutes', description: 'Job must declare timeout-minutes', required: true, check: 'yaml-key', target: 'timeout-minutes' },
      { rule: 'pinned-actions', description: 'All actions must be pinned to a version', required: true, check: 'yaml-content', target: '@' },
      { rule: 'npm-ci', description: 'Must use npm ci', required: true, check: 'yaml-content', target: 'npm ci' },
      { rule: 'no-npm-install', description: 'Must not use npm install', required: true, check: 'yaml-content', target: 'npm install' },
      { rule: 'step-order', description: 'Install must come before lint/test', required: true, check: 'step-order', target: 'install' },
    ],
  },
  {
    workflowFile: 'packages.yml',
    rules: [
      { rule: 'timeout-minutes', description: 'Job must declare timeout-minutes', required: true, check: 'yaml-key', target: 'timeout-minutes' },
      { rule: 'pinned-actions', description: 'All actions must be pinned to a version', required: true, check: 'yaml-content', target: '@' },
      { rule: 'npm-ci', description: 'Must use npm ci', required: true, check: 'yaml-content', target: 'npm ci' },
      { rule: 'no-npm-install', description: 'Must not use npm install', required: true, check: 'yaml-content', target: 'npm install' },
      { rule: 'step-order', description: 'Install must come before build/lint', required: true, check: 'step-order', target: 'install' },
    ],
  },
];

export function getCiContractPhase3(fileName: string): CiPipelineContractPhase3 | undefined {
  return CI_CONTRACTS_PHASE3.find((c) => c.workflowFile === fileName);
}

export function validateWorkflowAgainstContract(
  content: string,
  contract: CiPipelineContractPhase3,
): { passed: string[]; failed: string[] } {
  const passed: string[] = [];
  const failed: string[] = [];

  for (const rule of contract.rules) {
    const lines = content.split('\n');
    const installIdx = content.indexOf('name: Install dependencies');
    const lintIdx = content.indexOf('name: Lint');

    if (rule.rule === 'step-order') {
      if (installIdx !== -1 && lintIdx !== -1 && installIdx < lintIdx) {
        passed.push(rule.rule);
      } else {
        failed.push(rule.rule);
      }
    } else if (rule.check === 'yaml-key') {
      if (content.includes(`${rule.target}:`)) {
        passed.push(rule.rule);
      } else {
        failed.push(rule.rule);
      }
    } else if (rule.check === 'yaml-content') {
      if (rule.target === 'npm install') {
        if (!content.includes('npm install')) {
          passed.push(rule.rule);
        } else {
          failed.push(rule.rule);
        }
      } else {
        if (content.includes(rule.target)) {
          passed.push(rule.rule);
        } else {
          failed.push(rule.rule);
        }
      }
    }
  }

  return { passed, failed };
}
