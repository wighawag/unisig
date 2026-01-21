/**
 * Svelte 5 adapter for unisig.
 * Uses the @signaldb/svelte adapter as base, with added effect support.
 */
import svelteReactivityAdapter from '@signaldb/svelte';
import {createAdapterBundle, type ReactivityAdapter} from 'unisig';

/**
 * Svelte adapter with effect support.
 *
 * The base adapter from @signaldb/svelte provides:
 * - create(): Creates dependencies using createSubscriber
 * - isInScope(): Returns $effect.tracking()
 * - onDispose(): Registers cleanup callbacks
 *
 * We extend it with effect() to enable framework-agnostic effects.
 */
export const svelteAdapter: ReactivityAdapter = {
	...svelteReactivityAdapter,

	/**
	 * Create a reactive effect that re-runs when tracked dependencies change.
	 *
	 * Uses $effect.root to create a cleanup-able scope, then $effect inside
	 * for the actual reactive tracking.
	 *
	 * @param fn - Effect function, may return a cleanup function
	 * @returns Cleanup function to stop the effect
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
};

/**
 * Pre-configured adapter bundle for Svelte.
 *
 * Use this to get createTracker, effect, state, and ref functions
 * that are all configured with the Svelte adapter.
 *
 * @example
 * ```ts
 * // In a .svelte.ts file (setup file)
 * import { svelteBundle } from './svelteAdapter.svelte';
 * export const { createTracker, effect, state, ref } = svelteBundle;
 * ```
 *
 * @example
 * ```ts
 * // In a regular .ts file (your classes/stores)
 * import { effect, createTracker } from './setup.svelte';
 *
 * export class GameObject {
 *   private cleanup: () => void;
 *
 *   constructor() {
 *     this.cleanup = effect(() => {
 *       // This effect works in plain .ts files!
 *       const data = myStore.getData();
 *       console.log('Data changed:', data);
 *     });
 *   }
 *
 *   destroy() {
 *     this.cleanup();
 *   }
 * }
 * ```
 */
export const svelteBundle = createAdapterBundle(svelteAdapter);

/**
 * Convenience exports from the bundle.
 * These can be re-exported from a setup file for use throughout the app.
 */
export const {createTracker, effect, state, ref} = svelteBundle;
