import { render, screen, act, waitFor } from '@testing-library/react';
import { RealTimeWaitTimeCard } from '../RealTimeWaitTimeCard';

class MockEventSource {
  static instances: MockEventSource[] = [];
  onmessage: ((ev: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  url: string;
  closed = false;
  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }
  close() { this.closed = true; }
}

describe('RealTimeWaitTimeCard (#1301)', () => {
  const originalES = (global as any).EventSource;
  const originalFetch = global.fetch;

  beforeEach(() => {
    MockEventSource.instances = [];
    (global as any).EventSource = MockEventSource as any;
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ averageWaitMinutes: 7, reportsCount: 2, confidenceScore: 60 }) });
  });

  afterEach(() => {
    (global as any).EventSource = originalES;
    global.fetch = originalFetch;
    jest.useRealTimers();
  });

  it('subscribes to SSE and updates on message', async () => {
    render(<RealTimeWaitTimeCard queueId="q1" />);
    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0].url).toContain('/api/queue/q1/stream');

    act(() => {
      MockEventSource.instances[0].onmessage?.({ data: JSON.stringify({ averageWaitMinutes: 5, reportsCount: 9, confidenceScore: 90 }) });
    });

    expect(await screen.findByText(/~5 mins wait time/i)).toBeInTheDocument();
  });

  it('falls back to polling on SSE error', async () => {
    render(<RealTimeWaitTimeCard queueId="q1" />);
    const es = MockEventSource.instances[0];

    await act(async () => {
      es.onerror?.();
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});
