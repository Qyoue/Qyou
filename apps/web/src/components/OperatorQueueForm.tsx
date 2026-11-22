'use client';

import { useState, type FormEvent } from 'react';
import { createQueueSchema, updateQueueSchema, type CreateQueueInput, type QueueItem } from '@qyou/shared';
import { postJson, putJson } from '../lib/api-client';

interface OperatorQueueFormProps {
  initialQueue?: QueueItem | null;
  onSaved?: (queue: QueueItem, mode: 'create' | 'edit') => void;
  onOptimistic?: (queue: QueueItem, mode: 'create' | 'edit') => void;
  onRollback?: (queue: QueueItem | null, mode: 'create' | 'edit') => void;
}

const categories = ['bank', 'hospital', 'fuel_station', 'service_center', 'other'] as const;

export function OperatorQueueForm({ initialQueue = null, onSaved, onOptimistic, onRollback }: OperatorQueueFormProps) {
  const isEdit = Boolean(initialQueue?.id);
  const [name, setName] = useState(initialQueue?.name ?? '');
  const [category, setCategory] = useState<CreateQueueInput['category']>(initialQueue?.category ?? 'other');
  const [latitude, setLatitude] = useState(String(initialQueue?.location.latitude ?? ''));
  const [longitude, setLongitude] = useState(String(initialQueue?.location.longitude ?? ''));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const payload = {
      name,
      category,
      latitude: Number(latitude),
      longitude: Number(longitude),
    };

    const parsed = isEdit
      ? updateQueueSchema.safeParse({ id: initialQueue!.id, ...payload })
      : createQueueSchema.safeParse(payload);

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        errors[String(issue.path[0])] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    const optimisticQueue: QueueItem = {
      id: isEdit ? initialQueue!.id : `temp-${Date.now()}`,
      name: payload.name,
      category: payload.category,
      location: { latitude: payload.latitude, longitude: payload.longitude },
      currentWaitTimeMinutes: initialQueue?.currentWaitTimeMinutes ?? 0,
      activeCount: initialQueue?.activeCount ?? 0,
      createdAt: initialQueue?.createdAt ?? new Date().toISOString(),
    };

    onOptimistic?.(optimisticQueue, isEdit ? 'edit' : 'create');

    try {
      const saved = isEdit
        ? await putJson<QueueItem>(`/api/queues/${initialQueue!.id}`, payload)
        : await postJson<QueueItem>('/api/queues', payload);
      onSaved?.(saved, isEdit ? 'edit' : 'create');
      if (!isEdit) {
        setName('');
        setCategory('other');
        setLatitude('');
        setLongitude('');
      }
    } catch (err) {
      onRollback?.(initialQueue ?? null, isEdit ? 'edit' : 'create');
      setFormError(err instanceof Error ? err.message : 'Unable to save queue.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-label={isEdit ? 'Edit queue' : 'Create queue'} style={{ display: 'grid', gap: 12 }}>
      <h2 style={{ margin: 0 }}>{isEdit ? 'Edit queue' : 'Create queue'}</h2>

      <label>
        Name
        <input aria-label="Queue name" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      {fieldErrors.name && <p role="alert">{fieldErrors.name}</p>}

      <label>
        Category
        <select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value as CreateQueueInput['category'])}>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      {fieldErrors.category && <p role="alert">{fieldErrors.category}</p>}

      <label>
        Latitude
        <input aria-label="Latitude" value={latitude} onChange={(e) => setLatitude(e.target.value)} inputMode="decimal" />
      </label>
      {fieldErrors.latitude && <p role="alert">{fieldErrors.latitude}</p>}

      <label>
        Longitude
        <input aria-label="Longitude" value={longitude} onChange={(e) => setLongitude(e.target.value)} inputMode="decimal" />
      </label>
      {fieldErrors.longitude && <p role="alert">{fieldErrors.longitude}</p>}

      {formError && <p role="alert">{formError}</p>}
      <button type="submit" disabled={submitting}>{submitting ? 'Saving...' : isEdit ? 'Update queue' : 'Create queue'}</button>
    </form>
  );
}
