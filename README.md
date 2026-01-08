# @superinstance/hardware-aware-flagging

> **Hardware-aware feature flagging system with graceful degradation and progressive enhancement**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/@superinstance/hardware-aware-flagging.svg)](https://www.npmjs.com/package/@superinstance/hardware-aware-flagging)

A comprehensive feature flagging system that detects hardware capabilities and automatically enables/disables features based on device performance. Perfect for applications that need to run smoothly on everything from low-end mobile devices to high-end workstations.

## ✨ Features

- 🔍 **Automatic Hardware Detection** - Detects CPU, RAM, GPU, network, and storage capabilities
- 📊 **Hardware Scoring** - Calculates a 0-100 score for intelligent feature gating
- 🎯 **Graceful Degradation** - Automatically disable heavy features on low-end devices
- 🚀 **Progressive Enhancement** - Enable advanced features on capable hardware
- 👤 **User Overrides** - Allow users to force-enable experimental features
- 🧪 **A/B Testing Support** - Built-in support for experimentation
- ⚡ **Performance Gating** - Auto-disable features causing performance issues
- 💾 **Persistent Preferences** - User preferences saved to localStorage
- ⚛️ **React Integration** - First-class React hooks for easy integration
- 📦 **Zero Dependencies** - Lightweight, no external dependencies (React is peer/optional)

## 🚀 Quick Start

### Installation

```bash
npm install @superinstance/hardware-aware-flagging
```

### Basic Usage

#### Vanilla TypeScript/JavaScript

```typescript
import {
  FeatureFlagRegistry,
  FeatureFlagManager,
} from '@superinstance/hardware-aware-flagging';

// Create registry and define features
const registry = new FeatureFlagRegistry([
  {
    id: 'advanced.animations',
    name: 'Advanced Animations',
    description: 'Smooth animations and transitions',
    category: 'ui',
    state: 'enabled',
    minHardwareScore: 50,
    userOverridable: true,
    experimental: false,
    tags: ['ui', 'animations'],
    dependencies: [],
    performanceImpact: 30,
  },
  {
    id: 'ai.local_processing',
    name: 'Local AI Processing',
    description: 'Run AI models locally',
    category: 'ai',
    state: 'enabled',
    minHardwareScore: 70,
    userOverridable: true,
    experimental: true,
    tags: ['ai', 'local'],
    dependencies: [],
    performanceImpact: 80,
    minRAM: 16,
    minCores: 8,
    requiresGPU: true,
  },
]);

// Create manager
const manager = new FeatureFlagManager(registry, {
  debug: true,
  persistPreferences: true,
  trackMetrics: true,
});

// Initialize
await manager.initialize();

// Check if feature is enabled
if (manager.isEnabled('advanced.animations')) {
  // Enable animations
}

// Get hardware capabilities
const hardware = manager.getHardwareCapabilities();
console.log(`Hardware score: ${hardware.score}/100`);
console.log(`Profile: ${hardware.profile}`);
```

#### React Integration

```tsx
import {
  FeatureFlagsProvider,
  useFeatureFlag,
  useHardwareCapabilities,
} from '@superinstance/hardware-aware-flagging/react';

// Wrap your app
function App() {
  return (
    <FeatureFlagsProvider config={{ debug: true }}>
      <MyComponent />
    </FeatureFlagsProvider>
  );
}

// Use feature flags in components
function MyComponent() {
  const hasAnimations = useFeatureFlag('advanced.animations');
  const hardware = useHardwareCapabilities();

  return (
    <div>
      <p>Hardware Score: {hardware?.score}/100 ({hardware?.profile})</p>
      {hasAnimations ? (
        <AnimatedComponent />
      ) : (
        <BasicComponent />
      )}
    </div>
  );
}
```

## 📖 Documentation

### Core Concepts

#### Hardware Score

The system detects hardware capabilities and calculates a score from 0-100:

| Score | Profile | Description |
|-------|---------|-------------|
| 0-20 | minimal | Low-end devices, limited features |
| 21-40 | basic | Entry-level devices |
| 41-60 | standard | Mid-range devices |
| 61-80 | advanced | High-end devices |
| 81-100 | premium | Workstations, all features |

#### Feature Evaluation

Features are evaluated based on:

1. **User Overrides** - Manual enable/disable (highest priority)
2. **Experimental Status** - Requires opt-in for experimental features
3. **Hardware Score** - Minimum score required
4. **Specific Requirements** - RAM, CPU cores, GPU, network
5. **Dependencies** - Required features must be enabled
6. **Rollout Percentage** - Gradual rollout support

#### Feature States

- `enabled` - Feature is active
- `disabled` - Feature is inactive
- `forced` - User manually enabled (override)
- `blocked` - User manually disabled (override)

### API Reference

#### FeatureFlag

```typescript
interface FeatureFlag {
  id: string;                      // Unique identifier
  name: string;                    // Display name
  description: string;             // What the feature does
  category: FeatureCategory;       // ai, ui, knowledge, media, advanced
  state: FeatureState;             // enabled, disabled, forced, blocked
  minHardwareScore: number;        // 0-100
  userOverridable: boolean;        // Can users override?
  experimental: boolean;           // Is it experimental?
  tags: string[];                  // For filtering/searching
  dependencies: string[];          // Required features
  performanceImpact: number;       // 0-100
  minRAM?: number;                 // Minimum RAM in GB
  minCores?: number;               // Minimum CPU cores
  requiresGPU?: boolean;           // GPU required?
  minNetworkSpeed?: number;        // Minimum network in Mbps
  rolloutPercentage?: number;      // Gradual rollout (0-100)
}
```

#### FeatureFlagManager

```typescript
class FeatureFlagManager {
  // Initialize the system
  async initialize(): Promise<void>;

  // Check if feature is enabled
  isEnabled(featureId: string): boolean;

  // Get detailed evaluation result
  evaluate(featureId: string): EvaluationResult;

  // Get all enabled/disabled features
  getEnabledFeatures(): string[];
  getDisabledFeatures(): string[];

  // User controls
  enable(featureId: string): void;
  disable(featureId: string): void;
  reset(featureId: string): void;

  // Get hardware capabilities
  getHardwareCapabilities(): HardwareCapabilities;

  // User preferences
  getUserPreferences(): UserPreferences;
  updateUserPreferences(updates: Partial<UserPreferences>): void;

  // Metrics and monitoring
  getMetrics(featureId: string): FeatureMetrics | undefined;
  resetMetrics(): void;

  // Event listeners
  addEventListener(type: FlagEventType, listener: FlagEventListener): void;
  removeEventListener(type: FlagEventType, listener: FlagEventListener): void;

  // State management
  exportState(): string;
  importState(state: string): void;
}
```

### React Hooks

#### `useFeatureFlag(featureId: string)`

Check if a feature is enabled.

```tsx
function StreamingChat() {
  const hasStreaming = useFeatureFlag('ai.streaming_responses');
  return hasStreaming ? <Streaming /> : <Basic />;
}
```

#### `useFeatureFlagResult(featureId: string)`

Get detailed evaluation result with reasoning.

```tsx
function FeatureStatus({ featureId }: { featureId: string }) {
  const result = useFeatureFlagResult(featureId);

  if (!result?.enabled) {
    return <div>Not available: {result.reason}</div>;
  }

  return <div>Enabled! Score: {result.hardwareScore}/100</div>;
}
```

#### `useHardwareCapabilities()`

Get detected hardware information.

```tsx
function HardwareInfo() {
  const hardware = useHardwareCapabilities();

  if (!hardware) return <div>Detecting...</div>;

  return (
    <div>
      <p>Score: {hardware.score}/100</p>
      <p>Profile: {hardware.profile}</p>
      <p>RAM: {hardware.ram} GB</p>
      <p>CPU: {hardware.cores} cores</p>
      <p>GPU: {hardware.hasGPU ? 'Yes' : 'No'}</p>
    </div>
  );
}
```

#### `useFeatureFlagControl(featureId: string)`

Control a feature flag (enable/disable/reset).

```tsx
function FeatureToggle({ featureId }: { featureId: string }) {
  const { enabled, enable, disable, reset } = useFeatureFlagControl(featureId);

  return (
    <div>
      <button onClick={enable}>Enable</button>
      <button onClick={disable}>Disable</button>
      <button onClick={reset}>Auto</button>
      <span>Status: {enabled ? 'ON' : 'OFF'}</span>
    </div>
  );
}
```

## 🎯 Use Cases

### 1. Progressive Web App

```tsx
function PWA() {
  const hasOfflineMode = useFeatureFlag('advanced.offline_mode');
  const hasBackgroundSync = useFeatureFlag('advanced.background_sync');

  return (
    <div>
      {hasOfflineMode && <OfflineSupport />}
      {hasBackgroundSync && <BackgroundSync />}
    </div>
  );
}
```

### 2. AI-Powered Application

```tsx
function AIChat() {
  const hasLocalModels = useFeatureFlag('ai.local_models');
  const hasStreaming = useFeatureFlag('ai.streaming_responses');
  const hasMultimodal = useFeatureFlag('ai.multimodal');

  return (
    <ChatInterface
      useLocalModels={hasLocalModels}
      enableStreaming={hasStreaming}
      supportsMultimodal={hasMultimodal}
    />
  );
}
```

### 3. Media Processing

```tsx
function MediaProcessor() {
  const hasImageAnalysis = useFeatureFlag('media.image_analysis');
  const hasVideoProcessing = useFeatureFlag('media.video_processing');

  return (
    <div>
      {hasImageAnalysis && <ImageAnalyzer />}
      {hasVideoProcessing && <VideoProcessor />}
    </div>
  );
}
```

## 🔧 Configuration

```typescript
import { DEFAULT_CONFIG } from '@superinstance/hardware-aware-flagging';

const config = {
  ...DEFAULT_CONFIG,
  debug: true,                      // Enable debug logging
  persistPreferences: true,         // Save to localStorage
  trackMetrics: true,               // Track usage metrics
  storageKey: 'myapp-flags',        // localStorage key
  autoPerformanceGate: true,        // Auto-disable on perf issues
  performanceThreshold: 1000,       // Perf threshold in ms
};
```

## 🧪 Testing

```typescript
import {
  FeatureFlagRegistry,
  FeatureFlagManager,
  resetGlobalRegistry,
} from '@superinstance/hardware-aware-flagging';

describe('Feature Flags', () => {
  let registry: FeatureFlagRegistry;
  let manager: FeatureFlagManager;

  beforeEach(async () => {
    resetGlobalRegistry();
    registry = new FeatureFlagRegistry([/* features */]);
    manager = new FeatureFlagManager(registry, {
      persistPreferences: false,
      trackMetrics: false,
    });
    await manager.initialize();
  });

  test('feature is enabled when hardware score is sufficient', () => {
    expect(manager.isEnabled('my.feature')).toBe(true);
  });
});
```

## 📊 Examples

See the `examples/` directory for complete working examples:

- [Basic Usage](./examples/basic-usage.ts) - Simple feature flagging
- [React App](./examples/react-app.tsx) - React integration
- [A/B Testing](./examples/ab-testing.ts) - Experimentation
- [Performance Gating](./examples/performance-gating.ts) - Auto-performance gating

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📄 License

MIT © [SuperInstance](https://github.com/SuperInstance)

## 🙏 Acknowledgments

Built with inspiration from:
- [LaunchDarkly](https://launchdarkly.com/) - Feature flagging best practices
- [Progressive Enhancement](https://www.smashingmagazine.com/2009/04/progressive-enhancement-what-it-is-and-how-to-use-it/) - Web design philosophy
- [Graceful Degradation](https://en.wikipedia.org/wiki/Graceful_degradation) - Fault tolerance pattern

## 🔗 Related Packages

- [@superinstance/hardware-capability-profiler](https://github.com/SuperInstance/hardware-capability-profiler) - Hardware detection library
- [@superinstance/privacy-first-analytics](https://github.com/SuperInstance/Privacy-First-Analytics) - Privacy-focused analytics

---

Made with ❤️ by the SuperInstance team
