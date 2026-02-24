type QueueState = {
  isOnline: boolean;
  pendingCount: number;
  isFlushing: boolean;
};

type Listener = (state: QueueState) => void;

let state: QueueState = {
  isOnline: true,
  pendingCount: 0,
  isFlushing: false,
};

const listeners = new Set<Listener>();

export const getQueueState = () => state;

export const setQueueState = (partial: Partial<QueueState>) => {
  state = { ...state, ...partial };
  for (const listener of listeners) {
    listener(state);
  }
};

export const subscribeQueueState = (listener: Listener) => {
  listeners.add(listener);
  listener(state);
  return () => {
    listeners.delete(listener);
  };
};
