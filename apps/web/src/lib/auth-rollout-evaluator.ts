import {
  rolloutConfigSchema,
  type AuthRolloutConfig,
  type UserRolloutEvaluation,
} from '@qyou/shared';

const defaultConfig: AuthRolloutConfig = {
  stage: 'canary',
  canaryPercentage: 25,
  enableCrossTabSync: true,
  enablePersistentStorage: true,
};

export function evaluateRolloutEligibility(userId: string): UserRolloutEvaluation {
  const validation = rolloutConfigSchema.safeParse(defaultConfig);
  if (!validation.success) {
    return { isEligibleForCanary: false, activeFeatures: [] };
  }

  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const isEligible = hash % 100 < validation.data.canaryPercentage;

  return {
    isEligibleForCanary: isEligible,
    activeFeatures: isEligible ? ['cross_tab_sync', 'persistent_storage'] : ['basic_auth'],
  };
}
