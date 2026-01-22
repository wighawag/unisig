/**
 * @unisig/svelte - Svelte 5 adapter for unisig
 *
 * Provides the ReactivityAdapter for Svelte 5's reactivity system.
 *
 * This adapter is derived from @signaldb/svelte by Max Nowack.
 * Original work: https://github.com/maxnowack/signaldb
 * License: MIT
 *
 * @packageDocumentation
 */

import {createSubscriber} from 'svelte/reactivity';
import type {Signal, ReactiveResult} from 'unisig';
import type {ReactivityAdapter} from '@unisig/scope';

/**
 * Check if a value is a primitive (not an object or function).
 */
function isPrimitive(value: unknown): boolean {
	return value === null || (typeof value !== 'object' && typeof value !== 'function');
}

/**
 * Wrapper class that uses $state as a class field to create deep reactivity.
 *
 * This is necessary because $state can only be used in specific contexts:
 * - As a variable declaration initializer
 * - As a class field declaration (which is what we use here)
 * - As the first assignment to a class field at the top level of a constructor
 *
 * By using it as a class field, we can wrap any value and make it deeply reactive.
 */
class ReactiveStateWrapper<T> {
	value = $state<T>();

	constructor(initial: T) {
		this.value = initial;
	}
}

/**
 * Wrapper class that uses $state.raw for shallow reactivity.
 *
 * Unlike ReactiveStateWrapper which uses $state (deep reactivity),
 * this uses $state.raw which only tracks the reference itself,
 * not nested properties. Perfect for signals where you only care
 * about the value changing, not nested object mutations.
 */
class ReactiveSignalWrapper<T> {
	value = $state.raw<T>();

	constructor(initial: T) {
		this.value = initial;
	}
}

/**
 * Svelte dependency implementation using createSubscriber.
 *
 * Uses Svelte's createSubscriber API to create a subscription-based
 * dependency that integrates with $effect and other reactive primitives.
 */
export class SvelteDependency {
	#subscribe: () => void;
	#update: (() => void) | undefined;
	#onDisposeCallbacks: (() => void)[];

	constructor() {
		this.#onDisposeCallbacks = [];

		this.#subscribe = createSubscriber((update) => {
			this.#update = update;
			return () => this.dispose();
		});
	}

	/**
	 * Register this as a dependency of the current reactive scope.
	 * Called during read operations.
	 */
	depend(): void {
		this.#subscribe();
	}

	/**
	 * Notify all subscribers that this dependency has changed.
	 * Called during write operations.
	 */
	notify(): void {
		// The #update can potentially be undefined because it only becomes
		// available after #subscribe is called for the first time within a scope.
		this.#update?.();
	}

	/**
	 * Register a cleanup callback to be called when the scope is disposed.
	 * @param callback - Function to call on dispose
	 */
	onDispose(callback: () => void): void {
		this.#onDisposeCallbacks.push(callback);
	}

	/**
	 * Dispose this dependency and call all registered cleanup callbacks.
	 */
	dispose(): void {
		this.#onDisposeCallbacks.forEach((callback) => callback());
	}
}

/**
 * Svelte 5 reactivity adapter for unisig.
 *
 * Provides full integration with Svelte's reactive system:
 * - Uses `reactive()` for deep reactive state
 * - Uses `createSubscriber` for dependency tracking
 * - Uses `$effect.tracking()` to detect reactive scope
 * - Supports cleanup via `onDispose`
 * - Provides `effect()` for framework-agnostic effects
 *
 * @example
 * ```ts
 * import { svelteAdapter } from '@unisig/svelte';
 * import { unisig } from 'unisig';
 * import { Tracker } from '@unisig/tracker';
 *
 * const { state, signal, effect } = unisig(svelteAdapter);
 * const tracker = new Tracker({ adapter: svelteAdapter });
 * ```
 */
