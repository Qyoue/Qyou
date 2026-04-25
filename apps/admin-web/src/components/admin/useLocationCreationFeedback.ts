"use client";

import { useCallback, useState } from "react";

type MutationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

type UseLocationCreationFeedbackReturn = {
  state: MutationState;
  /** Wrap your submit handler with this to get automatic feedback. */
  withFeedback: (fn: () => Promise<void>) => Promise<void>;
  reset: () => void;
  /** Drop-in JSX banner – renders nothing when status is idle or loading. */
  FeedbackBanner: () => JSX.Element | null;
};

/**
 * Provides success / failure feedback state for the location creation flow.
 * Covers issue #186 – success and failure feedback around admin location creation.
 *
 * Usage:
 *   const { withFeedback, FeedbackBanner } = useLocationCreationFeedback();
 *   const onSubmit = () => withFeedback(async () => { ... await createLocation() ... });
 */
export function useLocationCreationFeedback(): UseLocationCreationFeedbackReturn {
  const [state, setState] = useState<MutationState>({ status: "idle" });

  const withFeedback = useCallback(async (fn: () => Promise<void>) => {
    setState({ status: "loading" });
    try {
      await fn();
      setState({ status: "success", message: "Location created successfully." });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setState({ status: "error", message });
    }
  }, []);

  const reset = useCallback(() => setState({ status: "idle" }), []);

  const FeedbackBanner = useCallback((): JSX.Element | null => {
    if (state.status === "idle" || state.status === "loading") return null;

    const isSuccess = state.status === "success";
    return (
      <div
        role={isSuccess ? "status" : "alert"}
        aria-live="polite"
        style={{
          marginTop: "1rem",
          padding: "0.75rem 1rem",
          borderRadius: "0.375rem",
          background: isSuccess ? "#d1fae5" : "#fee2e2",
          color: isSuccess ? "#065f46" : "#991b1b",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.875rem",
        }}
      >
        <span>{state.message}</span>
        <button
          onClick={reset}
          aria-label="Dismiss"
          style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}
        >
          ✕
        </button>
      </div>
    );
  }, [state, reset]);

  return { state, withFeedback, reset, FeedbackBanner };
}
