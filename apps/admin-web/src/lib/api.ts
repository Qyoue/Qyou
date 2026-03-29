import type { ApiResponse, AdminLocationRow } from "@qyou/types";

export type AdminLocationsListResponse = ApiResponse<{
  rows: AdminLocationRow[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  sort: {
    field: string;
    direction: "asc" | "desc";
  };
  filters: {
    search: string | null;
    type: string | null;
  };
}>;

