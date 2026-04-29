import LocationsPageServer from "@/components/admin/LocationsPageServer";

type SearchParams = {
  page?: string;
  pageSize?: string;
  sort?: string;
  dir?: string;
  search?: string;
  type?: string;
  status?: string;
};

const toPositiveInt = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback;
};

export default async function AdminLocationsPage(props: {
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const sp = await Promise.resolve(props.searchParams ?? {});

  return (
    <LocationsPageServer
      page={toPositiveInt(sp.page, 1)}
      pageSize={Math.min(toPositiveInt(sp.pageSize, 50), 50)}
      sort={sp.sort ?? "createdAt"}
      dir={sp.dir === "asc" ? "asc" : "desc"}
      search={sp.search ?? ""}
      type={sp.type ?? ""}
      status={sp.status ?? ""}
    />
  );
}
