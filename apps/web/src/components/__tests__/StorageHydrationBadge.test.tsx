import { render, screen } from '@testing-library/react';
import { StorageHydrationBadge } from '../StorageHydrationBadge';

describe('StorageHydrationBadge', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('renders in non-production environments', () => {
    process.env.NODE_ENV = 'test';
    render(<StorageHydrationBadge status="hydrated" hasSession />);
    expect(screen.getByText('Session Hydrated')).toBeInTheDocument();
  });

  it('returns null in production', () => {
    process.env.NODE_ENV = 'production';
    const { container } = render(<StorageHydrationBadge status="hydrated" />);
    expect(container.firstChild).toBeNull();
  });
});
