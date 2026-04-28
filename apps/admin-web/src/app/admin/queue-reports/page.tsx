import QueueReportReviewList from "@/components/admin/QueueReportReviewList";

export default function QueueReportsPage() {
  return (
    <div style={{ padding: "24px 32px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Queue Report Review</h1>
      <p style={{ color: "#64748b", marginBottom: 24, fontSize: 14 }}>
        Incoming crowd-sourced queue reports from mobile contributors.
      </p>
      <QueueReportReviewList />
    </div>
  );
}
