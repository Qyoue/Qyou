'use client';

import React, { useEffect, useRef, useState } from 'react';

interface RealTimeWaitTimeCardProps {
  queueId?: string;
  streamUrl?: string;
  pollUrl?: string;
  averageWaitMinutes?: number;
  reportsCount?: number;
  confidenceScore?: number;
}

type WaitState = { averageWaitMinutes: number; reportsCount: number; confidenceScore: number };

export function RealTimeWaitTimeCard({
  queueId,
  streamUrl,
  pollUrl,
  averageWaitMinutes = 15,
  reportsCount = 5,
  confidenceScore = 80,
}: RealTimeWaitTimeCardProps) {
  const [state, setState] = useState<WaitState>({ averageWaitMinutes, reportsCount, confidenceScore });
  const backoffRef = useRef(1000);

  useEffect(() => {
    setState({ averageWaitMinutes, reportsCount, confidenceScore });
  }, [averageWaitMinutes, reportsCount, confidenceScore]);

  useEffect(() => {
    const resolvedStream = streamUrl ?? (queueId ? `/api/queue/${queueId}/stream` : null);
    const resolvedPoll = pollUrl ?? (queueId ? `/api/queue/${queueId}/wait-time` : null);
    if (!resolvedStream && !resolvedPoll) return;

    let cancelled = false;
    let es: EventSource | null = null;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const apply = (data: any) => {
      if (cancelled || !data) return;
      setState((prev) => ({
        averageWaitMinutes: Number(data.averageWaitMinutes ?? prev.averageWaitMinutes),
        reportsCount: Number(data.reportsCount ?? prev.reportsCount),
        confidenceScore: Number(data.confidenceScore ?? prev.confidenceScore),
      }));
    };

    const poll = async () => {
      if (!resolvedPoll || cancelled) return;
      try {
        const res = await fetch(resolvedPoll);
        if (res.ok) apply(await res.json());
      } catch {}
      if (!cancelled) pollTimer = setTimeout(poll, 10000);
    };

    const connect = () => {
      if (!resolvedStream || cancelled || typeof EventSource === 'undefined') { poll(); return; }
      es = new EventSource(resolvedStream);
      es.onmessage = (ev) => { try { apply(JSON.parse(ev.data)); backoffRef.current = 1000; } catch {} };
      es.onerror = () => {
        es?.close();
        es = null;
        if (cancelled) return;
        poll(); // fallback
        const delay = Math.min(backoffRef.current, 15000);
        backoffRef.current = Math.min(backoffRef.current * 2, 15000);
        reconnectTimer = setTimeout(connect, delay);
      };
    };

    connect();
    return () => {
      cancelled = true;
      es?.close();
      if (pollTimer) clearTimeout(pollTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [queueId, streamUrl, pollUrl]);

  return (
    <div style={{ padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#166534' }}>
        ⏱️ ~{state.averageWaitMinutes} mins wait time
      </div>
      <div style={{ fontSize: '12px', color: '#15803d', marginTop: '4px' }}>
        Based on {state.reportsCount} user report{state.reportsCount !== 1 ? 's' : ''} ({state.confidenceScore}% confidence)
      </div>
    </div>
  );
}
