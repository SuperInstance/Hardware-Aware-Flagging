/**
 * Hardware-Aware Feature Flagging System
 *
 * A comprehensive feature flag system with hardware capability detection,
 * graceful degradation, and progressive enhancement.
 *
 * @example
 * ```typescript
 * import { FeatureFlagRegistry, FeatureFlagManager } from '@superinstance/hardware-aware-flagging';
 *
 * const registry = new FeatureFlagRegistry();
 * const manager = new FeatureFlagManager(registry, { debug: true });
 * await manager.initialize();
 *
 * if (manager.isEnabled('my.feature')) {
 *   // Feature is enabled
 * }
 * ```
 */

// Core types
export * from './types/index.js';

// Core functionality
export { FeatureFlagRegistry, getGlobalRegistry, resetGlobalRegistry } from './core/registry.js';
export { FeatureFlagManager } from './core/manager.js';

// Utilities
export { detectHardware, calculateProfile } from './utils/hardware-detection.js';

// Re-export default config for convenience
export { DEFAULT_CONFIG } from './types/index.js';
