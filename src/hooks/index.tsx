/**
 * React Hooks for Hardware-Aware Feature Flags
 *
 * Provides React hooks for integrating feature flags into React components.
 * This is an optional module that requires React as a peer dependency.
 */

import { useEffect, useState, useContext, createContext, useCallback, useRef } from 'react';
import type {
  EvaluationResult,
  FeatureFlagsConfig,
  FlagEvent,
  FlagEventListener,
  HardwareCapabilities,
  UserPreferences,
} from '../types/index.js';
import {
  getGlobalRegistry,
  type FeatureFlagManager,
  type FeatureFlagRegistry,
} from '../core/index.js';

/**
 * Feature Flags Context
 */
interface FeatureFlagsContextValue {
  manager: FeatureFlagManager | null;
  registry: FeatureFlagRegistry;
  initialized: boolean;
  error: Error | null;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue | null>(null);

/**
 * Feature Flags Provider Props
 */
export interface FeatureFlagsProviderProps {
  children: React.ReactNode;
  config?: Partial<FeatureFlagsConfig>;
  features?: import('../types/index.js').FeatureFlag[];
  registry?: FeatureFlagRegistry;
  autoInitialize?: boolean;
}

/**
 * Feature Flags Provider Component
 *
 * Wraps your application to provide feature flag functionality.
 *
 * @example
 * ```tsx
 * <FeatureFlagsProvider config={{ debug: true }}>
 *   <App />
 * </FeatureFlagsProvider>
 * ```
 */
export function FeatureFlagsProvider({
  children,
  config = {},
  features = [],
  registry: customRegistry,
  autoInitialize = true,
}: FeatureFlagsProviderProps) {
  const [manager, setManager] = useState<FeatureFlagManager | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const initializingRef = useRef(false);

  // Import manager dynamically to avoid hard dependency
  const initManager = useCallback(async () => {
    if (initializingRef.current) return;
    initializingRef.current = true;

    try {
      // Dynamically import to allow optional React usage
      const { FeatureFlagManager: Manager } = await import('../core/index.js');

      const registry = customRegistry || getGlobalRegistry();

      // Register custom features if provided
      if (features.length > 0) {
        features.forEach(feature => registry.registerFeature(feature));
      }

      const mgr = new Manager(registry, config);
      await mgr.initialize();

      setManager(mgr);
      setInitialized(true);
    } catch (err) {
      setError(err as Error);
      console.error('[Hardware-Aware-Flags] Failed to initialize:', err);
    }
  }, [config, customRegistry, features]);

  useEffect(() => {
    if (autoInitialize) {
      initManager();
    }
  }, [autoInitialize, initManager]);

  const registry = customRegistry || getGlobalRegistry();

  const contextValue: FeatureFlagsContextValue = {
    manager,
    registry,
    initialized,
    error,
  };

  return (
    <FeatureFlagsContext.Provider value={contextValue}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

/**
 * Use the feature flags context
 */
function useFeatureFlagsContext(): FeatureFlagsContextValue {
  const context = useContext(FeatureFlagsContext);
  if (!context) {
    throw new Error('useFeatureFlagsContext must be used within FeatureFlagsProvider');
  }
  return context;
}

/**
 * Check if a feature is enabled
 *
 * @param featureId - The feature ID to check
 * @returns Whether the feature is enabled
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const hasStreaming = useFeatureFlag('ai.streaming_responses');
 *   return hasStreaming ? <StreamingChat /> : <BasicChat />;
 * }
 * ```
 */
export function useFeatureFlag(featureId: string): boolean {
  const { manager, initialized } = useFeatureFlagsContext();

  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!manager || !initialized) return;

    // Check initial value
    setEnabled(manager.isEnabled(featureId));

    // Listen for changes
    const listener: FlagEventListener = (event) => {
      if (event.featureId === featureId || event.type === 'preferences_changed') {
        setEnabled(manager.isEnabled(featureId));
      }
    };

    manager.addEventListener('feature_evaluated', listener);
    manager.addEventListener('feature_enabled', listener);
    manager.addEventListener('feature_disabled', listener);
    manager.addEventListener('preferences_changed', listener);

    return () => {
      manager.removeEventListener('feature_evaluated', listener);
      manager.removeEventListener('feature_enabled', listener);
      manager.removeEventListener('feature_disabled', listener);
      manager.removeEventListener('preferences_changed', listener);
    };
  }, [manager, initialized, featureId]);

