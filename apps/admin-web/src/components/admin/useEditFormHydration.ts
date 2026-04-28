"use client";

import { useEffect, useState } from "react";

type LocationPayload = {
  id: string;
  name: string;
  type: string;
  status: string;
  address: string;
  coordinates: [number, number] | null;
};

type HydrationState =
  | { status: "loading" }
  | { status: "ready"; location: LocationPayload }
  | { status: "error"; message: string };

/**
 * Client-side fallback that fetches a single location by ID when the server
 * page arrives without a pre-hydrated value (e.g. direct deep-link where the
 * location is not in the list cache).
 *
 * Covers issue #187 – edit-form hydration fallback for direct location edit links.
 *
 * @param id        The location ID from the route params.
 * @param initial   The server-fetched location, or null if the cache missed.
 */
export function useEditFormHydration(
  id: string,
  initial: LocationPayload | null
): HydrationState {
  const [state, setState] = useState<HydrationState>(
    initial ? { status: "ready", location: initial } : { status: "loading" }
  );

  useEffect(() => {
    // Already hydrated from the server – nothing to do.
    if (initial) return;

    let cancelled = false;

    const fetchLocation = async () => {
      try {
        const response = await fetch(`/api/admin/locations/${id}`, {
          credentials: "include",
        });

        if (!response.ok) {
          const text = await response.text().catch(() => "");
          throw new Error(text || `HTTP ${response.status}`);
        }

        const payload = (await response.json()) as {
          success?: boolean;
          data?: LocationPayload;
        };

        if (!payload.success || !payload.data) {
          throw new Error("Location not found.");
        }

        if (!cancelled) {
          setState({ status: "ready", location: payload.data });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            status: "error",
            message: err instanceof Error ? err.message : "Failed to load location.",
          });
        }
      }
    };

    void fetchLocation();
    return () => {
      cancelled = true;
    };
  }, [id, initial]);

  return state;
}
