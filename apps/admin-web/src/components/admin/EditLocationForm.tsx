'use client';

import { useState, useEffect, useCallback } from 'react';

interface LocationData {
  id: string;
  name: string;
  address: string;
  category: string;
  latitude: string;
  longitude: string;
}

interface Props {
  location: LocationData;
  onSuccess?: (updated: LocationData) => void;
  onCancel?: () => void;
}

export default function EditLocationForm({ location, onSuccess, onCancel }: Props) {
  const [form, setForm] = useState<LocationData>(location);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Sync external prop changes (e.g. parent re-fetches) without losing edits
  useEffect(() => {
    setForm(location);
    setIsDirty(false);
    setError(null);
  }, [location.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
      setIsDirty(true);
      setError(null);
    },
    [],
  );

  const handleCancel = useCallback(() => {
    if (isDirty && !confirm('Discard unsaved changes?')) return;
    setForm(location);
    setIsDirty(false);
    onCancel?.();
  }, [isDirty, location, onCancel]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.name.trim() || !form.address.trim()) {
        setError('Name and address are required.');
        return;
      }
      setSubmitting(true);
      try {
        // TODO: replace with real API call
        await new Promise((r) => setTimeout(r, 300));
        setIsDirty(false);
        onSuccess?.(form);
      } catch {
        setError('Failed to save changes. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [form, onSuccess],
  );

  return (
    <form onSubmit={handleSubmit} aria-label="Edit location">
      {error && <p role="alert" style={{ color: 'red' }}>{error}</p>}
      <input name="name" placeholder="Name *" value={form.name} onChange={handleChange} required />
      <input name="address" placeholder="Address *" value={form.address} onChange={handleChange} required />
      <input name="category" placeholder="Category" value={form.category} onChange={handleChange} />
      <input name="latitude" placeholder="Latitude" value={form.latitude} onChange={handleChange} />
      <input name="longitude" placeholder="Longitude" value={form.longitude} onChange={handleChange} />
      <button type="submit" disabled={submitting || !isDirty}>{submitting ? 'Saving…' : 'Save'}</button>
      <button type="button" onClick={handleCancel} disabled={submitting}>Cancel</button>
    </form>
  );
}
