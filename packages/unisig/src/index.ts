// Types
export type {Dependency, ReactivityAdapter} from './types';
export {createReactivityAdapter} from './types';

// Errors
export {NoAdapterError} from './standalone';

// Emitter
export {Emitter} from './Emitter';
export type {Listener, Unsubscribe} from './Emitter';

// Scope
export {Scope} from './Scope';

// Reactive (main export)
export {Reactive, reactive} from './Reactive';

// Standalone reactive state (rune-like API)
export {
	withAdapter,
	withAdapterRef,
	isRef,
} from './standalone';
export type {Ref, UnwrapRef} from './standalone';