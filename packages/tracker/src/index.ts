/**
 * @unisig/tracker - Tracker for unisig
 *
 * Adds targeted reactivity to signals.
 * Depends on @unisig for types.
 *
 * @packageDocumentation
 */

// Tracker
export {createTrackerFactory} from './Tracker.js';
export type {TrackerFactoryOptions, Tracker} from './Tracker.js';

export {ReactivityAdapter, Dependency} from './types.js';
