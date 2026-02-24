import { useCallback, useEffect, useState } from "react";
import { bootstrapSession } from "./sessionBootstrap";

export type SessionBootState = "loading" | "authenticated" | "unauthenticated" | "locked";

export const useSessionBootstrap = () => {
  const [state, setState] = useState<SessionBootState>("loading");
  const [message, setMessage] = useState("Initializing secure session...");

  const runBootstrap = useCallback(async () => {
    setState("loading");
    setMessage("Initializing secure session...");

    const result = await bootstrapSession();
    setState(result.state);
    setMessage(result.message);
  }, []);

  useEffect(() => {
    void runBootstrap();
  }, [runBootstrap]);

  return {
    state,
    message,
    retry: runBootstrap,
  };
};
