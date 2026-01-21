import type {ReactivityAdapter} from './types.js';

/**
 * Error thrown when trying to use effect but the adapter doesn't support it.
 */
export class NoEffectSupportError extends Error {
	constructor() {
		super(
			'Adapter does not support effects. ' +
				'Either provide an adapter with an effect() method.',
		);
		this.name = 'NoEffectSupportError';
	}
}

/**
 * Wrapper type for primitive values to enable reactivity.
 */
export interface Ref<T> {
	value: T;
}

/**
 * Type for the effect function returned by createReactivityBundle.
 */
export type EffectFn = (fn: () => void | (() => void)) => () => void;

/**
 * Type for the ref creation function.
 */
export type RefFn = <U>(initial: U) => Ref<U>;

/**
 * Bundle of utilities returned by createReactivityBundle.
 */
export interface ReactivityBundle {
	/**
	 * Create a reactive effect that re-runs when tracked dependencies change.
	 *
	 * This is the framework-agnostic way to react to state changes.
	 * Use this in plain TypeScript files (like classes, services) to
	 * respond to changes in tracked values.
	 *
	 * @param fn - The effect function. Can return a cleanup function.
	 * @returns A cleanup function to stop the effect.
	 * @throws {NoEffectSupportError} If the adapter doesn't support effects.
	 *
	 * @example
	 * ```ts
	 * const { effect } = createReactivityBundle(svelteAdapter);
	 *
	 * // In a plain TypeScript class:
	 * class GameManager {
	 *   private cleanup: () => void;
	 *
	 *   constructor() {
	 *     this.cleanup = effect(() => {
	 *       const data = userStore.getData();
	 *       this.processData(data);
	 *     });
	 *   }
	 *
	 *   destroy() {
	 *     this.cleanup();
	 *   }
	 * }
	 * ```
	 */
	effect: EffectFn;

	/**
	 * Create a reactive ref. Wraps the value in a Ref for reactivity.
	 *
	 * @param initial - Initial value for the ref
	 * @returns A Ref wrapping the value
	 *
	 * @example
	 * ```ts
	 * const count = ref(0);
	 * console.log(count.value); // 0
	 * count.value = 5;
	 *
	 * const items = ref([1, 2, 3]);
	 * items.value = [...items.value, 4];
	 * ```
	 */
	ref: RefFn;

	/**
	 * The raw adapter, for advanced use cases.
	 */
	adapter: ReactivityAdapter;
}

/**
 * Helper to check if a value is a primitive
 */
function isPrimitive(value: unknown): boolean {
	return (
		value === null ||
		value === undefined ||
		typeof value === 'number' ||
		typeof value === 'string' ||
		typeof value === 'boolean' ||
		typeof value === 'symbol' ||
		typeof value === 'bigint'
	);
}

/**
 * Validate that the value is of a supported type
 */
function validateValue(value: unknown): void {
	if (value === null || value === undefined) return;
	if (typeof value === 'object') return;
	if (isPrimitive(value)) return;
	throw new TypeError(
		`Unsupported value type: ${typeof value}. Only primitives and objects are supported.`,
	);
}

/**
 * Create a bundle of reactive utilities pre-configured with an adapter.
 *
 * This is the recommended way to use unisig in your application.
 * Call this once with your adapter, then use the returned functions
 * throughout your codebase for consistent reactivity.
 *
 * @param adapter - The reactivity adapter to use
 * @returns A ReactivityBundle with effect and ref functions
 *
 * @example
 * ```ts
 * // setup.ts (or setup.svelte.ts for Svelte)
 * import { createReactivityBundle } from 'unisig';
 * import { svelteAdapter } from '@unisig/svelte';
 *
 * export const { effect, ref } = createReactivityBundle(svelteAdapter);
 * ```
 *
 * @example
 * ```ts
 * // gameObject.ts - pure TypeScript, uses effect
 * import { effect } from './setup';
 * import { userStore } from './userStore';
 *
 * export class GameObject {
 *   private cleanup: () => void;
 *
 *   constructor(id: string) {
 *     // This effect works in plain .ts files!
 *     this.cleanup = effect(() => {
 *       const actions = userStore.getActions();
 *       this.processActions(actions);
 *     });
 *   }
 *
 *   destroy() {
 *     this.cleanup();
 *   }
 * }
 * ```
 */
export function createReactivityBundle(adapter: ReactivityAdapter): ReactivityBundle {
	// Create the effect function
	const effect: EffectFn = (fn) => {
		if (!adapter.effect) {
			throw new NoEffectSupportError();
		}
		return adapter.effect(fn);
	};

	// Create the ref function (simple wrapper for primitives)
	const ref: RefFn = <U>(initial: U): Ref<U> => {
		return {value: initial};
	};

	return {
		effect,
		ref,
		adapter,
	};
}