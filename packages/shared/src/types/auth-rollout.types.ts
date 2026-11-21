export type RolloutStage = 'canary' | 'staged' | 'general_availability';

export interface AuthRolloutConfig {
  stage: RolloutStage;
  canaryPercentage: number;
  enableCrossTabSync: boolean;
  enablePersistentStorage: boolean;
}

export interface UserRolloutEvaluation {
  isEligibleForCanary: boolean;
  activeFeatures: string[];
}
