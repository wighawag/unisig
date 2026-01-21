// Types
export type {Dependency, ReactivityAdapter, Listener, ErrorHandler, EventMap} from './types.js';
export {createReactivityAdapter} from './types.js';

// Errors
export {NoAdapterError} from './standalone.js';

// Emitter
export {Emitter} from './Emitter.js';
export type {Unsubscribe, EmitterOptions} from './Emitter.js';

// Scope
export {Scope} from './Scope.js';

// Tracker
export {Tracker, tracker, createTracker} from './Tracker.js';
export type {TrackerOptions} from './Tracker.js';

// Multi-Adapter (support multiple signal runtimes)
export {MultiAdapter, CompositeDependency, createMultiAdapter} from './MultiAdapter.js';

// Standalone reactive state (rune-like API)
export {withAdapter, withAdapterRef, isRef} from './standalone.js';
export type {Ref, UnwrapRef} from './standalone.js';
