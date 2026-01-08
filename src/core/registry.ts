/**
 * Feature Flag Registry
 *
 * Central registry of all feature flags.
 * Each feature is defined with its requirements, dependencies, and metadata.
 */

import type {
  FeatureFlag,
  FeatureCategory,
  IFeatureFlagRegistry,
} from '../types/index.js';

/**
 * Feature flag registry implementation
 */
export class FeatureFlagRegistry implements IFeatureFlagRegistry {
  private features: Map<string, FeatureFlag> = new Map();

  constructor(features: FeatureFlag[] = []) {
    features.forEach(feature => this.registerFeature(feature));
  }

  getAllFeatures(): FeatureFlag[] {
    return Array.from(this.features.values());
  }

  getFeature(id: string): FeatureFlag | undefined {
    return this.features.get(id);
  }

  getFeaturesByCategory(category: FeatureCategory): FeatureFlag[] {
    return this.getAllFeatures().filter(f => f.category === category);
  }

  getFeaturesByTag(tag: string): FeatureFlag[] {
    return this.getAllFeatures().filter(f => f.tags.includes(tag));
  }

  registerFeature(feature: FeatureFlag): void {
    this.features.set(feature.id, feature);
  }

  unregisterFeature(id: string): void {
    this.features.delete(id);
  }

  updateFeature(id: string, updates: Partial<FeatureFlag>): void {
    const existing = this.features.get(id);
    if (existing) {
      this.features.set(id, { ...existing, ...updates });
    }
  }
}

// Global registry instance
let globalRegistry: FeatureFlagRegistry | null = null;

/**
 * Get the global feature flag registry instance
 */
export function getGlobalRegistry(): FeatureFlagRegistry {
  if (!globalRegistry) {
    globalRegistry = new FeatureFlagRegistry();
  }
  return globalRegistry;
}

/**
 * Reset the global registry (useful for testing)
 */
export function resetGlobalRegistry(): void {
  globalRegistry = null;
}
