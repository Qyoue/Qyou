/**
 * Shared frontend environment validation helpers.
 *
 * Provides a typed, throw-on-failure helper that both the mobile (Expo) and
 * admin-web (Next.js) workspaces can call at boot time to surface missing or
 * malformed env vars before the app renders.
 */

export interface EnvRule {
  /** Human-readable name shown in error messages. */
  label: string;
  /** Returns an error string when the value is invalid, otherwise null. */
  validate: (value: string | undefined) => string | null;
}

/** Require the variable to be present and non-empty. */
export const required: EnvRule = {
  label: 'required',
  validate: (v) => (v ? null : 'is required'),
};

/** Require the variable to be a valid URL. */
export const isUrl: EnvRule = {
  label: 'valid URL',
  validate: (v) => {
    if (!v) return null; // let `required` handle absence
    try {
      new URL(v);
      return null;
    } catch {
      return 'must be a valid URL';
    }
  },
};

/** Require the variable to match one of the allowed values. */
export function oneOf(...allowed: string[]): EnvRule {
  return {
    label: `one of [${allowed.join(', ')}]`,
    validate: (v) =>
      v && allowed.includes(v) ? null : `must be one of: ${allowed.join(', ')}`,
  };
}

/** Validate a map of env-var names to their rules and throw on failure. */
export function assertEnv(
  schema: Record<string, EnvRule[]>,
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): void {
  const errors: string[] = [];

  for (const [key, rules] of Object.entries(schema)) {
    for (const rule of rules) {
      const error = rule.validate(env[key]);
      if (error) {
        errors.push(`${key} ${error}`);
        break;
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Boot-time env validation failed:\n${errors.map((e) => `  • ${e}`).join('\n')}`);
  }
}
