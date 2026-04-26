"use client";

import Link from "next/link";

type Props = {
  /** Pass true when the grid has active filters so the message is contextual. */
  isFiltered?: boolean;
};

/**
 * Shown inside LocationsDataGrid when the API returns zero rows.
 * Covers issue #184 – empty-state UX for admin location pages.
 *
 * Two cases:
 *  1. No locations exist yet  → prompt the admin to seed the first one.
 *  2. Active filters returned nothing → suggest clearing filters.
 */
export default function LocationsEmptyState({ isFiltered = false }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.75rem",
        padding: "3rem 1rem",
        textAlign: "center",
        color: "#6b7280",
      }}
    >
      <span style={{ fontSize: "2.5rem" }} aria-hidden="true">
        📍
      </span>

      {isFiltered ? (
        <>
          <p style={{ margin: 0, fontWeight: 600 }}>No locations match your filters.</p>
          <p style={{ margin: 0, fontSize: "0.875rem" }}>
            Try clearing the search or type filter to see all locations.
          </p>
          <Link
            href="/admin/locations"
            style={{ fontSize: "0.875rem", color: "#3b82f6", textDecoration: "underline" }}
          >
            Clear filters
          </Link>
        </>
      ) : (
        <>
          <p style={{ margin: 0, fontWeight: 600 }}>No locations have been seeded yet.</p>
          <p style={{ margin: 0, fontSize: "0.875rem" }}>
            Create the first location to start collecting queue data.
          </p>
          <Link
            href="/admin/locations/new"
            style={{
              padding: "0.5rem 1.25rem",
              background: "#3b82f6",
              color: "#fff",
              borderRadius: "0.375rem",
              fontSize: "0.875rem",
              textDecoration: "none",
            }}
          >
            + Add Location
          </Link>
        </>
      )}
    </div>
  );
}
