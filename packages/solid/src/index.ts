import {ReactivityAdapter} from '@unisig/scope';
import type {StateResult} from 'unisig';
import {createSignal, getOwner, onCleanup, createRoot, createEffect} from 'solid-js';
import {createMutable} from 'solid-js/store';

/**
 * Check if a value is a primitive (not an object or function).
 */
function isPrimitive(value: unknown): boolean {
	return value === null || (typeof value !== 'object' && typeof value !== 'function');
}

const solidReactivityAdapter: ReactivityAdapter = {
	effect: (fn: () => void | (() => void)) => {
		return createRoot((dispose) => {
			createEffect(() => {
				const cleanup = fn();
				if (typeof cleanup === 'function') {
					onCleanup(cleanup);
				}
			});
			return dispose;
		});
	},

	// Deep - native (requires solid-js/store package)
	// For primitives, we wrap in { value: T } using createMutable
	// For objects, we return the object directly with createMutable
	state<T>(initial: T): StateResult<T> {
		if (isPrimitive(initial)) {
			// Wrap primitives in { value: T }
			return createMutable({value: initial}) as StateResult<T>;
		}
		return createMutable(initial as object) as StateResult<T>;
	},

	// Shallow - native pattern
	signal<T>(initial: T): {get(): T; set(value: T): void} {
		const [get, set] = createSignal(initial);
		return {get, set};
	},
	create: () => {
		const [depend, rerun] = createSignal(undefined, {equals: false});
		return {
			depend: () => {
				depend();
			},
			notify: () => {
				rerun();
			},
		};
	},
	isInScope: () => !!getOwner(),
	onDispose: (callback) => {
		onCleanup(callback);
	},
};

export default solidReactivityAdapter;

// we now use the native signal functions from the adapter to get deep reactivity (createMutable for solid and $state for svelte)
