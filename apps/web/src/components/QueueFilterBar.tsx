import React from 'react';
import type { QueueCategory } from '@qyou/shared';

interface QueueFilterBarProps {
  onCategoryChange?: (category?: QueueCategory) => void;
  onSearchChange?: (query: string) => void;
}

export function QueueFilterBar({ onCategoryChange, onSearchChange }: QueueFilterBarProps) {
  return (
    <div style={{ display: 'flex', gap: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
      <input
        type="text"
        placeholder="Search queues..."
        onChange={(e) => onSearchChange?.(e.target.value)}
        style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', flex: 1 }}
      />
      <select
        onChange={(e) => onCategoryChange?.(e.target.value as QueueCategory || undefined)}
        style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
      >
        <option value="">All Categories</option>
        <option value="bank">Bank</option>
        <option value="hospital">Hospital</option>
        <option value="fuel_station">Fuel Station</option>
        <option value="service_center">Service Center</option>
      </select>
    </div>
  );
}
