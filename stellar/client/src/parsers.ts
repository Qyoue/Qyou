export function parseLedgerHash(hash: string): string | null {
  if (!hash || typeof hash !== 'string') return null;
  const trimmed = hash.trim();
  if (trimmed.length !== 64 || !/^[a-f0-9]+$/i.test(trimmed)) return null;
  return trimmed.toLowerCase();
}

export function parseTransactionReference(ref: string): string | null {
  if (!ref || typeof ref !== 'string') return null;
  const trimmed = ref.trim();
  if (trimmed.length !== 64 || !/^[a-f0-9]+$/i.test(trimmed)) return null;
  return trimmed.toLowerCase();
}
