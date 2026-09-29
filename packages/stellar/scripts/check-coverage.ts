/**
 * Coverage Threshold Enforcement Script (#1045)
 *
 * Runs the test suite with code coverage and verifies that coverage
 * meets or exceeds the required project thresholds.
 */

import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const stellarDir = path.resolve(__dirname, '..');

const MIN_LINE_COVERAGE = 85.0;
const MIN_BRANCH_COVERAGE = 80.0;
const MIN_FUNCTION_COVERAGE = 85.0;

console.log('📊 Running @qyou/stellar tests with coverage reporting (#1045)...');

let output = '';
try {
  output = execSync(
    'node --import tsx --test --experimental-test-coverage tests/**/*.test.ts',
    {
      cwd: stellarDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }
  );
} catch (err: any) {
  output = (err.stdout ? err.stdout.toString() : '') + (err.stderr ? err.stderr.toString() : '');
  console.error(output);
  console.error('❌ Tests failed during coverage run.');
  process.exit(1);
}

console.log(output);

// Parse "all files | line % | branch % | funcs %" line (handles terminal ellipsis like …les)
const summaryMatch = output.match(
  /(?:all files|\.\.\.les|…les)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)/
);

if (!summaryMatch) {
  console.error('❌ Could not parse overall coverage statistics from report.');
  process.exit(1);
}

const linePct = parseFloat(summaryMatch[1]);
const branchPct = parseFloat(summaryMatch[2]);
const funcPct = parseFloat(summaryMatch[3]);

console.log('--------------------------------------------------');
console.log(`Line Coverage:     ${linePct}% (Minimum required: ${MIN_LINE_COVERAGE}%)`);
console.log(`Branch Coverage:   ${branchPct}% (Minimum required: ${MIN_BRANCH_COVERAGE}%)`);
console.log(`Function Coverage: ${funcPct}% (Minimum required: ${MIN_FUNCTION_COVERAGE}%)`);
console.log('--------------------------------------------------');

const failures: string[] = [];

if (linePct < MIN_LINE_COVERAGE) {
  failures.push(`Line coverage ${linePct}% is below required ${MIN_LINE_COVERAGE}%`);
}
if (branchPct < MIN_BRANCH_COVERAGE) {
  failures.push(`Branch coverage ${branchPct}% is below required ${MIN_BRANCH_COVERAGE}%`);
}
if (funcPct < MIN_FUNCTION_COVERAGE) {
  failures.push(`Function coverage ${funcPct}% is below required ${MIN_FUNCTION_COVERAGE}%`);
}

if (failures.length > 0) {
  console.error('❌ Coverage Threshold Check FAILED:');
  for (const failure of failures) {
    console.error(`   - ${failure}`);
  }
  process.exit(1);
}

console.log('✅ All coverage thresholds successfully satisfied!');
