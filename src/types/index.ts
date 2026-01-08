/**
 * Hardware-Aware Feature Flagging System Types
 *
 * Provides type definitions for the feature flag system that enables
 * graceful degradation and progressive enhancement based on hardware
 * capabilities and user preferences.
 */

/**
 * Hardware capability score (0-100)
 * Used to determine which features should be enabled
 */
export type HardwareScore = number;

/**
 * Hardware profile categories
 */
export type HardwareProfile =
  | 'minimal'    // 0-20: Low-end devices, limited features
  | 'basic'      // 21-40: Entry-level devices
  | 'standard'   // 41-60: Mid-range devices
  | 'advanced'   // 61-80: High-end devices
  | 'premium';   // 81-100: Premium hardware, all features

/**
 * Feature flag states
 */
export type FeatureState =
  | 'enabled'     // Feature is active
  | 'disabled'    // Feature is inactive
  | 'forced'      // User manually enabled (override)
  | 'blocked';    // User manually disabled (override)

/**
 * Feature categories for organization
 */
export type FeatureCategory =
  | 'ai'           // AI/ML features
  | 'ui'           // UI/UX features
  | 'knowledge'    // Knowledge base features
  | 'media'        // Media handling features
  | 'advanced';    // Advanced/experimental features

/**
 * Feature flag definition
 */
export interface FeatureFlag {
  /** Unique feature identifier */
  id: string;

  /** Display name for UI */
  name: string;

  /** Description of what the feature does */
  description: string;

  /** Feature category */
  category: FeatureCategory;

  /** Current state */
  state: FeatureState;

  /** Minimum hardware score required (0-100) */
  minHardwareScore: HardwareScore;

  /** Whether user can manually override this feature */
  userOverridable: boolean;

  /** Whether this feature is experimental/unstable */
  experimental: boolean;

  /** A/B test variant (if applicable) */
  variant?: string;

  /** Tags for filtering/searching */
  tags: string[];

  /** Dependencies on other features (feature IDs) */
  dependencies: string[];

  /** Performance impact (0-100, higher = more impact) */
  performanceImpact: number;

  /** Minimum RAM required in GB */
  minRAM?: number;

  /** Minimum CPU cores required */
  minCores?: number;

  /** Whether GPU is required */
  requiresGPU?: boolean;

  /** Minimum network speed required in Mbps */
  minNetworkSpeed?: number;

  /** Migration percentage (0-100) for gradual rollout */
  rolloutPercentage?: number;
}

/**
 * Hardware capabilities detected by the system
 */
export interface HardwareCapabilities {
  /** Overall hardware score (0-100) */
  score: HardwareScore;

  /** Hardware profile category */
  profile: HardwareProfile;

  /** Available RAM in GB */
  ram: number;

  /** CPU core count */
  cores: number;

  /** GPU availability */
  hasGPU: boolean;

  /** GPU info if available */
  gpuInfo?: {
    vendor: string;
    model: string;
    memory: number; // in GB
  };

  /** Network speed in Mbps (estimated) */
  networkSpeed: number;

  /** Storage available in GB */
  storage: number;

  /** Device type */
  deviceType: 'desktop' | 'laptop' | 'tablet' | 'mobile';

  /** Browser/engine info */
  browser: {
    name: string;
    version: string;
  };

  /** Platform info */
  platform: {
    os: string;
    arch: string;
  };
}

/**
 * User preferences for feature flags
 */
export interface UserPreferences {
  /** Manually enabled feature IDs */
  enabledFeatures: Set<string>;

  /** Manually disabled feature IDs */
  disabledFeatures: Set<string>;

  /** A/B test bucket assignment */
  testBucket: string;

  /** Opt-in to experimental features */
  optInExperimental: boolean;

  /** Custom threshold for hardware score */
  customHardwareThreshold?: HardwareScore;
}

/**
 * Feature evaluation context
 */
export interface EvaluationContext {
  /** Current hardware capabilities */
  hardware: HardwareCapabilities;

  /** User preferences */
  preferences: UserPreferences;

  /** Current timestamp */
  timestamp: number;

  /** Session ID for tracking */
  sessionId: string;
}

/**
 * Feature evaluation result
 */
export interface EvaluationResult {
  /** Feature ID */
  featureId: string;

  /** Whether the feature is enabled */
  enabled: boolean;

  /** Reason for the decision */
  reason: string;

