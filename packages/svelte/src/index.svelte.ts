/**
 * @unisig/svelte - Svelte 5 adapter for unisig
 *
 * Provides reactive state management using Svelte 5's reactivity system.
 * Includes support for framework-agnostic effects.
 *
 * This adapter is derived from @signaldb/svelte by Max Nowack.
 * Original work: https://github.com/maxnowack/signaldb
 * License: MIT
 *
 * @packageDocumentation
 */

import {createSubscriber} from 'svelte/reactivity';
import {createAdapterBundle, createReactivityAdapter, type ReactivityAdapter} from 'unisig';

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
 * - Uses `createSubscriber` for dependency tracking
 * - Uses `$effect.tracking()` to detect reactive scope
 * - Supports cleanup via `onDispose`
 * - Provides `effect()` for framework-agnostic effects
 *
 * @example
 * ```ts
 * import { svelteAdapter } from '@unisig/svelte';
 * import { Tracker } from 'unisig';
 *
 * const tracker = new Tracker(svelteAdapter);
 * ```
 */
export const svelteAdapter: ReactivityAdapter = createReactivityAdapter({
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
	onDispose(callback, svelteDependency: SvelteDependency) {
		svelteDependency.onDispose(callback);
	},

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
	 * // In a .svelte.ts file
	 * import { effect } from '@unisig/svelte';
	 * export { effect };
	 *
	 * // In a plain .ts file
	 * import { effect } from './setup.svelte';
	 *
	 * const cleanup = effect(() => {
	 *   console.log('Data changed:', store.getData());
	 *   return () => console.log('Cleanup');
	 * });
	 *
	 * // Later
	 * cleanup();
	 * ```
	 */
	effect: (fn) => {
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
});

/**
 * Pre-configured adapter bundle for Svelte.
 *
 * Provides all the utilities you need for reactive state management:
 * - `createTracker`: Create a new Tracker instance
 * - `effect`: Create framework-agnostic effects
 * - `state`: Create reactive state objects
 * - `ref`: Create reactive single-value references
 * - `adapter`: The underlying Svelte adapter
 *
 * @example
 * ```ts
 * // In a .svelte.ts setup file
 * import { svelteBundle } from '@unisig/svelte';
 * export const { createTracker, effect, state, ref } = svelteBundle;
 *
 * // In any .ts file
 * import { effect, createTracker } from './setup.svelte';
 *
 * const tracker = createTracker();
 * const cleanup = effect(() => {
 *   tracker.track('data');
 *   console.log('Data changed');
 * });
 * ```
 */
export const svelteBundle = createAdapterBundle(svelteAdapter);

/**
 * Create a new Tracker instance configured with the Svelte adapter.
 * @see Tracker
 */
export const createTracker = svelteBundle.createTracker;

/**
 * Create a reactive effect that re-runs when tracked dependencies change.
 *
 * **Important:** This must be imported from a `.svelte.ts` file to work,
 * as it uses Svelte's $effect rune under the hood.
 *
 * @example
 * ```ts
 * // setup.svelte.ts
 * export { effect } from '@unisig/svelte';
 *
 * // store.ts (plain TypeScript)
 * import { effect } from './setup.svelte';
 *
 * const cleanup = effect(() => {
 *   console.log('Something changed');
 * });
 * ```
 */
export const effect = svelteBundle.effect;

/**
 * Create a reactive state object (deep proxy).
 * @see withAdapter
 */
export const state = svelteBundle.state;

/**
 * Create a reactive reference (single value wrapper).
 * @see withAdapterRef
 */
export const ref = svelteBundle.ref;

/**
 * The underlying Svelte adapter instance.
 */
export const adapter = svelteBundle.adapter;

// Default export is the adapter for simple imports
export default svelteAdapter;