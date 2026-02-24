export type BackgroundTrackingPreparation = {
  ready: boolean;
  taskName: string;
  reason: string;
};

export const BACKGROUND_LOCATION_TASK = "qyou-background-location-task";

export const prepareBackgroundTracking = (): BackgroundTrackingPreparation => {
  return {
    ready: false,
    taskName: BACKGROUND_LOCATION_TASK,
    reason:
      "Background tracking hook prepared. Task registration and policy gating can be added in the next phase.",
  };
};
