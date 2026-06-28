export interface CiJobStep {
  name: string;
  run?: string;
  uses?: string;
  with?: Record<string, string>;
}

export interface CiJob {
  name: string;
  runsOn: string;
  steps: CiJobStep[];
  needsTypeCheck: boolean;
  needsLint: boolean;
  needsTest: boolean;
  needsBuild: boolean;
}

export interface CiWorkflow {
  name: string;
  trigger: string[];
  jobs: CiJob[];
}

export function validateCiPipeline(jobs: CiJob[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const job of jobs) {
    if (!job.runsOn) {
      errors.push(`${job.name}: missing runs-on`);
    }
    if (job.needsTypeCheck) {
      const has = job.steps.some((s) => s.name.toLowerCase().includes('typecheck'));
      if (!has) errors.push(`${job.name}: requires typecheck step`);
    }
    if (job.needsLint) {
      const has = job.steps.some((s) => s.name.toLowerCase().includes('lint'));
      if (!has) errors.push(`${job.name}: requires lint step`);
    }
    if (job.needsTest) {
      const has = job.steps.some((s) => s.name.toLowerCase().includes('test'));
      if (!has) errors.push(`${job.name}: requires test step`);
    }
    if (job.needsBuild) {
      const has = job.steps.some((s) => s.name.toLowerCase().includes('build'));
      if (!has) errors.push(`${job.name}: requires build step`);
    }
  }

  return { valid: errors.length === 0, errors };
}
