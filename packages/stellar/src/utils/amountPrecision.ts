export function stroopsToStellar(stroops: bigint): string {
  return (Number(stroops) / 1e7).toFixed(7);
}
