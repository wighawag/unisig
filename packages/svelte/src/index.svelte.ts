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
 * import { Tracker } from '@unisig/tracker';
 * import { createReactivityBundle } from 'unisig';
 *
 * const bundle = createReactivityBundle(svelteAdapter);
 * const tracker = new Tracker({ adapter: svelteAdapter });
 * const { effect } = bundle;
 * ```
 */
export const svelteAdapter = {
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
	 * import { createReactivityBundle } from 'unisig';
	 * import { svelteAdapter } from '@unisig/svelte';
	 *
	 * export const { effect } = createReactivityBundle(svelteAdapter);
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
};

// Default export is the adapter for simple imports
export default svelteAdapter;