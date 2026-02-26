import { cookies } from "next/headers";
import SpatialVerificationMap from "@/components/admin/SpatialVerificationMap";

type AdminLocationRow = {
  id: string;
  name: string;
  type: string;
  status: string;
  address: string;
  coordinates: [number, number] | null;
};

type BackendResponse = {
  success: boolean;
  data?: {
    rows: AdminLocationRow[];
    pagination: {
      page: number;
      totalPages: number;
    };
  };
};

const fetchAllLocations = async (apiBase: string, token: string) => {
  const maxPages = 120;
  const pageSize = 50;
  let page = 1;
  let totalPages = 1;
  const allRows: AdminLocationRow[] = [];

  while (page <= totalPages && page <= maxPages) {
    const query = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      sort: "createdAt",
      dir: "desc",
    });

    const response = await fetch(`${apiBase}/admin/locations?${query.toString()}`, {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      break;
    }

    const payload = (await response.json()) as BackendResponse;
    const rows = payload.data?.rows || [];
    totalPages = payload.data?.pagination.totalPages || 1;
    allRows.push(...rows);
    page += 1;
  }

  return allRows;
};

export default async function AdminLocationsSpatialMapPage() {
  const cookieStore = await cookies();
  const authCookieName = process.env.ADMIN_AUTH_COOKIE || "admin_token";
  const token = cookieStore.get(authCookieName)?.value || "";
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "";

  const locations = apiBase && token ? await fetchAllLocations(apiBase, token) : [];

  return <SpatialVerificationMap locations={locations} />;
}
