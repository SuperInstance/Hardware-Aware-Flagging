/**
 * React Integration for Hardware-Aware Feature Flags
 *
 * Provides React hooks and components for integrating feature flags
 * into React applications.
 *
 * @example
 * ```tsx
 * import { FeatureFlagsProvider, useFeatureFlag } from '@superinstance/hardware-aware-flagging/react';
 *
 * function App() {
 *   return (
 *     <FeatureFlagsProvider config={{ debug: true }}>
 *       <MyComponent />
 *     </FeatureFlagsProvider>
 *   );
 * }
 *
 * function MyComponent() {
 *   const hasFeature = useFeatureFlag('my.feature');
 *   return hasFeature ? <AdvancedFeature /> : <BasicFeature />;
 * }
 * ```
 */

// React hooks and components
export * from './hooks/index.js';

// Re-export core types for convenience
export * from './types/index.js';

// Re-export core functionality for convenience
export * from './core/index.js';
