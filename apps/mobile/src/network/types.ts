import { Method } from "axios";

export type QueueableMethod = "post" | "put" | "patch" | "delete";

export type QueuedRequest = {
  id: string;
  method: QueueableMethod;
  url: string;
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  data?: unknown;
  timeout?: number;
  createdAt: string;
  retryCount: number;
};

export const isQueueableMethod = (method?: Method): method is QueueableMethod => {
  if (!method) return false;
  const normalized = method.toLowerCase();
  return normalized === "post" || normalized === "put" || normalized === "patch" || normalized === "delete";
};
