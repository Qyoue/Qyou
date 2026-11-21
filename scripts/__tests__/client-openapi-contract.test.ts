import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  KNOWN_DRIFT,
  extractApiPaths,
  findDrift,
  isDocumented,
} from '../client-openapi-contract.js';

describe('client / OpenAPI contract (#1384)', () => {
  it('extracts /api paths from string and template literals', () => {
    const src = "post('/api/auth/login'); fetch(`/api/stellar/wallet/${id}`); const a = '/apix';";
    assert.deepEqual(extractApiPaths(src).sort(), ['/api/auth/login', '/api/stellar/wallet/']);
  });

  it('treats a base path as documented when the spec has paths below it', () => {
    const spec = new Set(['/api/stellar/wallet']);
    assert.equal(isDocumented('/api/stellar', spec), true);
    assert.equal(isDocumented('/api/stellar/wallet', spec), true);
    assert.equal(isDocumented('/api/rewards', spec), false);
  });

  it('every path the web and mobile clients call is documented or a known drift', () => {
    const { undocumented } = findDrift();
    assert.deepEqual(undocumented, [], `undocumented client paths: ${undocumented.join(', ')}`);
  });

  it('has no stale KNOWN_DRIFT entries', () => {
    const { stale } = findDrift();
    assert.deepEqual(stale, [], `stale entries: ${stale.join(', ')}; known: ${Object.keys(KNOWN_DRIFT).join(', ')}`);
  });
});