  return enabled;
}

/**
 * Get detailed evaluation result for a feature
 *
 * @param featureId - The feature ID to evaluate
 * @returns Detailed evaluation result
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const result = useFeatureFlagResult('ai.local_models');
 *   if (!result.enabled) {
 *     return <div>Not available: {result.reason}</div>;
 *   }
 *   return <LocalModels />;
 * }
 * ```
 */
export function useFeatureFlagResult(featureId: string): EvaluationResult | null {
  const { manager, initialized } = useFeatureFlagsContext();

  const [result, setResult] = useState<EvaluationResult | null>(null);

  useEffect(() => {
    if (!manager || !initialized) return;

    // Get initial result
    try {
      setResult(manager.evaluate(featureId));
    } catch (err) {
      console.error(`Failed to evaluate feature ${featureId}:`, err);
    }

    // Listen for changes
    const listener: FlagEventListener = (event) => {
      if (event.featureId === featureId || event.type === 'preferences_changed') {
        try {
          setResult(manager.evaluate(featureId));
        } catch (err) {
          console.error(`Failed to evaluate feature ${featureId}:`, err);
        }
      }
    };

    manager.addEventListener('feature_enabled', listener);
    manager.addEventListener('feature_disabled', listener);
    manager.addEventListener('preferences_changed', listener);

    return () => {
      manager.removeEventListener('feature_enabled', listener);
      manager.removeEventListener('feature_disabled', listener);
      manager.removeEventListener('preferences_changed', listener);
    };
  }, [manager, initialized, featureId]);

  return result;
}

/**
 * Check multiple feature flags at once
 *
 * @param featureIds - Array of feature IDs to check
 * @returns Map of feature IDs to enabled status
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const flags = useFeatureFlags(['ai.streaming', 'ui.animations']);
 *   return (
 *     <div>
 *       Streaming: {flags.get('ai.streaming') ? '✓' : '✗'}
 *       Animations: {flags.get('ui.animations') ? '✓' : '✗'}
 *     </div>
 *   );
 * }
 * ```
 */
export function useFeatureFlags(featureIds: string[]): Map<string, boolean> {
  const { manager, initialized } = useFeatureFlagsContext();

  const [flags, setFlags] = useState<Map<string, boolean>>(new Map());

  useEffect(() => {
    if (!manager || !initialized) return;

    // Check initial values
    const initialFlags = new Map<string, boolean>();
    featureIds.forEach(id => {
      initialFlags.set(id, manager.isEnabled(id));
    });
    setFlags(initialFlags);

    // Listen for changes
    const listener: FlagEventListener = () => {
      const updatedFlags = new Map<string, boolean>();
      featureIds.forEach(id => {
        updatedFlags.set(id, manager.isEnabled(id));
      });
      setFlags(updatedFlags);
    };

    manager.addEventListener('feature_enabled', listener);
    manager.addEventListener('feature_disabled', listener);
    manager.addEventListener('preferences_changed', listener);

    return () => {
      manager.removeEventListener('feature_enabled', listener);
      manager.removeEventListener('feature_disabled', listener);
      manager.removeEventListener('preferences_changed', listener);
    };
  }, [manager, initialized, featureIds]);

  return flags;
}

/**
 * Get all enabled features
 *
 * @returns Array of enabled feature IDs
 *
 * @example
 * ```tsx
 * function DebugPanel() {
 *   const enabledFeatures = useEnabledFeatures();
 *   return <div>Enabled: {enabledFeatures.join(', ')}</div>;
 * }
 * ```
 */
