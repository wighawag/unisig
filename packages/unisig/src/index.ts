// Types
export type {
	Dependency,
	ReactivityAdapter,
	Listener,
	ErrorHandler,
	EventMap,
} from './types.js';
export {createReactivityAdapter} from './types.js';

// Emitter
export {Emitter} from './Emitter.js';
export type {Unsubscribe, EmitterOptions} from './Emitter.js';

// Scope
export {Scope} from './Scope.js';

// Tracker
export {Tracker, createTracker, createTrackerFactory} from './Tracker.js';
export type {TrackerOptions, TrackerFactoryOptions} from './Tracker.js';

// Multi-Adapter (support multiple signal runtimes)
export {
	MultiAdapter,
	CompositeDependency,
	createMultiAdapter,
} from './MultiAdapter.js';

// Standalone reactive state (rune-like API)
export {withAdapter, withAdapterRef, isRef, NoAdapterError} from './standalone.js';
export type {Ref, UnwrapRef} from './standalone.js';

// Adapter Bundle (createTracker, effect, state, ref in one bundle)
export {createAdapterBundle, NoEffectSupportError} from './bundle.js';
export type {
	AdapterBundle,
	EffectFn,
	StateFn,
	RefFn,
	CreateTrackerFn,
} from './bundle.js';
