/**
 * @unisig/tracker - Tracker for unisig
 *
 * Adds granular reactivity and event emission to signals.
 * Depends on the core `unisig` package for types.
 *
 * @packageDocumentation
 */

// Emitter
export {Emitter} from './Emitter.js';
export type {Unsubscribe, EmitterOptions} from './Emitter.js';

// Tracker
export {Tracker, createTracker, createTrackerFactory} from './Tracker.js';
export type {TrackerOptions, TrackerFactoryOptions} from './Tracker.js';

// Multi-Adapter (support multiple signal runtimes)
export {
	MultiAdapter,
	CompositeDependency,
	createMultiAdapter,
} from './MultiAdapter.js';

// Scope is imported from 'unisig' package
export {Scope} from 'unisig';