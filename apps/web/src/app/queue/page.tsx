'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { QueueItem } from '@qyou/shared';
import { listQueues } from '../../lib/queue-api-contract-client';

export default function QueuePage() {
  const [queues, setQueues] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    listQueues(controller.signal)
      .then((data) => setQueues(data))
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to load queues.');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  return (
    <main style={{ maxWidth: '720px', margin: '2rem auto', padding: '0 1rem', display: 'grid', gap: '1rem' }}>
      <h1 style={{ margin: 0 }}>Queues</h1>

      {loading && <p role="status">Loading queues...</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && queues.length === 0 && <p>No queues available.</p>}

      {!loading && !error && queues.length > 0 && (
        <ul style={{ display: 'grid', gap: 12, padding: 0, listStyle: 'none' }}>
          {queues.map((q) => (
            <li key={q.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
              <Link href={`/queue/${q.id}`}><strong>{q.name}</strong></Link>
              <div>{q.category} · {q.activeCount} active · ~{q.currentWaitTimeMinutes} min wait</div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
