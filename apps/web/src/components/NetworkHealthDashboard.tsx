'use client';

import React, { useState } from 'react';

export type ServiceHealthState = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface EndpointHealthData {
  readonly endpointType: 'horizon' | 'soroban';
  readonly url: string;
  readonly status: ServiceHealthState;
  readonly sampleCount: number;
  readonly errorRatePercent: number;
  readonly avgLatencyMs: number;
  readonly p95LatencyMs: number;
  readonly lastCheckedAt: number | null;
  readonly lastError?: string;
}

export interface NetworkHealthDashboardData {
  readonly overallStatus: ServiceHealthState;
  readonly horizon: EndpointHealthData;
  readonly soroban: EndpointHealthData;
  readonly evaluatedAt: number;
}

interface NetworkHealthDashboardProps {
  initialData?: NetworkHealthDashboardData;
  onRefresh?: () => Promise<void> | void;
}

const DEFAULT_DATA: NetworkHealthDashboardData = {
  overallStatus: 'healthy',
  evaluatedAt: 1790420000000,
  horizon: {
    endpointType: 'horizon',
    url: 'https://horizon-testnet.stellar.org',
    status: 'healthy',
    sampleCount: 45,
    errorRatePercent: 0,
    avgLatencyMs: 142,
    p95LatencyMs: 280,
    lastCheckedAt: 1790420000000,
  },
  soroban: {
    endpointType: 'soroban',
    url: 'https://soroban-testnet.stellar.org',
    status: 'healthy',
    sampleCount: 45,
    errorRatePercent: 0,
    avgLatencyMs: 310,
    p95LatencyMs: 560,
    lastCheckedAt: 1790420000000,
  },
};

export function NetworkHealthDashboard({
  initialData = DEFAULT_DATA,
  onRefresh,
}: NetworkHealthDashboardProps) {
  const [data, setData] = useState<NetworkHealthDashboardData>(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusBadge = (status: ServiceHealthState) => {
    switch (status) {
      case 'healthy':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            ● Healthy
          </span>
        );
      case 'degraded':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            ▲ Degraded
          </span>
        );
      case 'unhealthy':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            ✖ Major Outage
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            ? Unknown
          </span>
        );
    }
  };

  return (
    <div
      data-testid="stellar-network-health-dashboard"
      className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-900">
              Stellar Network Health & RPC Diagnostics
            </h2>
            {getStatusBadge(data.overallStatus)}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Tracks upstream Stellar Horizon and Soroban RPC performance to distinguish network outages from app failures (#1064).
          </p>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            {isRefreshing ? 'Checking...' : 'Refresh Status'}
          </button>
        )}
      </div>

      {/* Outage Warning Banner */}
      {data.overallStatus !== 'healthy' && (
        <div
          data-testid="health-outage-banner"
          className={`p-4 rounded-md text-sm ${
            data.overallStatus === 'unhealthy'
              ? 'bg-red-50 text-red-800 border border-red-200'
              : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
          }`}
        >
          <strong>Notice: </strong>
          Upstream Stellar network latency or errors may impact reward payouts and wallet synchronization.
        </div>
      )}

      {/* Grid of endpoints */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Horizon Card */}
        <div
          data-testid="horizon-health-card"
          className="p-4 border border-gray-200 rounded-md bg-gray-50/50 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">Horizon Node</span>
              <span className="text-xs text-gray-400 font-mono truncate max-w-[150px]">
                {data.horizon.url}
              </span>
            </div>
            {getStatusBadge(data.horizon.status)}
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 text-center">
            <div className="bg-white p-2 rounded border border-gray-100">
              <span className="block text-xs text-gray-500">Avg Latency</span>
              <span className="text-sm font-semibold text-gray-900">
                {data.horizon.avgLatencyMs} ms
              </span>
            </div>
            <div className="bg-white p-2 rounded border border-gray-100">
              <span className="block text-xs text-gray-500">p95 Latency</span>
              <span className="text-sm font-semibold text-gray-900">
                {data.horizon.p95LatencyMs} ms
              </span>
            </div>
            <div className="bg-white p-2 rounded border border-gray-100">
              <span className="block text-xs text-gray-500">Error Rate</span>
              <span className={`text-sm font-semibold ${data.horizon.errorRatePercent > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {data.horizon.errorRatePercent}%
              </span>
            </div>
          </div>

          {data.horizon.lastError && (
            <p className="text-xs text-red-600 bg-red-50 p-2 rounded">
              Last Error: {data.horizon.lastError}
            </p>
          )}
        </div>

        {/* Soroban Card */}
        <div
          data-testid="soroban-health-card"
          className="p-4 border border-gray-200 rounded-md bg-gray-50/50 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">Soroban RPC</span>
              <span className="text-xs text-gray-400 font-mono truncate max-w-[150px]">
                {data.soroban.url}
              </span>
            </div>
            {getStatusBadge(data.soroban.status)}
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 text-center">
            <div className="bg-white p-2 rounded border border-gray-100">
              <span className="block text-xs text-gray-500">Avg Latency</span>
              <span className="text-sm font-semibold text-gray-900">
                {data.soroban.avgLatencyMs} ms
              </span>
            </div>
            <div className="bg-white p-2 rounded border border-gray-100">
              <span className="block text-xs text-gray-500">p95 Latency</span>
              <span className="text-sm font-semibold text-gray-900">
                {data.soroban.p95LatencyMs} ms
              </span>
            </div>
            <div className="bg-white p-2 rounded border border-gray-100">
              <span className="block text-xs text-gray-500">Error Rate</span>
              <span className={`text-sm font-semibold ${data.soroban.errorRatePercent > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {data.soroban.errorRatePercent}%
              </span>
            </div>
          </div>

          {data.soroban.lastError && (
            <p className="text-xs text-red-600 bg-red-50 p-2 rounded">
              Last Error: {data.soroban.lastError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
