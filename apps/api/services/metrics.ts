type CounterMap = Record<string, number>;

type RequestMetricSummary = {
  count: number;
  totalDurationMs: number;
  maxDurationMs: number;
};

type MetricsSnapshot = {
  generatedAt: string;
  uptimeSeconds: number;
  counters: CounterMap;
  requests: Record<string, RequestMetricSummary & { averageDurationMs: number }>;
};

const processStartedAt = Date.now();
const counters: CounterMap = {
  authFailures: 0,
  queueReportRequests: 0,
  queueReportFailures: 0,
};

const requestMetrics = new Map<string, RequestMetricSummary>();

const getRequestKey = (method: string, route: string, statusCode: number) =>
  `${method.toUpperCase()} ${route} ${Math.floor(statusCode / 100)}xx`;

export const incrementCounter = (name: string, amount = 1) => {
  counters[name] = (counters[name] || 0) + amount;
};

export const recordRequestMetric = ({
  method,
  route,
  statusCode,
  durationMs,
}: {
  method: string;
  route: string;
  statusCode: number;
  durationMs: number;
}) => {
  const key = getRequestKey(method, route, statusCode);
  const current = requestMetrics.get(key) || {
    count: 0,
    totalDurationMs: 0,
    maxDurationMs: 0,
  };

  current.count += 1;
  current.totalDurationMs += durationMs;
  current.maxDurationMs = Math.max(current.maxDurationMs, durationMs);
  requestMetrics.set(key, current);
};

export const getMetricsSnapshot = (): MetricsSnapshot => {
  const requests = Array.from(requestMetrics.entries()).reduce<
    Record<string, RequestMetricSummary & { averageDurationMs: number }>
  >((acc, [key, value]) => {
    acc[key] = {
      ...value,
      averageDurationMs: Number((value.totalDurationMs / value.count).toFixed(2)),
    };
    return acc;
  }, {});

  return {
    generatedAt: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - processStartedAt) / 1000),
    counters: { ...counters },
    requests,
  };
};
