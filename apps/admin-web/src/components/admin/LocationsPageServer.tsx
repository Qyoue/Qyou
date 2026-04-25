import { cookies } from "next/headers";
import LocationsDataGrid, { GridRow } from "@/components/admin/LocationsDataGrid";
import type { AdminLocationsListResponse } from "@/lib/api";

interface Props {
  page: number;
  pageSize: number;
  sort: string;
  dir: "asc" | "desc";
  search: string;
  type: string;
}

/**
 * Pure server component: owns all data fetching for the locations grid.
 * The page file resolves searchParams and delegates here; the grid
 * component stays a pure client presentational component.
 */
export default async function LocationsPageServer({
  page,
  pageSize,
  sort,
  dir,
  search,
  type,
}: Props) {
  const cookieStore = await cookies();
  const token = cookieStore.get(process.env.ADMIN_AUTH_COOKIE || "admin_token")?.value ?? "";
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";

  let rows: GridRow[] = [];
  let total = 0;
  let totalPages = 1;

  if (apiBase && token) {
    const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize), sort, dir });
    if (search) query.set("search", search);
    if (type) query.set("type", type);

    try {
      const res = await fetch(`${apiBase}/admin/locations?${query}`, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const payload = (await res.json()) as AdminLocationsListResponse;
        if (payload.success) {
          rows = payload.data.rows;
          total = payload.data.pagination.total;
          totalPages = payload.data.pagination.totalPages;
        }
      }
    } catch {
      // network failure — render empty grid with no crash
    }
  }

  return (
    <LocationsDataGrid
      rows={rows}
      page={page}
      pageSize={pageSize}
      total={total}
      totalPages={totalPages}
      sort={sort}
      dir={dir}
      search={search}
      typeFilter={type}
    />
  );
}
