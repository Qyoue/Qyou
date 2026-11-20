/**
 * Certificate pinning configuration and verification (#1355).
 *
 * Decision: pinning is NOT enabled yet (see docs/security/mobile-certificate-pinning.md).
 * This module holds the pin format and the check so that enabling it later is a native
 * integration, not a design task. Pins are base64 SHA-256 hashes of the certificate's
 * SubjectPublicKeyInfo (SPKI), never of the leaf certificate itself.
 */
export interface PinConfig {
  /** Host the pins apply to, for example api.qyou.example. */
  host: string;
  /** At least two pins: the current key and a backup, so rotation cannot lock users out. */
  pins: string[];
  /** Pins are not enforced after this date (ISO), so a forgotten rotation expires safely. */
  expiresAt: string;
}

const SPKI_PIN = /^[A-Za-z0-9+/]{43}=$/;

export function validatePinConfig(config: PinConfig, now: Date = new Date()): string[] {
  const problems: string[] = [];
  if (!config.host) problems.push('host is required');
  if (config.pins.length < 2) problems.push('at least two pins (current and backup) are required');
  for (const pin of config.pins) if (!SPKI_PIN.test(pin)) problems.push(`invalid pin: ${pin}`);
  if (new Set(config.pins).size !== config.pins.length) problems.push('duplicate pins');
  const expires = Date.parse(config.expiresAt);
  if (Number.isNaN(expires)) problems.push('expiresAt must be an ISO date');
  else if (expires <= now.getTime()) problems.push('pin set has expired');
  return problems;
}

/** True when any certificate in the presented chain matches a configured pin. */
export function chainMatchesPins(chainSpkiHashes: string[], config: PinConfig): boolean {
  return chainSpkiHashes.some((hash) => config.pins.includes(hash));
}
