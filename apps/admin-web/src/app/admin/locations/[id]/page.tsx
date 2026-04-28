import { cookies } from "next/headers";
import EditLocationForm from "@/components/admin/EditLocationForm";
import QueueActivitySection from "@/components/admin/QueueActivitySection";

type LocationPayload = {
  id: string;
  name: string;
  type: string;
  status: string;
  address: string;
  coordinates: [number, number] | null;
};

export default async function EditLocationPage(props: { params: Promise<{ id: string }> | { id: string } }) {
  const params = await Promise.resolve(props.params);
  const cookieStore = await cookies();
  const authCookieName = process.env.ADMIN_AUTH_COOKIE || "admin_token";
  const token = cookieStore.get(authCookieName)?.value || "";
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "";

  let location: LocationPayload | null = null;
  if (apiBase && token) {
    const response = await fetch(`${apiBase}/admin/locations?page=1&pageSize=50`, {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (response.ok) {
      const payload = (await response.json()) as {
        data?: { rows?: LocationPayload[] };
      };
      location = payload.data?.rows?.find((row) => row.id === params.id) || null;
    }
  }

  return (
    <>
      <EditLocationForm location={location} />
      <QueueActivitySection locationId={params.id} />
    </>
  );
}

