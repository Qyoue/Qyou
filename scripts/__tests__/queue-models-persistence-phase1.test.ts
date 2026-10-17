import { describe, it, expect } from 'vitest';
import { QUEUE_MODELS_PERSISTENCE_CONTRACT, validateQueueModelsPersistence } from '../queue-models-persistence-contract-phase1';

describe('Queue Shared Models, Persistence & Operator Controls Phase 1', () => {
  it('validates queue models persistence contract with zero errors', () => {
    const errors = validateQueueModelsPersistence(QUEUE_MODELS_PERSISTENCE_CONTRACT);
    expect(errors).toHaveLength(0);
  });

  it('verifies operator moderation controls and discovery edge case settings', () => {
    expect(QUEUE_MODELS_PERSISTENCE_CONTRACT.moderationControls).toHaveLength(3);
    expect(QUEUE_MODELS_PERSISTENCE_CONTRACT.discoveryEdgeCases.emptySearchFallback).toBe('return_popular_queues');
  });
});
