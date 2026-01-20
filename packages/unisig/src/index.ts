// Types
export type {Dependency, ReactivityAdapter} from './types';
export {createReactivityAdapter} from './types';

// Errors
export {NoAdapterError} from './standalone';

// Emitter
export {Emitter} from './Emitter';
export type {Listener, Unsubscribe, EmitterOptions} from './Emitter';

// Scope
export {Scope} from './Scope';

// Tracker (main export)
export {Tracker, tracker} from './Tracker';
export type {TrackerOptions} from './Tracker';

// Standalone reactive state (rune-like API)
export {
	withAdapter,
	withAdapterRef,
	isRef,
} from './standalone';
export type {Ref, UnwrapRef} from './standalone';