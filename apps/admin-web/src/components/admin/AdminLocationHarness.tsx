'use client';

import React, { useState } from 'react';
import LocationCreationForm from './LocationCreationForm';
import LocationsDataGrid from './LocationsDataGrid';

type View = 'form' | 'grid';

/**
 * Visual harness for admin location components.
 * Lets contributors preview LocationCreationForm and LocationsDataGrid
 * in isolation without wiring up a full page route.
 */
export default function AdminLocationHarness() {
  const [view, setView] = useState<View>('form');
  const [error, setError] = useState<string | null>(null);

  const handleError = (msg: string) => setError(msg);
  const clearError = () => setError(null);

  return (
    <div style={{ padding: '1.5rem', fontFamily: 'sans-serif' }}>
      <h2 style={{ marginBottom: '1rem' }}>Admin Location Component Harness</h2>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => { setView('form'); clearError(); }}
          style={{ fontWeight: view === 'form' ? 'bold' : 'normal' }}
        >
          Creation Form
        </button>
        <button
          onClick={() => { setView('grid'); clearError(); }}
          style={{ fontWeight: view === 'grid' ? 'bold' : 'normal' }}
        >
          Data Grid
        </button>
      </div>

      {error && (
        <div role="alert" style={{ color: 'red', marginBottom: '1rem' }}>
          Error: {error}
        </div>
      )}

      {view === 'form' && (
        <LocationCreationForm onError={handleError} />
      )}

      {view === 'grid' && (
        <LocationsDataGrid onError={handleError} />
      )}
    </div>
  );
}
