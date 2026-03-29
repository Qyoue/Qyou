import { useCallback, useEffect, useState } from "react";
import { bootstrapSession } from "./sessionBootstrap";
import { useSessionStore } from "./sessionStore";

export type SessionBootState = "loading" | "authenticated" | "unauthenticated" | "locked";

export const useSessionBootstrap = () => {
  const [state, setState] = useState<SessionBootState>("loading");
  const [message, setMessage] = useState("Initializing secure session...");
  const setStateSnapshot = useSessionStore((stateStore) => stateStore.setStateSnapshot);

  const runBootstrap = useCallback(async () => {
    setState("loading");
    setMessage("Initializing secure session...");
    setStateSnapshot({
      status: "loading",
      message: "Initializing secure session...",
    });

    const result = await bootstrapSession();
    setState(result.state);
    setMessage(result.message);
    setStateSnapshot({
      status: result.state,
      message: result.message,
      deviceId: result.deviceId,
    });
  }, [setStateSnapshot]);

  useEffect(() => {
    void runBootstrap();
  }, [runBootstrap]);

  return {
    state,
    message,
    retry: runBootstrap,
  };
};
