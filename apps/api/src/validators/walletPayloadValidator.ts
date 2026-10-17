export function validateWalletPayload(data: any): boolean {
  return typeof data?.address === 'string' && data.address.startsWith('G');
}
