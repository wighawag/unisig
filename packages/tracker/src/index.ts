/**
 * @unisig/tracker - Tracker for unisig
 *
 * Adds granular reactivity to signals.
 * Depends on @unisig/scope for Scope and types.
 *
 * @packageDocumentation
 */

// Tracker
export {Tracker, createTracker, createTrackerFactory} from './Tracker.js';
export type {TrackerOptions, TrackerFactoryOptions} from './Tracker.js';

// Multi-Adapter (support multiple signal runtimes)
export {MultiAdapter, CompositeDependency, createMultiAdapter} from './MultiAdapter.js';

// Re-export from @unisig/scope
export {Scope} from '@unisig/scope';
export type {Dependency, ScopeAdapter, ReactivityAdapter} from '@unisig/scope';
