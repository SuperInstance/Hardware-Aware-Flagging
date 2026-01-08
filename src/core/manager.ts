/**
 * Feature Flag Manager
 *
 * Evaluates feature flags based on hardware capabilities, user preferences,
 * and dependencies. Provides an API for querying and controlling features.
 */

import type {
  FeatureFlag,
  FeatureState,
  HardwareCapabilities,
  UserPreferences,
  EvaluationContext,
  EvaluationResult,
  FeatureMetrics,
  FlagEvent,
  FlagEventListener,
  IFeatureFlagManager,
  IFeatureFlagRegistry,
  FeatureFlagsConfig,
} from '../types/index.js';
import { DEFAULT_CONFIG } from '../types/index.js';
import { detectHardware } from '../utils/hardware-detection.js';

/**
 * Generate a random session ID
 */
function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate A/B test bucket
 */
function generateTestBucket(): string {
  const buckets = ['control', 'variant_a', 'variant_b', 'variant_c'];
  return buckets[Math.floor(Math.random() * buckets.length)];
}

/**
 * Load user preferences from localStorage
 */
function loadUserPreferences(storageKey: string): UserPreferences {
  if (typeof window === 'undefined') {
    return {
      enabledFeatures: new Set(),
      disabledFeatures: new Set(),
      testBucket: generateTestBucket(),
      optInExperimental: false,
    };
  }

  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) {
      return {
        enabledFeatures: new Set(),
        disabledFeatures: new Set(),
        testBucket: generateTestBucket(),
        optInExperimental: false,
      };
    }

    const data = JSON.parse(stored);
    return {
      enabledFeatures: new Set(data.enabledFeatures || []),
      disabledFeatures: new Set(data.disabledFeatures || []),
      testBucket: data.testBucket || generateTestBucket(),
      optInExperimental: data.optInExperimental || false,
      customHardwareThreshold: data.customHardwareThreshold,
    };
  } catch (e) {
    console.error('[Hardware-Aware-Flags] Failed to load user preferences:', e);
    return {
      enabledFeatures: new Set(),
      disabledFeatures: new Set(),
      testBucket: generateTestBucket(),
      optInExperimental: false,
    };
  }
}

/**
 * Save user preferences to localStorage
 */
function saveUserPreferences(preferences: UserPreferences, storageKey: string): void {
  if (typeof window === 'undefined') return;

  try {
    const data = {
      enabledFeatures: Array.from(preferences.enabledFeatures),
      disabledFeatures: Array.from(preferences.disabledFeatures),
      testBucket: preferences.testBucket,
      optInExperimental: preferences.optInExperimental,
      customHardwareThreshold: preferences.customHardwareThreshold,
    };
    localStorage.setItem(storageKey, JSON.stringify(data));
  } catch (e) {
    console.error('[Hardware-Aware-Flags] Failed to save user preferences:', e);
  }
}

/**
 * Feature flag manager implementation
 */
export class FeatureFlagManager implements IFeatureFlagManager {
  private registry: IFeatureFlagRegistry;
  private config: FeatureFlagsConfig;
  private hardware: HardwareCapabilities | null = null;
  private preferences: UserPreferences;
  private sessionId: string;
  private metrics: Map<string, FeatureMetrics> = new Map();
  private listeners: Map<string, FlagEventListener[]> = new Map();
  private initialized = false;

  constructor(
    registry: IFeatureFlagRegistry,
    config: Partial<FeatureFlagsConfig> = {},
  ) {
    this.registry = registry;
    this.config = { ...DEFAULT_CONFIG, ...config } as FeatureFlagsConfig;
    this.preferences = loadUserPreferences(this.config.storageKey);
    this.sessionId = generateSessionId();
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      if (this.config.debug) {
        console.log('[Hardware-Aware-Flags] Already initialized');
      }
      return;
    }

    if (this.config.debug) {
      console.log('[Hardware-Aware-Flags] Initializing...');
    }

    // Detect hardware
    this.hardware = await detectHardware();

    if (this.config.debug) {
      console.log('[Hardware-Aware-Flags] Hardware detected:', this.hardware);
    }

    // Emit hardware detected event
    this.emit('hardware_detected', {
      hardware: this.hardware,
    });

    // Auto-disable features based on performance
    if (this.config.autoPerformanceGate) {
      this.setupPerformanceGating();
    }

    this.initialized = true;

