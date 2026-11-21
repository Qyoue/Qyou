import { validateAuthorizationHeader } from './api-client';

export function isTokenHeaderValid(token: string): boolean {
  const headerValue = `Bearer ${token}`;
  if (!token || token.split('.').length < 2) {
    return false;
  }
  return true;
}
