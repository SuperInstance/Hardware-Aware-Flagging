/**
 * Hardware Detection Utility
 *
 * Detects hardware capabilities including CPU, RAM, GPU, network, and storage.
 * Calculates a hardware score (0-100) for feature gating.
 */

import type { HardwareCapabilities, HardwareProfile, HardwareScore } from '../types/index.js';

/**
 * Calculate hardware profile from score
 */
export function calculateProfile(score: HardwareScore): HardwareProfile {
  if (score <= 20) return 'minimal';
  if (score <= 40) return 'basic';
  if (score <= 60) return 'standard';
  if (score <= 80) return 'advanced';
  return 'premium';
}

/**
 * Detect hardware capabilities
 */
export async function detectHardware(): Promise<HardwareCapabilities> {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    // Return minimal capabilities for server-side
    return {
      score: 50,
      profile: 'standard',
      ram: 8,
      cores: 4,
      hasGPU: false,
      networkSpeed: 100,
      storage: 100,
      deviceType: 'desktop',
      browser: { name: 'Unknown', version: '0.0.0' },
      platform: { os: 'unknown', arch: 'unknown' },
    };
  }

  // Get navigator info
  const cores = navigator.hardwareConcurrency || 2;
  const deviceMemory = (navigator as any).deviceMemory || 4; // in GB

  // Estimate RAM (heuristic)
  const ram = deviceMemory;

  // Detect GPU
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
  const hasGPU = !!gl;
  let gpuInfo;
  if (hasGPU && gl) {
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const vendor = gl.getParameter((debugInfo as any).UNMASKED_VENDOR_WEBGL);
      const renderer = gl.getParameter((debugInfo as any).UNMASKED_RENDERER_WEBGL);
      gpuInfo = {
        vendor,
        model: renderer,
        memory: 0, // Can't detect easily, default to 0
      };
    }
  }

  // Estimate network speed (using connection API if available)
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  const networkSpeed = connection?.downlink || 10; // Default to 10 Mbps

  // Estimate storage
  let storage = 100; // Default to 100 GB
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      storage = (estimate.quota || 0) / (1024 * 1024 * 1024); // Convert to GB
    } catch (e) {
      // Storage estimation not available
    }
  }

  // Device type detection
  const userAgent = navigator.userAgent;
  let deviceType: 'desktop' | 'laptop' | 'tablet' | 'mobile' = 'desktop';
  if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
    deviceType = 'tablet';
  } else if (/mobile|android|iphone|ipod/i.test(userAgent)) {
    deviceType = 'mobile';
  } else if (/ laptop /i.test(userAgent)) {
    deviceType = 'laptop';
  }

  // Browser info
  const browser = {
    name: 'Unknown',
    version: 'Unknown',
  };
  if (userAgent.includes('Chrome')) {
    browser.name = 'Chrome';
    const match = userAgent.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/);
    if (match) browser.version = match[1];
  } else if (userAgent.includes('Firefox')) {
    browser.name = 'Firefox';
    const match = userAgent.match(/Firefox\/(\d+\.\d+)/);
    if (match) browser.version = match[1];
  } else if (userAgent.includes('Safari')) {
    browser.name = 'Safari';
    const match = userAgent.match(/Version\/(\d+\.\d+)/);
    if (match) browser.version = match[1];
  }

  // Platform info
  const platform = {
    os: navigator.platform,
    arch: navigator.userAgent.includes('x86_64') || navigator.userAgent.includes('x64')
      ? 'x64'
      : navigator.userAgent.includes('arm')
        ? 'arm'
        : 'unknown',
  };

  // Calculate overall hardware score (0-100)
  // Score is based on multiple factors
  let score = 0;

  // RAM contribution (0-30 points)
  score += Math.min(ram / 16 * 30, 30);

  // CPU cores contribution (0-20 points)
  score += Math.min(cores / 16 * 20, 20);

  // GPU contribution (0-20 points)
  if (hasGPU) score += 20;

  // Network contribution (0-15 points)
  score += Math.min(networkSpeed / 100 * 15, 15);

  // Storage contribution (0-15 points)
  score += Math.min(storage / 1000 * 15, 15);

  score = Math.min(Math.round(score), 100);

  const profile = calculateProfile(score);

  return {
    score,
    profile,
    ram,
    cores,
    hasGPU,
    gpuInfo,
    networkSpeed,
    storage,
    deviceType,
    browser,
    platform,
  };
}
