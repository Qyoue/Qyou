"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import styles from "./LocationsDataGrid.module.css";

export type GridRow = {
  id: string;
  name: string;
  type: string;
  status: string;
  address: string;
  coordinates: [number, number] | null;
  createdAt?: string;
};

type GridProps = {
  rows: GridRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  sort: string;
  dir: "asc" | "desc";
  search: string;
  typeFilter: string;
};

const SORTABLE_FIELDS = new Set(["name", "type", "status", "address", "createdAt"]);

const toQueryString = (params: Record<string, string | number | undefined | null>) => {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    sp.set(key, String(value));
  }
  return `?${sp.toString()}`;
};

export default function LocationsDataGrid(props: GridProps) {
  const columns = useMemo<ColumnDef<GridRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
      },
      {
        accessorKey: "type",
        header: "Type",
      },
      {
        accessorKey: "status",
        header: "Status",
      },
      {
        accessorKey: "address",
        header: "Address",
      },
      {
        id: "coordinates",
        header: "Coordinates",
        cell: ({ row }) => {
          const coordinates = row.original.coordinates;
          if (!coordinates) return "-";
          return `${coordinates[1].toFixed(5)}, ${coordinates[0].toFixed(5)}`;
        },
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) =>
          row.original.createdAt ? new Date(row.original.createdAt).toLocaleString() : "-",
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <Link className={styles.thButton} href={`/admin/locations/${row.original.id}`}>
            Edit
          </Link>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: props.rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
  });

  const nextSortDir = (field: string): "asc" | "desc" => {
    if (props.sort !== field) return "asc";
    return props.dir === "asc" ? "desc" : "asc";
  };

  const withBaseQuery = (overrides: Partial<Record<string, string | number>>) => {
    return toQueryString({
      page: props.page,
      pageSize: props.pageSize,
      sort: props.sort,
      dir: props.dir,
      search: props.search || undefined,
      type: props.typeFilter || undefined,
      ...overrides,
    });
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h1 className={styles.title}>Locations Data Grid</h1>
        <p className={styles.sub}>Server-side pagination, sorting, and filtering with URL state.</p>
        <p className={styles.sub}>
          <Link href="/admin/locations/map">Open Spatial Verification Map</Link>
        </p>

        <form className={styles.toolbar} method="GET" action="/admin/locations">
          <input
            className={styles.input}
            name="search"
            defaultValue={props.search}
            placeholder="Search by name or address"
          />
          <select className={styles.select} name="type" defaultValue={props.typeFilter}>
            <option value="">All types</option>
            <option value="bank">Bank</option>
            <option value="hospital">Hospital</option>
            <option value="atm">ATM</option>
            <option value="government">Government</option>
            <option value="fuel_station">Fuel Station</option>
            <option value="other">Other</option>
          </select>
          <button className={styles.filterBtn} type="submit">
            Apply
          </button>
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="pageSize" value={String(props.pageSize)} />
          <input type="hidden" name="sort" value={props.sort} />
          <input type="hidden" name="dir" value={props.dir} />
        </form>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead className={styles.head}>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const sortId = header.column.id;
                    const sortable = SORTABLE_FIELDS.has(sortId);
                    return (
                      <th key={header.id} className={styles.th}>
                        {sortable ? (
                          <Link
                            className={styles.thButton}
                            href={withBaseQuery({
                              page: 1,
                              sort: sortId,
                              dir: nextSortDir(sortId),
                            })}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </Link>
                        ) : (
                          <span className={styles.thStatic}>
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </span>
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className={styles.td}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
              {props.rows.length === 0 && (
                <tr>
                  <td className={styles.td} colSpan={columns.length}>
                    No locations found for the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.pagination}>
          <span>
            Showing {props.rows.length} of {props.total} total records. Page {props.page} / {props.totalPages || 1}.
          </span>
          <div className={styles.pagerBtns}>
            <Link
              className={`${styles.btn} ${props.page <= 1 ? styles.btnDisabled : ""}`}
              href={withBaseQuery({ page: Math.max(1, props.page - 1) })}
            >
              Previous
            </Link>
            <Link
              className={`${styles.btn} ${props.page >= props.totalPages ? styles.btnDisabled : ""}`}
              href={withBaseQuery({ page: Math.min(props.totalPages || 1, props.page + 1) })}
            >
              Next
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
