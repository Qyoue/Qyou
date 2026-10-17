/**
 * Stellar Secret Key Redaction and Log Sanitizer (#1024)
 *
 * Enforces security invariant: Never log full or partial Stellar secret keys.
 * Detects Stellar Ed25519 Secret Seeds (format: S + 55 RFC 4648 Base32 characters)
 * and replaces them with [REDACTED_STELLAR_SECRET_KEY].
 */

export const STELLAR_SECRET_KEY_REGEX = /\bS[A-Z2-7]{55}\b/g;

export function redactStellarSecretKeys(input: string): string {
  if (typeof input !== 'string') return input;
  return input.replace(STELLAR_SECRET_KEY_REGEX, '[REDACTED_STELLAR_SECRET_KEY]');
}

export function sanitizeLogData(data: unknown): unknown {
  if (typeof data === 'string') {
    return redactStellarSecretKeys(data);
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogData(item));
  }

  if (data !== null && typeof data === 'object') {
    const sanitizedObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      // Direct key name scrubbing
      if (
        /secret|privateKey|adminSignerKey|seed|signerKey/i.test(key) &&
        typeof value === 'string'
      ) {
        sanitizedObj[key] = '[REDACTED_SECRET]';
      } else {
        sanitizedObj[key] = sanitizeLogData(value);
      }
    }
    return sanitizedObj;
  }

  return data;
}

export const LogSanitizer = {
  redact: redactStellarSecretKeys,
  maskString: redactStellarSecretKeys,
  sanitize: sanitizeLogData,
};