export const svelteAdapter: ReactivityAdapter = {
	// ============ BasicReactivityAdapter methods ============

	/**
	 * Create a reactive effect that re-runs when tracked dependencies change.
	 *
	 * Uses $effect.root to create a disposable scope, then $effect inside
	 * for the actual reactive tracking. This enables effects to work
	 * outside of component context (e.g., in plain .ts files).
	 *
	 * @param fn - Effect function, may return a cleanup function
	 * @returns Cleanup function to stop the effect
	 *
	 * @example
	 * ```ts
	 * // setup.svelte.ts
	 * import { unisig } from 'unisig';
	 * import { svelteAdapter } from '@unisig/svelte';
	 *
	 * export const { effect } = unisig(svelteAdapter);
	 *
	 * // myStore.ts (plain TypeScript)
	 * import { effect } from './setup.svelte';
	 *
	 * const cleanup = effect(() => {
	 *   console.log('Data changed:', store.getData());
	 *   return () => console.log('Cleanup');
	 * });
	 * ```
	 */
	effect: (fn: () => void | (() => void)) => {
		let userCleanup: (() => void) | undefined;
		let destroyed = false;

		// $effect.root creates a scope we can dispose of
		const rootCleanup = $effect.root(() => {
			$effect(() => {
				if (destroyed) return;

				// Call previous user cleanup before re-running
				userCleanup?.();

				// Run the effect and capture any returned cleanup
				const result = fn();
				userCleanup = typeof result === 'function' ? result : undefined;
			});
		});

		// Return cleanup that stops everything
		return () => {
			destroyed = true;
			userCleanup?.();
			rootCleanup();
		};
	},

	/**
	 * Create a deep reactive state using Svelte's $state.
	 *
	 * - For objects: Returns the object directly with deep reactivity
	 * - For primitives: Returns { value: T } wrapper (boxed value)
	 *
	 * Uses ReactiveStateWrapper to circumvent the restriction that $state can
	 * only be used as a class field declaration.
	 *
	 * @param initial - Initial value
	 * @returns For objects: T (deep reactive). For primitives: { value: T }
	 *
	 * @example
	 * ```ts
	 * const { reactive } = unisig(svelteAdapter);
	 *
	 * // Objects - direct property access
	 * const user = reactive({ name: 'Alice', age: 30 });
	 * user.name = 'Bob';  // Triggers reactivity
	 *
	 * // Primitives - use .value
	 * const count = reactive(5);
	 * count.value = 10;   // Triggers reactivity
	 * ```
	 */
	reactive<T>(initial: T): ReactiveResult<T> {
		if (isPrimitive(initial)) {
			// For primitives, return the wrapper instance (which has { value: T } shape)
			return new ReactiveStateWrapper<T>(initial) as ReactiveResult<T>;
		}
		// For objects, return the reactive value directly
		return new ReactiveStateWrapper<T>(initial).value as ReactiveResult<T>;
	},

	/**
	 * Create a shallow reactive signal with get/set interface.
	 *
	 * Wraps Svelte's $state via ReactiveStateWrapper in a get/set interface
	 * for consistency across different signal runtimes.
	 *
	 * @param initial - Initial value
	 * @returns Signal with get/set methods
	 *
	 * @example
	 * ```ts
	 * const { signal } = unisig(svelteAdapter);
	 *
	 * const count = signal(0);
	 * console.log(count.get());  // 0
	 * count.set(1);              // Triggers reactivity
	 * ```
	 */
	signal<T>(initial: T): Signal<T> {
		// Use $state.raw for shallow reactivity (more performant for signals)
		const s = new ReactiveSignalWrapper(initial);
		return {
			get: () => s.value as T,
			set: (v: T) => {
				s.value = v as T;
			},
		};
	},

	// ============ ReactivityAdapter methods (for Scope/Tracker) ============

	/**
	 * Create a new dependency tracker using SvelteDependency.
	 */
	create: () => new SvelteDependency(),

	/**
	 * Check if currently inside a reactive scope ($effect, etc.)
	 */
	isInScope: () => $effect.tracking(),

	/**
	 * Register a cleanup callback for when the reactive scope ends.
	 */
	onDispose(callback: () => void, svelteDependency: SvelteDependency) {
		svelteDependency.onDispose(callback);
	},
};

// Default export is the adapter for simple imports
export default svelteAdapter;
