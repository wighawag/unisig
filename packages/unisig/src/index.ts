// Types
export type {Dependency, ReactivityAdapter} from './types';
export {createReactivityAdapter} from './types';

// Errors
export {NoAdapterError} from './runes';

// Emitter
export {Emitter} from './Emitter';
export type {Listener, Unsubscribe} from './Emitter';

// Scope
export {Scope} from './Scope';

// Reactive (main export)
export {Reactive, reactive} from './Reactive';

// Standalone reactive state (rune-like API)
export {
	state,
	ref,
	setDefaultAdapter,
	getDefaultAdapter,
	isRef,
} from './runes';
export type {Ref, UnwrapRef} from './runes';