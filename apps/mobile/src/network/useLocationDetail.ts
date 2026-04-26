import { useState, useCallback } from "react";
import { AxiosError } from "axios";
import { apiClient } from "../network/apiClient";

type FetchState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; message: string; code?: number };

function parseError(err: unknown): { message: string; code?: number } {
  if (err instanceof AxiosError) {
    const code = err.response?.status;
    if (code === 404) return { message: "Location not found.", code };
    if (code === 408 || err.code === "ECONNABORTED") return { message: "Request timed out. Try again.", code };
    if (code && code >= 500) return { message: "Server error. Please try later.", code };
    return { message: err.message || "Network error.", code };
  }
  return { message: "An unexpected error occurred." };
}

export function useLocationDetail<T>(locationId: string) {
  const [state, setState] = useState<FetchState<T>>({ status: "idle" });

  const fetch = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const res = await apiClient.get<T>(`/queues/${locationId}`);
      setState({ status: "success", data: res.data });
    } catch (err) {
      const { message, code } = parseError(err);
      setState({ status: "error", message, code });
    }
  }, [locationId]);

  const reset = useCallback(() => setState({ status: "idle" }), []);

  return { state, fetch, reset };
}
