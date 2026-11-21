export function formatStellarBalance(amount: number | string): string {
  return Number(amount).toLocaleString(undefined, { minimumFractionDigits: 7 });
}
