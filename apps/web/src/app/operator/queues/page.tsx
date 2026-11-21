'use client';

import { useState } from 'react';
import type { QueueItem } from '@qyou/shared';
import { OperatorQueueForm } from '../../../components/OperatorQueueForm';

export default function OperatorQueuesPage() {
  const [queues, setQueues] = useState<QueueItem[]>([]);
  const [editing, setEditing] = useState<QueueItem | null>(null);

  function handleOptimistic(queue: QueueItem, mode: 'create' | 'edit') {
    setQueues((prev) => {
      if (mode === 'create') return [queue, ...prev];
      return prev.map((q) => (q.id === queue.id ? queue : q));
    });
  }

  function handleSaved(queue: QueueItem, mode: 'create' | 'edit') {
    setQueues((prev) => {
      if (mode === 'create') return [queue, ...prev.filter((q) => q.id !== queue.id && !q.id.startsWith('temp-'))];
      return prev.map((q) => (q.id === queue.id || q.id === editing?.id ? queue : q));
    });
    setEditing(null);
  }

  function handleRollback(_original: QueueItem | null, mode: 'create' | 'edit') {
    setQueues((prev) => {
      if (mode === 'create') return prev.filter((q) => !q.id.startsWith('temp-'));
      if (_original) return prev.map((q) => (q.id === _original.id ? _original : q));
      return prev;
    });
  }

  return (
    <main style={{ maxWidth: 720, margin: '2rem auto', padding: '0 1rem', display: 'grid', gap: 16 }}>
      <h1 style={{ margin: 0 }}>Operator queues</h1>
      <OperatorQueueForm
        key={editing?.id ?? 'new'}
        initialQueue={editing}
        onOptimistic={handleOptimistic}
        onSaved={handleSaved}
        onRollback={handleRollback}
      />
      <section aria-label="Queues list">
        <h2>Queues</h2>
        {queues.length === 0 ? <p>No queues yet.</p> : (
          <ul>
            {queues.map((q) => (
              <li key={q.id}>
                <strong>{q.name}</strong> ({q.category}){' '}
                <button type="button" onClick={() => setEditing(q)}>Edit</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
