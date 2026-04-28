import 'dotenv/config';

/** All variables that must appear in stellar/client/.env.example */
const REQUIRED_VARS = [
  'STELLAR_NETWORK',
  'STELLAR_SECRET_KEY',
  'STELLAR_TREASURY_PUBLIC_KEY',
  'STELLAR_ESCROW_PUBLIC_KEY',
  'STELLAR_FEE_COLLECTOR_PUBLIC_KEY',
] as const;

type EnvVar = (typeof REQUIRED_VARS)[number];

export interface EnvCheckResult {
  variable: EnvVar;
  present: boolean;
  hasPlaceholder: boolean;
}

/** Checks whether each required env variable is set and non-empty */
export function checkStellarEnv(): EnvCheckResult[] {
  return REQUIRED_VARS.map((variable) => {
    const value = process.env[variable];
    return {
      variable,
      present: value !== undefined && value.trim() !== '',
      hasPlaceholder: value?.startsWith('X') ?? false,
    };
  });
}

/** Prints a coverage report and returns false if any variable is missing */
export function validateStellarEnv(): boolean {
  const results = checkStellarEnv();
  let allPresent = true;

  console.log('\n🔍 Stellar environment coverage check:');
  for (const { variable, present, hasPlaceholder } of results) {
    const icon = present ? (hasPlaceholder ? '⚠️ ' : '✅') : '❌';
    const note = hasPlaceholder ? ' (placeholder — replace before use)' : '';
    console.log(`  ${icon} ${variable}${note}`);
    if (!present) allPresent = false;
  }

  if (!allPresent) {
    console.error('\n❌ Some Stellar env vars are missing. Copy stellar/client/.env.example and fill in values.\n');
  } else {
    console.log('\n✅ All Stellar env vars present.\n');
  }

  return allPresent;
}
