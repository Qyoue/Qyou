/**
 * Jailbreak / root detection and the policy applied to the result (#1354).
 * The decision and its rationale are in docs/security/mobile-device-integrity.md.
 */
export interface IntegritySignals {
  platform: 'ios' | 'android' | 'web';
  /** Files or apps typical of a jailbroken or rooted device. */
  suspiciousPathsFound: string[];
  /** The app is running under a debugger or an emulator. */
  debuggerAttached?: boolean;
  isEmulator?: boolean;
}

export type IntegrityVerdict = 'trusted' | 'compromised';
export type SensitiveAction = 'view' | 'link-wallet' | 'reveal-key' | 'sign-transaction';
export type PolicyDecision = { allowed: true; warn: boolean } | { allowed: false; reason: string };

const IOS_PATHS = ['/Applications/Cydia.app', '/Library/MobileSubstrate/MobileSubstrate.dylib', '/bin/bash', '/usr/sbin/sshd', '/etc/apt', '/private/var/lib/apt'];
const ANDROID_PATHS = ['/system/app/Superuser.apk', '/sbin/su', '/system/bin/su', '/system/xbin/su', '/data/local/xbin/su', '/data/local/bin/su', '/system/sd/xbin/su'];

/** Looks for known paths using an injected `fileExists` (a native file-system call). */
export async function collectIntegritySignals(
  platform: IntegritySignals['platform'],
  fileExists: (path: string) => Promise<boolean>,
  extras: Pick<IntegritySignals, 'debuggerAttached' | 'isEmulator'> = {},
): Promise<IntegritySignals> {
  const candidates = platform === 'ios' ? IOS_PATHS : platform === 'android' ? ANDROID_PATHS : [];
  const found: string[] = [];
  for (const path of candidates) {
    if (await fileExists(path)) found.push(path);
  }
  return { platform, suspiciousPathsFound: found, ...extras };
}

export function verdictFor(signals: IntegritySignals): IntegrityVerdict {
  return signals.suspiciousPathsFound.length > 0 || signals.debuggerAttached === true ? 'compromised' : 'trusted';
}

/**
 * Policy: a compromised device may still browse (`view`), but is warned, and may not
 * link a wallet, reveal a key or sign a transaction. Detection is heuristic and can be
 * bypassed, so this is risk reduction, not a guarantee.
 */
export function decide(action: SensitiveAction, signals: IntegritySignals): PolicyDecision {
  if (verdictFor(signals) === 'trusted') return { allowed: true, warn: false };
  if (action === 'view') return { allowed: true, warn: true };
  return { allowed: false, reason: 'This action is not available on a jailbroken or rooted device.' };
}
