/**
 * Prometheus text exposition for the in-memory collectors (#1144). Counters still start at zero
 * after a deploy locally; Prometheus keeps the history and handles resets with `rate()`.
 * Serve `renderPrometheus(...)` from a `/metrics` route; that route is not added here.
 */
export interface CounterSample {
  name: string;
  help: string;
  value: number;
  labels?: Record<string, string>;
}

const esc = (v: string) => v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');

export function renderPrometheus(samples: CounterSample[], type: 'counter' | 'gauge' = 'counter'): string {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const s of samples) {
    if (!seen.has(s.name)) {
      seen.add(s.name);
      lines.push(`# HELP ${s.name} ${s.help}`, `# TYPE ${s.name} ${type}`);
    }
    const labels = s.labels
      ? `{${Object.entries(s.labels).map(([k, v]) => `${k}="${esc(v)}"`).join(',')}}`
      : '';
    lines.push(`${s.name}${labels} ${s.value}`);
  }
  return `${lines.join('\n')}\n`;
}
