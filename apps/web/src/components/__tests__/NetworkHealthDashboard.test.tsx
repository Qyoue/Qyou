import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NetworkHealthDashboard, NetworkHealthDashboardData } from '../NetworkHealthDashboard';

describe('Stellar Network Health & RPC Diagnostics Dashboard (#1064)', () => {
  const healthyData: NetworkHealthDashboardData = {
    overallStatus: 'healthy',
    evaluatedAt: 1790420000000,
    horizon: {
      endpointType: 'horizon',
      url: 'https://horizon-testnet.stellar.org',
      status: 'healthy',
      sampleCount: 50,
      errorRatePercent: 0,
      avgLatencyMs: 120,
      p95LatencyMs: 240,
      lastCheckedAt: 1790420000000,
    },
    soroban: {
      endpointType: 'soroban',
      url: 'https://soroban-testnet.stellar.org',
      status: 'healthy',
      sampleCount: 50,
      errorRatePercent: 0,
      avgLatencyMs: 280,
      p95LatencyMs: 450,
      lastCheckedAt: 1790420000000,
    },
  };

  const degradedData: NetworkHealthDashboardData = {
    overallStatus: 'degraded',
    evaluatedAt: 1790420000000,
    horizon: {
      endpointType: 'horizon',
      url: 'https://horizon-testnet.stellar.org',
      status: 'degraded',
      sampleCount: 50,
      errorRatePercent: 8.5,
      avgLatencyMs: 1450,
      p95LatencyMs: 2900,
      lastCheckedAt: 1790420000000,
      lastError: 'HTTP 504 Gateway Timeout',
    },
    soroban: {
      endpointType: 'soroban',
      url: 'https://soroban-testnet.stellar.org',
      status: 'healthy',
      sampleCount: 50,
      errorRatePercent: 0,
      avgLatencyMs: 310,
      p95LatencyMs: 520,
      lastCheckedAt: 1790420000000,
    },
  };

  const outageData: NetworkHealthDashboardData = {
    overallStatus: 'unhealthy',
    evaluatedAt: 1790420000000,
    horizon: {
      endpointType: 'horizon',
      url: 'https://horizon-testnet.stellar.org',
      status: 'unhealthy',
      sampleCount: 50,
      errorRatePercent: 42.0,
      avgLatencyMs: 5200,
      p95LatencyMs: 8000,
      lastCheckedAt: 1790420000000,
      lastError: 'Connection refused',
    },
    soroban: {
      endpointType: 'soroban',
      url: 'https://soroban-testnet.stellar.org',
      status: 'unhealthy',
      sampleCount: 50,
      errorRatePercent: 55.0,
      avgLatencyMs: 6100,
      p95LatencyMs: 9500,
      lastCheckedAt: 1790420000000,
      lastError: 'Endpoint unavailable',
    },
  };

  it('1. Healthy State: renders healthy badges and operational metrics for Horizon and Soroban', () => {
    const { container } = render(<NetworkHealthDashboard initialData={healthyData} />);

    expect(screen.getByTestId('stellar-network-health-dashboard')).toBeInTheDocument();
    expect(screen.getAllByText(/● Healthy/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByTestId('health-outage-banner')).not.toBeInTheDocument();
    expect(screen.getByText('120 ms')).toBeInTheDocument();
    expect(screen.getByText('280 ms')).toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });

  it('2. Degraded State: renders degraded warning banner and high latency metrics', () => {
    const { container } = render(<NetworkHealthDashboard initialData={degradedData} />);

    expect(screen.getByTestId('health-outage-banner')).toBeInTheDocument();
    expect(screen.getAllByText(/▲ Degraded/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/HTTP 504 Gateway Timeout/i)).toBeInTheDocument();
    expect(screen.getByText('8.5%')).toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });

  it('3. Major Outage State: renders critical outage banner and error rate indicators', () => {
    const { container } = render(<NetworkHealthDashboard initialData={outageData} />);

    expect(screen.getByTestId('health-outage-banner')).toBeInTheDocument();
    expect(screen.getAllByText(/✖ Major Outage/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Connection refused/i)).toBeInTheDocument();
    expect(screen.getByText(/Endpoint unavailable/i)).toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });

  it('4. Refresh Trigger: calls onRefresh handler and displays loading state during refresh', async () => {
    let resolveRefresh: () => void;
    const refreshPromise = new Promise<void>((resolve) => {
      resolveRefresh = resolve;
    });
    const onRefreshMock = jest.fn(() => refreshPromise);

    render(<NetworkHealthDashboard initialData={healthyData} onRefresh={onRefreshMock} />);

    const refreshBtn = screen.getByRole('button', { name: /Refresh Status/i });
    fireEvent.click(refreshBtn);

    expect(onRefreshMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /Checking.../i })).toBeDisabled();

    resolveRefresh!();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Refresh Status/i })).not.toBeDisabled();
    });
  });
});