  /** Hardware score at evaluation time */
  hardwareScore: HardwareScore;

  /** Whether this was a user override */
  userOverride: boolean;

  /** Dependencies that were missing (if any) */
  missingDependencies: string[];

  /** Variant assignment (if applicable) */
  variant?: string;
}

/**
 * Feature flag metrics for tracking
 */
export interface FeatureMetrics {
  /** Feature ID */
  featureId: string;

  /** Total evaluation count */
  evaluations: number;

  /** Times enabled */
  enabledCount: number;

  /** Times disabled */
  disabledCount: number;

  /** Average evaluation time in ms */
  avgEvaluationTime: number;

  /** Last evaluation timestamp */
  lastEvaluated: number;

  /** Performance degradation events */
  performanceEvents: number;

  /** User satisfaction score (0-5) */
  satisfactionScore?: number;
}

/**
 * Feature flag configuration options
 */
export interface FeatureFlagsConfig {
  /** Whether debug mode is enabled */
  debug: boolean;

  /** Whether to persist preferences to localStorage */
  persistPreferences: boolean;

  /** Whether to track metrics */
  trackMetrics: boolean;

  /** Key for localStorage persistence */
  storageKey: string;

  /** Whether to auto-disable on performance degradation */
  autoPerformanceGate: boolean;

  /** Performance threshold in ms (above this triggers auto-disable) */
  performanceThreshold: number;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: FeatureFlagsConfig = {
  debug: false,
  persistPreferences: true,
  trackMetrics: true,
  storageKey: 'hardware-aware-flags',
  autoPerformanceGate: true,
  performanceThreshold: 1000, // 1 second
};

/**
 * Observable event types
 */
export type FlagEventType =
  | 'feature_enabled'
  | 'feature_disabled'
  | 'feature_evaluated'
  | 'preferences_changed'
  | 'hardware_detected'
  | 'performance_degraded';

/**
 * Feature flag event
 */
export interface FlagEvent {
  /** Event type */
  type: FlagEventType;

  /** Feature ID (if applicable) */
  featureId?: string;

  /** Event timestamp */
  timestamp: number;

  /** Event data */
  data: unknown;
}

/**
 * Event listener type
 */
export type FlagEventListener = (event: FlagEvent) => void;

/**
 * Feature flag registry interface
 */
export interface IFeatureFlagRegistry {
  /** Get all registered features */
  getAllFeatures(): FeatureFlag[];

  /** Get feature by ID */
  getFeature(id: string): FeatureFlag | undefined;

  /** Get features by category */
  getFeaturesByCategory(category: FeatureCategory): FeatureFlag[];

  /** Get features by tag */
  getFeaturesByTag(tag: string): FeatureFlag[];

  /** Register a new feature */
  registerFeature(feature: FeatureFlag): void;

  /** Unregister a feature */
  unregisterFeature(id: string): void;

  /** Update a feature */
  updateFeature(id: string, updates: Partial<FeatureFlag>): void;
}

/**
 * Feature flag manager interface
 */
export interface IFeatureFlagManager {
  /** Initialize the feature flag system */
  initialize(): Promise<void>;

  /** Evaluate whether a feature is enabled */
  isEnabled(featureId: string): boolean;

  /** Get detailed evaluation result */
  evaluate(featureId: string): EvaluationResult;

  /** Get all enabled features */
  getEnabledFeatures(): string[];

  /** Get all disabled features */
  getDisabledFeatures(): string[];

  /** Enable a feature (user override) */
  enable(featureId: string): void;

  /** Disable a feature (user override) */
  disable(featureId: string): void;

  /** Reset feature to auto mode */
  reset(featureId: string): void;

  /** Get current hardware capabilities */
  getHardwareCapabilities(): HardwareCapabilities;

  /** Get user preferences */
  getUserPreferences(): UserPreferences;

  /** Update user preferences */
  updateUserPreferences(updates: Partial<UserPreferences>): void;

  /** Add event listener */
  addEventListener(type: FlagEventType, listener: FlagEventListener): void;

  /** Remove event listener */
  removeEventListener(type: FlagEventType, listener: FlagEventListener): void;

  /** Get metrics for a feature */
  getMetrics(featureId: string): FeatureMetrics | undefined;

  /** Reset all metrics */
  resetMetrics(): void;

  /** Export state */
  exportState(): string;

  /** Import state */
  importState(state: string): void;
}
