import {Scope} from './Scope.js';
import {Tracker, type TrackerOptions} from './Tracker.js';
import type {ReactivityAdapter} from './types.js';

/**
 * Error thrown when trying to use effect but the adapter doesn't support it.
 */
export class NoEffectSupportError extends Error {
	constructor() {
		super(
			'Adapter does not support effects. ' +
				'Either provide an adapter with an effect() method, ' +
				'or use events via $.on() instead.',
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
 * Type for the effect function returned by createAdapterBundle.
 */
export type EffectFn = (fn: () => void | (() => void)) => () => void;

/**
 * Type for the state creation function.
 */
export type StateFn = <U>(initial: U) => U extends object ? U : Ref<U>;

/**
 * Type for the ref creation function.
 */
export type RefFn = <U>(initial: U) => Ref<U>;

/**
 * Type for the createTracker function.
 */
export type CreateTrackerFn = <
	Events extends Record<string, unknown> = Record<string, unknown>,
>(
	options?: Omit<TrackerOptions<Events>, 'adapter'>,
) => Tracker<Events>;

/**
 * Bundle of utilities returned by createAdapterBundle.
 */
export interface AdapterBundle {
	/**
	 * Create a new Tracker instance with the configured adapter.
	 *
	 * @param options - Optional tracker configuration (errorHandler, etc.)
	 * @returns A new Tracker instance
	 *
	 * @example
	 * ```ts
	 * type MyEvents = { 'item:added': Item };
	 * const tracker = createTracker<MyEvents>();
	 * tracker.on('item:added', (item) => console.log(item));
	 * ```
	 */
	createTracker: CreateTrackerFn;

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
	 * const { createTracker, effect } = createAdapterBundle(svelteAdapter);
	 * const $ = createTracker<MyEvents>();
	 *
	 * // In a plain TypeScript class:
	 * class GameManager {
	 *   private cleanup: () => void;
	 *
	 *   constructor() {
	 *     this.cleanup = effect(() => {
	 *       const actions = userStore.getAllActions();
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
	effect: EffectFn;

	/**
	 * Create reactive state. Objects are deeply proxied, primitives are wrapped in Ref.
	 *
	 * @param initial - Initial value for the state
	 * @returns Reactive state (proxied object or Ref for primitives)
	 *
	 * @example
	 * ```ts
	 * const count = state(0);
	 * console.log(count.value); // 0
	 * count.value++;
	 *
	 * const player = state({ name: 'Alice', score: 0 });
	 * console.log(player.name); // 'Alice'
	 * player.score = 100;
	 * ```
	 */
	state: StateFn;

	/**
	 * Create a reactive ref. Always wraps the value in a Ref, even for objects.
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

// Counter for generating unique keys
let keyCounter = 0;

/**
 * Create a bundle of reactive utilities pre-configured with an adapter.
 *
 * This is the recommended way to use unisig in your application.
 * Call this once with your adapter, then use the returned functions
 * throughout your codebase for consistent reactivity.
 *
 * @param adapter - The reactivity adapter to use
 * @returns An AdapterBundle with createTracker, effect, state, and ref functions
 *
 * @example
 * ```ts
 * // setup.ts (or setup.svelte.ts for Svelte)
 * import { createAdapterBundle } from 'unisig';
 * import { svelteAdapter } from './svelteAdapter.svelte';
 *
 * export const { createTracker, effect, state, ref } = createAdapterBundle(svelteAdapter);
 * ```
 *
 * @example
 * ```ts
 * // userStore.ts - pure TypeScript
 * import { createTracker } from './setup';
 *
 * const $ = createTracker<{ 'user:changed': User }>();
 *
 * export const userStore = {
 *   get: (id: string) => { $.track('user', id); return users.get(id); },
 *   // ...
 * };
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
export function createAdapterBundle(adapter: ReactivityAdapter): AdapterBundle {
	// Create the effect function
	const effect: EffectFn = (fn) => {
		if (!adapter.effect) {
			throw new NoEffectSupportError();
		}
		return adapter.effect(fn);
	};

	// Create the state function
	const state: StateFn = <U>(initial: U): U extends object ? U : Ref<U> => {
		validateValue(initial);
		const scope = new Scope(adapter);
		const key = `state_${++keyCounter}`;

		if (isPrimitive(initial)) {
			return scope.deepProxy({value: initial}, key) as U extends object
				? U
				: Ref<U>;
		}

		return scope.deepProxy(initial as object, key) as U extends object
			? U
			: Ref<U>;
	};

	// Create the ref function
	const ref: RefFn = <U>(initial: U): Ref<U> => {
		const scope = new Scope(adapter);
		const key = `ref_${++keyCounter}`;
		return scope.deepProxy({value: initial}, key);
	};

	// Create the createTracker function
	const createTracker: CreateTrackerFn = <
		Events extends Record<string, unknown> = Record<string, unknown>,
	>(
		options?: Omit<TrackerOptions<Events>, 'adapter'>,
	) => {
		return new Tracker<Events>({...options, adapter});
	};

	return {
		createTracker,
		effect,
		state,
		ref,
		adapter,
	};
}