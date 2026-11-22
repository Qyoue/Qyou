'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { QueueItem } from '@qyou/shared';
import { getQueue } from '../../../lib/queue-api-contract-client';
import { getJson, postJson, deleteJson } from '../../../lib/api-client';

interface MembershipState {
  positionNumber?: number;
  joined: boolean;
}

export default function QueueDetailPage() {
  const params = useParams<{ id: string }>();
  const queueId = params?.id;
  const [queue, setQueue] = useState<QueueItem | null>(null);
  const [membership, setMembership] = useState<MembershipState>({ joined: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!queueId) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    Promise.all([
      getQueue(queueId, controller.signal),
      getJson<{ positionNumber?: number; joined?: boolean }>(`/api/v1/queues/${queueId}/membership`, { signal: controller.signal }).catch(() => ({ joined: false })),
    ])
      .then(([q, m]) => {
        setQueue(q);
        setMembership({ joined: Boolean(m?.joined), positionNumber: m?.positionNumber });
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to load queue.');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [queueId]);

  async function join() {
    if (!queueId) return;
    setBusy(true); setActionError(null);
    try {
      const res = await postJson<{ positionNumber?: number }>(`/api/v1/queues/${queueId}/join`, {});
      setMembership({ joined: true, positionNumber: res?.positionNumber });
      setQueue((q) => q ? { ...q, activeCount: q.activeCount + 1 } : q);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Unable to join queue.');
    } finally { setBusy(false); }
  }

  async function leave() {
    if (!queueId) return;
    setBusy(true); setActionError(null);
    try {
      await deleteJson(`/api/v1/queues/${queueId}/leave`);
      setMembership({ joined: false, positionNumber: undefined });
      setQueue((q) => q ? { ...q, activeCount: Math.max(0, q.activeCount - 1) } : q);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Unable to leave queue.');
    } finally { setBusy(false); }
  }

  if (loading) return <main style={{ padding: '2rem' }}><p role="status">Loading queue...</p></main>;
  if (error) return <main style={{ padding: '2rem' }}><p role="alert">{error}</p></main>;
  if (!queue) return <main style={{ padding: '2rem' }}><p>Queue not found.</p></main>;

  return (
    <main style={{ maxWidth: 720, margin: '2rem auto', padding: '0 1rem', display: 'grid', gap: 12 }}>
      <h1 style={{ margin: 0 }}>{queue.name}</h1>
      <p>Category: {queue.category}</p>
      <p><strong>Wait estimate:</strong> ~{queue.currentWaitTimeMinutes} min</p>
      <p><strong>Members:</strong> {queue.activeCount}</p>
      <p><strong>Your position:</strong> {membership.joined ? (membership.positionNumber ?? 'Pending') : 'Not in queue'}</p>

      {actionError && <p role="alert">{actionError}</p>}

      {membership.joined ? (
        <button type="button" onClick={leave} disabled={busy}>Leave queue</button>
      ) : (
        <button type="button" onClick={join} disabled={busy}>Join queue</button>
      )}
    </main>
  );
}
