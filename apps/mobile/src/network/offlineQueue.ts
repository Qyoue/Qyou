import AsyncStorage from "@react-native-async-storage/async-storage";
import { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { setQueueState } from "./queueState";
import { QueuedRequest } from "./types";

const QUEUE_STORAGE_KEY = "qyou_offline_request_queue_v1";

let queueCache: QueuedRequest[] | null = null;
let flushInFlight = false;

const loadQueue = async (): Promise<QueuedRequest[]> => {
  if (queueCache) {
    return queueCache;
  }
  const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
  if (!raw) {
    queueCache = [];
    return queueCache;
  }

  try {
    const parsed = JSON.parse(raw) as QueuedRequest[];
    queueCache = Array.isArray(parsed) ? parsed : [];
  } catch {
    queueCache = [];
  }
  return queueCache;
};

const saveQueue = async (queue: QueuedRequest[]) => {
  queueCache = queue;
  setQueueState({ pendingCount: queue.length });
  await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
};

export const getPendingQueueCount = async (): Promise<number> => {
  const queue = await loadQueue();
  return queue.length;
};

export const enqueueRequest = async (request: QueuedRequest) => {
  const queue = await loadQueue();
  queue.push(request);
  await saveQueue(queue);
};

const removeAt = (queue: QueuedRequest[], index: number): QueuedRequest[] => {
  return [...queue.slice(0, index), ...queue.slice(index + 1)];
};

export const flushQueuedRequests = async (apiClient: AxiosInstance): Promise<void> => {
  if (flushInFlight) {
    return;
  }
  flushInFlight = true;
  setQueueState({ isFlushing: true });

  try {
    let queue = await loadQueue();

    for (let i = 0; i < queue.length; ) {
      const item = queue[i];

      try {
        const requestConfig = {
          method: item.method,
          url: item.url,
          headers: item.headers,
          params: item.params,
          data: item.data,
          timeout: item.timeout,
        } as InternalAxiosRequestConfig & { metadata?: { skipQueue?: boolean } };
        requestConfig.metadata = { skipQueue: true };

        await apiClient.request(requestConfig);

        queue = removeAt(queue, i);
        await saveQueue(queue);
      } catch {
        item.retryCount += 1;
        queue[i] = item;
        await saveQueue(queue);
        break;
      }
    }
  } finally {
    flushInFlight = false;
    setQueueState({ isFlushing: false });
  }
};
