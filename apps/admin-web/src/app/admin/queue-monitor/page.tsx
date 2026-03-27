import { cookies } from "next/headers";

type QueueMonitorPayload = {
  success?: boolean;
  data?: {
    totals?: {
      acceptedReports?: number;
      staleLocations?: number;
    };
    recentReports?: Array<{
      id: string;
      locationId: string;
      userId: string;
      level: string;
      waitTimeMinutes?: number;
      reportedAt?: string;
    }>;
  };
};

export default async function QueueMonitorPage() {
  const cookieStore = await cookies();
  const authCookieName = process.env.ADMIN_AUTH_COOKIE || "admin_token";
  const token = cookieStore.get(authCookieName)?.value || "";
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "";

  let payload: QueueMonitorPayload | null = null;
  if (apiBase && token) {
    const response = await fetch(`${apiBase}/admin/queue-monitor`, {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (response.ok) {
      payload = (await response.json()) as QueueMonitorPayload;
    }
  }

  const totals = payload?.data?.totals || { acceptedReports: 0, staleLocations: 0 };
  const recentReports = payload?.data?.recentReports || [];

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>Queue Monitor</h1>
      <p style={{ marginBottom: 20 }}>Live admin summary of recent reporting activity and stale queue coverage.</p>

      <section style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        <div style={{ padding: 16, border: "1px solid #d6dee8", borderRadius: 12, minWidth: 180 }}>
          <strong>Accepted Reports</strong>
          <div style={{ fontSize: 32, marginTop: 8 }}>{totals.acceptedReports || 0}</div>
        </div>
        <div style={{ padding: 16, border: "1px solid #d6dee8", borderRadius: 12, minWidth: 180 }}>
          <strong>Stale Locations</strong>
          <div style={{ fontSize: 32, marginTop: 8 }}>{totals.staleLocations || 0}</div>
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 20, marginBottom: 12 }}>Recent Reports</h2>
        {recentReports.length === 0 ? (
          <p>No queue reports available yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th align="left">Location</th>
                <th align="left">User</th>
                <th align="left">Level</th>
                <th align="left">Wait</th>
                <th align="left">Reported</th>
              </tr>
            </thead>
            <tbody>
              {recentReports.map((report) => (
                <tr key={report.id}>
                  <td style={{ padding: "8px 0" }}>{report.locationId}</td>
                  <td>{report.userId}</td>
                  <td>{report.level}</td>
                  <td>{typeof report.waitTimeMinutes === "number" ? `${report.waitTimeMinutes} min` : "-"}</td>
                  <td>{report.reportedAt ? new Date(report.reportedAt).toLocaleString() : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
