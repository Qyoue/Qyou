'use client';

import { useState, useCallback } from 'react';

interface LocationFormData {
  name: string;
  address: string;
  category: string;
  latitude: string;
  longitude: string;
}

const EMPTY: LocationFormData = {
  name: '',
  address: '',
  category: '',
  latitude: '',
  longitude: '',
};

interface Props {
  onSuccess?: (data: LocationFormData) => void;
}

export default function LocationCreationForm({ onSuccess }: Props) {
  const [form, setForm] = useState<LocationFormData>(EMPTY);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
      setIsDirty(true);
      setError(null);
    },
    [],
  );

  const handleReset = useCallback(() => {
    if (isDirty && !confirm('Discard unsaved changes?')) return;
    setForm(EMPTY);
    setIsDirty(false);
    setError(null);
  }, [isDirty]);

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
        setForm(EMPTY);
        setIsDirty(false);
        onSuccess?.(form);
      } catch {
        setError('Failed to create location. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [form, onSuccess],
  );

  return (
    <form onSubmit={handleSubmit} aria-label="Create location">
      {error && <p role="alert" style={{ color: 'red' }}>{error}</p>}
      <input name="name" placeholder="Name *" value={form.name} onChange={handleChange} required />
      <input name="address" placeholder="Address *" value={form.address} onChange={handleChange} required />
      <input name="category" placeholder="Category" value={form.category} onChange={handleChange} />
      <input name="latitude" placeholder="Latitude" value={form.latitude} onChange={handleChange} />
      <input name="longitude" placeholder="Longitude" value={form.longitude} onChange={handleChange} />
      <button type="submit" disabled={submitting}>{submitting ? 'Saving…' : 'Create'}</button>
      <button type="button" onClick={handleReset} disabled={submitting}>Reset</button>
    </form>
  );
}
