import { useCallback, useEffect, useRef, useState } from "react";
import { bootstrapSession } from "./sessionBootstrap";
import { useSessionStore } from "./sessionStore";

export type SessionBootState = "loading" | "authenticated" | "unauthenticated" | "locked";

export const useSessionBootstrap = () => {
  const [state, setState] = useState<SessionBootState>("loading");
  const [message, setMessage] = useState("Initializing secure session...");
  const setStateSnapshot = useSessionStore((stateStore) => stateStore.setStateSnapshot);
  const runIdRef = useRef(0);
  const mountedRef = useRef(true);

  const runBootstrap = useCallback(async () => {
    const currentRun = runIdRef.current + 1;
    runIdRef.current = currentRun;

    setState("loading");
    setMessage("Initializing secure session...");
    setStateSnapshot({
      status: "loading",
      message: "Initializing secure session...",
    });

    const result = await bootstrapSession();
    if (!mountedRef.current || currentRun !== runIdRef.current) {
      return;
    }

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
    return () => {
      mountedRef.current = false;
    };
  }, [runBootstrap]);

  return {
    state,
    message,
    retry: runBootstrap,
  };
};
