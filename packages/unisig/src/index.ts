// Types
export type {
	Dependency,
	ReactivityAdapter,
	Listener,
	ErrorHandler,
	EventMap,
} from './types.js';
export {createReactivityAdapter} from './types.js';

// Scope - granular dependency tracking with proxies
export {Scope} from './Scope.js';

// Standalone reactive state (rune-like API)
export {withAdapter, withAdapterRef, isRef, NoAdapterError} from './standalone.js';
export type {Ref, UnwrapRef} from './standalone.js';

// Reactivity Bundle (effect, ref in one bundle)
export {
	createReactivityBundle,
	NoEffectSupportError,
} from './bundle.js';
export type {ReactivityBundle, EffectFn, RefFn} from './bundle.js';