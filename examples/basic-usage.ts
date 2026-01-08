/**
 * Basic Usage Example
 *
 * Demonstrates basic feature flagging without React
 */

import {
  FeatureFlagRegistry,
  FeatureFlagManager,
} from '../src/index.js';

async function main() {
  // Define some features
  const features = [
    {
      id: 'ui.animations',
      name: 'UI Animations',
      description: 'Smooth animations and transitions',
      category: 'ui' as const,
      state: 'enabled' as const,
      minHardwareScore: 40,
      userOverridable: true,
      experimental: false,
      tags: ['ui', 'animations'],
      dependencies: [],
      performanceImpact: 20,
    },
    {
      id: 'ai.local_models',
      name: 'Local AI Models',
      description: 'Run AI models locally',
      category: 'ai' as const,
      state: 'enabled' as const,
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
    {
      id: 'advanced.offline_mode',
      name: 'Offline Mode',
      description: 'Work offline with local data',
      category: 'advanced' as const,
      state: 'enabled' as const,
      minHardwareScore: 20,
      userOverridable: true,
      experimental: false,
      tags: ['advanced', 'offline'],
      dependencies: [],
      performanceImpact: 0,
    },
  ];

  // Create registry
  const registry = new FeatureFlagRegistry(features);

  // Create manager with debug mode
  const manager = new FeatureFlagManager(registry, {
    debug: true,
    persistPreferences: true,
    trackMetrics: true,
  });

  // Initialize
  console.log('Initializing feature flags...');
  await manager.initialize();

  // Get hardware capabilities
  const hardware = manager.getHardwareCapabilities();
  console.log('\n=== Hardware Capabilities ===');
  console.log(`Score: ${hardware.score}/100`);
  console.log(`Profile: ${hardware.profile}`);
  console.log(`RAM: ${hardware.ram} GB`);
  console.log(`CPU: ${hardware.cores} cores`);
  console.log(`GPU: ${hardware.hasGPU ? 'Yes' : 'No'}`);
  console.log(`Network: ${hardware.networkSpeed} Mbps`);
  console.log(`Device: ${hardware.deviceType}`);
  console.log(`Browser: ${hardware.browser.name} ${hardware.browser.version}`);

  // Check feature flags
  console.log('\n=== Feature Flags ===');
  features.forEach(feature => {
    const enabled = manager.isEnabled(feature.id);
    const result = manager.evaluate(feature.id);
    console.log(`\n${feature.name}:`);
    console.log(`  Status: ${enabled ? '✓ ENABLED' : '✗ DISABLED'}`);
    console.log(`  Reason: ${result.reason}`);
  });

  // Enable a feature manually
  console.log('\n=== Manual Override ===');
  manager.enable('ui.animations');
  console.log('Manually enabled ui.animations');

  // Get all enabled features
  const enabled = manager.getEnabledFeatures();
  console.log(`\nEnabled features (${enabled.length}):`, enabled.join(', '));

  // Get metrics
  console.log('\n=== Metrics ===');
  features.forEach(feature => {
    const metrics = manager.getMetrics(feature.id);
    if (metrics) {
      console.log(`\n${feature.name}:`);
      console.log(`  Evaluations: ${metrics.evaluations}`);
      console.log(`  Enabled: ${metrics.enabledCount}`);
      console.log(`  Disabled: ${metrics.disabledCount}`);
      console.log(`  Avg eval time: ${metrics.avgEvaluationTime.toFixed(2)}ms`);
    }
  });

  // Export state
  console.log('\n=== Export State ===');
  const state = manager.exportState();
  console.log(state.substring(0, 200) + '...');
}

main().catch(console.error);
