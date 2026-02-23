import { useEffect, useState } from "react";
import { getQueueState, subscribeQueueState } from "./queueState";

export const useOfflineQueueStatus = () => {
  const [state, setState] = useState(getQueueState());

  useEffect(() => {
    return subscribeQueueState((next) => {
      setState(next);
    });
  }, []);

  return state;
};