    if (this.config.debug) {
      console.log('[Hardware-Aware-Flags] Initialization complete');
    }
  }

  private getEvaluationContext(): EvaluationContext {
    if (!this.hardware) {
      throw new Error('Feature flag manager not initialized. Call initialize() first.');
    }

    return {
      hardware: this.hardware,
      preferences: this.preferences,
      timestamp: Date.now(),
      sessionId: this.sessionId,
    };
  }

  private evaluateFeature(feature: FeatureFlag, context: EvaluationContext): EvaluationResult {
    const startTime = performance.now();
    const { hardware, preferences } = context;

    // Track metrics
    if (this.config.trackMetrics) {
      this.trackEvaluation(feature.id);
    }

    // Check user overrides first (highest priority)
    if (preferences.disabledFeatures.has(feature.id)) {
      return {
        featureId: feature.id,
        enabled: false,
        reason: 'User manually disabled',
        hardwareScore: hardware.score,
        userOverride: true,
        missingDependencies: [],
      };
    }

    if (preferences.enabledFeatures.has(feature.id)) {
      // Check if dependencies are met even for forced features
      const missingDeps = this.checkDependencies(feature, context);
      if (missingDeps.length > 0) {
        return {
          featureId: feature.id,
          enabled: false,
          reason: 'Missing dependencies (even when forced)',
          hardwareScore: hardware.score,
          userOverride: true,
          missingDependencies: missingDeps,
        };
      }

      return {
        featureId: feature.id,
        enabled: true,
        reason: 'User manually enabled',
        hardwareScore: hardware.score,
        userOverride: true,
        missingDependencies: [],
      };
    }

    // Check if experimental and user hasn't opted in
    if (feature.experimental && !preferences.optInExperimental) {
      return {
        featureId: feature.id,
        enabled: false,
        reason: 'Experimental feature and user not opted in',
        hardwareScore: hardware.score,
        userOverride: false,
        missingDependencies: [],
      };
    }

    // Check hardware requirements
    const effectiveThreshold = preferences.customHardwareThreshold ?? hardware.score;
    if (feature.minHardwareScore > effectiveThreshold) {
      return {
        featureId: feature.id,
        enabled: false,
        reason: `Hardware score too low (${hardware.score} < ${feature.minHardwareScore})`,
        hardwareScore: hardware.score,
        userOverride: false,
        missingDependencies: [],
      };
    }

    // Check specific hardware requirements
    if (feature.minRAM && hardware.ram < feature.minRAM) {
      return {
        featureId: feature.id,
        enabled: false,
        reason: `Insufficient RAM (${hardware.ram}GB < ${feature.minRAM}GB)`,
        hardwareScore: hardware.score,
        userOverride: false,
        missingDependencies: [],
      };
    }

    if (feature.minCores && hardware.cores < feature.minCores) {
      return {
        featureId: feature.id,
        enabled: false,
        reason: `Insufficient CPU cores (${hardware.cores} < ${feature.minCores})`,
        hardwareScore: hardware.score,
        userOverride: false,
        missingDependencies: [],
      };
    }

    if (feature.requiresGPU && !hardware.hasGPU) {
      return {
        featureId: feature.id,
        enabled: false,
        reason: 'GPU required but not available',
        hardwareScore: hardware.score,
        userOverride: false,
        missingDependencies: [],
      };
    }

    if (feature.minNetworkSpeed && hardware.networkSpeed < feature.minNetworkSpeed) {
      return {
        featureId: feature.id,
        enabled: false,
        reason: `Network speed too low (${hardware.networkSpeed}Mbps < ${feature.minNetworkSpeed}Mbps)`,
        hardwareScore: hardware.score,
        userOverride: false,
        missingDependencies: [],
      };
    }

    // Check dependencies
    const missingDeps = this.checkDependencies(feature, context);
    if (missingDeps.length > 0) {
      return {
        featureId: feature.id,
        enabled: false,
        reason: `Missing dependencies: ${missingDeps.join(', ')}`,
        hardwareScore: hardware.score,
        userOverride: false,
        missingDependencies: missingDeps,
      };
    }

    // Check rollout percentage
    if (feature.rolloutPercentage !== undefined) {
      const hash = this.hashFeatureId(feature.id, context.sessionId);
      if (hash > feature.rolloutPercentage) {
        return {
          featureId: feature.id,
          enabled: false,
          reason: 'Not in rollout percentage',
          hardwareScore: hardware.score,
          userOverride: false,
          missingDependencies: [],
        };
      }
    }

    // Check A/B test variant
    let variant: string | undefined;
    if (feature.variant) {
      variant = this.assignVariant(feature.id, preferences.testBucket);
    }

    // All checks passed, feature is enabled
    const evalTime = performance.now() - startTime;
    if (this.config.trackMetrics) {
      this.updateEvaluationTime(feature.id, evalTime);
    }

    return {
      featureId: feature.id,
      enabled: true,
      reason: 'All requirements met',
      hardwareScore: hardware.score,
      userOverride: false,
      missingDependencies: [],
      variant,
    };
  }

  private checkDependencies(feature: FeatureFlag, context: EvaluationContext): string[] {
    return feature.dependencies.filter(depId => {
      const dep = this.registry.getFeature(depId);
      if (!dep) return true; // Missing dependency

      const result = this.evaluateFeature(dep, context);
      return !result.enabled;
    });
  }

  private hashFeatureId(featureId: string, sessionId: string): number {
    const str = `${featureId}-${sessionId}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash) % 101; // 0-100
  }

  private assignVariant(featureId: string, testBucket: string): string {
    // Simple variant assignment based on test bucket
    const variants = ['control', 'variant_a', 'variant_b'];
    const hash = this.hashFeatureId(featureId, testBucket);
    return variants[hash % variants.length];
  }

  private trackEvaluation(featureId: string): void {
    if (!this.metrics.has(featureId)) {
      this.metrics.set(featureId, {
        featureId,
        evaluations: 0,
        enabledCount: 0,
        disabledCount: 0,
        avgEvaluationTime: 0,
        lastEvaluated: 0,
        performanceEvents: 0,
      });
    }

    const metrics = this.metrics.get(featureId)!;
    metrics.evaluations++;
    metrics.lastEvaluated = Date.now();
  }

  private trackEnabled(featureId: string): void {
    const metrics = this.metrics.get(featureId);
    if (metrics) {
      metrics.enabledCount++;
    }
  }

  private trackDisabled(featureId: string): void {
    const metrics = this.metrics.get(featureId);
    if (metrics) {
      metrics.disabledCount++;
    }
  }

  private updateEvaluationTime(featureId: string, time: number): void {
    const metrics = this.metrics.get(featureId);
    if (metrics) {
      const totalTime = metrics.avgEvaluationTime * (metrics.evaluations - 1) + time;
      metrics.avgEvaluationTime = totalTime / metrics.evaluations;
    }
  }

  private emit(type: string, data: unknown): void {
    const event: FlagEvent = {
      type: type as any,
      timestamp: Date.now(),
      data,
    };

    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.forEach(listener => listener(event));
    }

    // Also emit to wildcard listeners
    const wildcardListeners = this.listeners.get('*');
    if (wildcardListeners) {
      wildcardListeners.forEach(listener => listener(event));
    }
  }

  private setupPerformanceGating(): void {
    // Monitor performance and auto-disable features if needed
    if (typeof window === 'undefined' || !window.PerformanceObserver) {
      return;
    }

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > this.config.performanceThreshold) {
          // Find features with high performance impact
          const features = this.registry.getAllFeatures().filter(
            f => f.performanceImpact > 50 && this.isEnabled(f.id)
          );

          // Emit performance degradation event
          this.emit('performance_degraded', {
            entry: entry.name,
            duration: entry.duration,
            candidateFeatures: features.map(f => f.id),
          });
        }
      }
    });

    observer.observe({ entryTypes: ['measure', 'navigation'] });
  }

  isEnabled(featureId: string): boolean {
    if (!this.initialized) {
      throw new Error('Feature flag manager not initialized. Call initialize() first.');
    }

    const feature = this.registry.getFeature(featureId);
    if (!feature) {
      console.warn(`[Hardware-Aware-Flags] Feature not found: ${featureId}`);
      return false;
    }

    const context = this.getEvaluationContext();
    const result = this.evaluateFeature(feature, context);

    if (result.enabled) {
      this.trackEnabled(featureId);
    } else {
      this.trackDisabled(featureId);
    }

    this.emit('feature_evaluated', { featureId, result });

    return result.enabled;
  }

  evaluate(featureId: string): EvaluationResult {
    if (!this.initialized) {
      throw new Error('Feature flag manager not initialized. Call initialize() first.');
    }

    const feature = this.registry.getFeature(featureId);
    if (!feature) {
      throw new Error(`Feature not found: ${featureId}`);
    }

    const context = this.getEvaluationContext();
    return this.evaluateFeature(feature, context);
  }

  getEnabledFeatures(): string[] {
    if (!this.initialized) {
      throw new Error('Feature flag manager not initialized. Call initialize() first.');
    }

    return this.registry
      .getAllFeatures()
      .map(f => f.id)
      .filter(id => this.isEnabled(id));
  }

  getDisabledFeatures(): string[] {
    if (!this.initialized) {
      throw new Error('Feature flag manager not initialized. Call initialize() first.');
    }

    return this.registry
      .getAllFeatures()
      .map(f => f.id)
      .filter(id => !this.isEnabled(id));
  }

  enable(featureId: string): void {
    const feature = this.registry.getFeature(featureId);
    if (!feature) {
      throw new Error(`Feature not found: ${featureId}`);
    }

    if (!feature.userOverridable) {
      throw new Error(`Feature ${featureId} is not user-overridable`);
    }

    this.preferences.disabledFeatures.delete(featureId);
    this.preferences.enabledFeatures.add(featureId);

    if (this.config.persistPreferences) {
      saveUserPreferences(this.preferences, this.config.storageKey);
    }

    this.emit('feature_enabled', { featureId });
    this.emit('preferences_changed', { preferences: this.preferences });
  }

  disable(featureId: string): void {
    const feature = this.registry.getFeature(featureId);
    if (!feature) {
      throw new Error(`Feature not found: ${featureId}`);
    }

    if (!feature.userOverridable) {
      throw new Error(`Feature ${featureId} is not user-overridable`);
    }

    this.preferences.enabledFeatures.delete(featureId);
    this.preferences.disabledFeatures.add(featureId);

    if (this.config.persistPreferences) {
      saveUserPreferences(this.preferences, this.config.storageKey);
    }

    this.emit('feature_disabled', { featureId });
    this.emit('preferences_changed', { preferences: this.preferences });
  }

  reset(featureId: string): void {
    this.preferences.enabledFeatures.delete(featureId);
    this.preferences.disabledFeatures.delete(featureId);

    if (this.config.persistPreferences) {
      saveUserPreferences(this.preferences, this.config.storageKey);
    }

    this.emit('preferences_changed', { preferences: this.preferences });
  }

  getHardwareCapabilities(): HardwareCapabilities {
    if (!this.hardware) {
      throw new Error('Feature flag manager not initialized. Call initialize() first.');
    }
    return this.hardware;
  }

  getUserPreferences(): UserPreferences {
    return { ...this.preferences };
  }

  updateUserPreferences(updates: Partial<UserPreferences>): void {
    this.preferences = {
      ...this.preferences,
      ...updates,
    };

    if (this.config.persistPreferences) {
      saveUserPreferences(this.preferences, this.config.storageKey);
    }

    this.emit('preferences_changed', { preferences: this.preferences });
  }

  addEventListener(type: any, listener: FlagEventListener): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(listener);
  }

  removeEventListener(type: any, listener: FlagEventListener): void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  getMetrics(featureId: string): FeatureMetrics | undefined {
    return this.metrics.get(featureId);
  }

  resetMetrics(): void {
    this.metrics.clear();
  }

  exportState(): string {
    const state = {
      hardware: this.hardware,
      preferences: {
        ...this.preferences,
        enabledFeatures: Array.from(this.preferences.enabledFeatures),
        disabledFeatures: Array.from(this.preferences.disabledFeatures),
      },
      metrics: Array.from(this.metrics.values()),
      sessionId: this.sessionId,
    };
    return JSON.stringify(state, null, 2);
  }

  importState(stateJson: string): void {
    try {
      const state = JSON.parse(stateJson);
      this.hardware = state.hardware;
      this.preferences = {
        ...state.preferences,
        enabledFeatures: new Set(state.preferences.enabledFeatures),
        disabledFeatures: new Set(state.preferences.disabledFeatures),
      };
      this.metrics = new Map(
        state.metrics.map((m: FeatureMetrics) => [m.featureId, m])
      );
      this.sessionId = state.sessionId;

      if (this.config.persistPreferences) {
        saveUserPreferences(this.preferences, this.config.storageKey);
      }
    } catch (e) {
      throw new Error('Failed to import state: ' + (e as Error).message);
    }
  }
}
