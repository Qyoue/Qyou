import { cookies } from "next/headers";
import LocationsDataGrid, { GridRow } from "@/components/admin/LocationsDataGrid";
import type { AdminLocationsListResponse } from "@/src/lib/api";

type SearchParams = {
  page?: string;
  pageSize?: string;
  sort?: string;
  dir?: string;
  search?: string;
  type?: string;
};

const toPositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
};

export default async function AdminLocationsPage(props: {
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const resolved = await Promise.resolve(props.searchParams || {});
  const page = toPositiveInt(resolved.page, 1);
  const pageSize = Math.min(toPositiveInt(resolved.pageSize, 50), 50);
  const sort = resolved.sort || "createdAt";
  const dir = resolved.dir === "asc" ? "asc" : "desc";
  const search = resolved.search || "";
  const type = resolved.type || "";

  const cookieStore = await cookies();
  const authCookieName = process.env.ADMIN_AUTH_COOKIE || "admin_token";
  const token = cookieStore.get(authCookieName)?.value || "";
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "";

  let rows: GridRow[] = [];
  let total = 0;
  let totalPages = 1;

  if (apiBase && token) {
    const query = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      sort,
      dir,
    });
    if (search) query.set("search", search);
    if (type) query.set("type", type);

    const response = await fetch(`${apiBase}/admin/locations?${query.toString()}`, {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const payload = (await response.json()) as AdminLocationsListResponse;
      rows = payload.data?.rows || [];
      total = payload.data?.pagination.total || 0;
      totalPages = payload.data?.pagination.totalPages || 1;
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