export function useEnabledFeatures(): string[] {
  const { manager, initialized } = useFeatureFlagsContext();

  const [features, setFeatures] = useState<string[]>([]);

  useEffect(() => {
    if (!manager || !initialized) return;

    // Get initial features
    setFeatures(manager.getEnabledFeatures());

    // Listen for changes
    const listener: FlagEventListener = () => {
      setFeatures(manager.getEnabledFeatures());
    };

    manager.addEventListener('feature_enabled', listener);
    manager.addEventListener('feature_disabled', listener);
    manager.addEventListener('preferences_changed', listener);

    return () => {
      manager.removeEventListener('feature_enabled', listener);
      manager.removeEventListener('feature_disabled', listener);
      manager.removeEventListener('preferences_changed', listener);
    };
  }, [manager, initialized]);

  return features;
}

/**
 * Get hardware capabilities
 *
 * @returns Hardware capabilities detected by the system
 *
 * @example
 * ```tsx
 * function HardwareInfo() {
 *   const hardware = useHardwareCapabilities();
 *   return (
 *     <div>
 *       Score: {hardware.score}/100
 *       Profile: {hardware.profile}
 *     </div>
 *   );
 * }
 * ```
 */
export function useHardwareCapabilities(): HardwareCapabilities | null {
  const { manager, initialized } = useFeatureFlagsContext();

  const [hardware, setHardware] = useState<HardwareCapabilities | null>(null);

  useEffect(() => {
    if (!manager || !initialized) return;

    try {
      setHardware(manager.getHardwareCapabilities());
    } catch (err) {
      console.error('Failed to get hardware capabilities:', err);
    }
  }, [manager, initialized]);

  return hardware;
}

/**
 * Control a feature flag (enable/disable/reset)
 *
 * @param featureId - The feature ID to control
 * @returns Object with control methods
 *
 * @example
 * ```tsx
 * function FeatureToggle({ featureId }: { featureId: string }) {
 *   const { enabled, enable, disable, reset } = useFeatureFlagControl(featureId);
 *   return (
 *     <div>
 *       <button onClick={enable}>Enable</button>
 *       <button onClick={disable}>Disable</button>
 *       <button onClick={reset}>Auto</button>
 *       Current: {enabled ? 'ON' : 'OFF'}
 *     </div>
 *   );
 * }
 * ```
 */
export function useFeatureFlagControl(featureId: string) {
  const { manager, initialized } = useFeatureFlagsContext();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!manager || !initialized) return;

    setEnabled(manager.isEnabled(featureId));

    const listener: FlagEventListener = () => {
      setEnabled(manager.isEnabled(featureId));
    };

    manager.addEventListener('feature_enabled', listener);
    manager.addEventListener('feature_disabled', listener);
    manager.addEventListener('preferences_changed', listener);

    return () => {
      manager.removeEventListener('feature_enabled', listener);
      manager.removeEventListener('feature_disabled', listener);
      manager.removeEventListener('preferences_changed', listener);
    };
  }, [manager, initialized, featureId]);

  const enable = useCallback(() => {
    if (!manager || !initialized) return;
    manager.enable(featureId);
  }, [manager, initialized, featureId]);

  const disable = useCallback(() => {
    if (!manager || !initialized) return;
    manager.disable(featureId);
  }, [manager, initialized, featureId]);

  const reset = useCallback(() => {
    if (!manager || !initialized) return;
    manager.reset(featureId);
  }, [manager, initialized, featureId]);

  return {
    enabled,
    enable,
    disable,
    reset,
  };
}

/**
 * Get the feature flags manager instance
 *
 * @returns The feature flags manager
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const manager = useFeatureFlagsManager();
 *   const handleExport = () => {
 *     const state = manager.exportState();
 *     console.log(state);
 *   };
 *   return <button onClick={handleExport}>Export State</button>;
 * }
 * ```
 */
export function useFeatureFlagsManager(): FeatureFlagManager | null {
  const { manager } = useFeatureFlagsContext();
  return manager;
}
