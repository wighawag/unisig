import {Scope} from './Scope';
import type {ReactivityAdapter} from './types';

/**
 * Error thrown when no reactivity adapter is available but one is required.
 */
export class NoAdapterError extends Error {
	constructor() {
		super(
			'No adapter provided. Use withAdapter() to create a configured state function.',
		);
		this.name = 'NoAdapterError';
	}
}

/**
 * Wrapper type for primitive values to enable reactivity.
 * Use this when you need reactive primitives (numbers, strings, booleans).
 */
export interface Ref<T> {
	value: T;
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
 * Create a factory function for creating reactive state with a specific adapter.
 * Removes the need for global state by returning a configured state function.
 *
 * @param adapter - The reactivity adapter to use for state creation
 * @returns A state function that creates reactive state with the configured adapter
 *
 * @example
 * ```ts
 * import { withAdapter } from 'unisig';
 * import svelteAdapter from './svelteAdapter';
 *
 * const state = withAdapter(svelteAdapter);
 *
 * // Primitives return Ref<T>
 * const count = state(0);
 * console.log(count.value);  // 0
 * count.value++;             // Triggers updates
 *
 * // Objects return deeply proxied versions
 * const player = state({ name: 'Alice', score: 0, stats: { health: 100 } });
 * console.log(player.name);        // Tracks 'name'
 * player.score = 50;              // Notifies 'score' watchers
 *
 * // Derived values use framework primitives:
 * const doubled = $derived.by(() => count.value * 2);  // Svelte
 * ```
 */
export function withAdapter<T extends ReactivityAdapter = ReactivityAdapter>(
	adapter: T,
): <U>(initial: U) => U extends object ? U : Ref<U> {
	return function createReactiveState<U>(
		initial: U,
	): U extends object ? U : Ref<U> {
		validateValue(initial);
		const scope = new Scope(adapter);
		const key = `state_${++keyCounter}`;

		if (isPrimitive(initial)) {
			// Wrap primitives in a ref object
			return scope.deepProxy({value: initial}, key) as U extends object
				? U
				: Ref<U>;
		}

		return scope.deepProxy(initial as object, key) as U extends object
			? U
			: Ref<U>;
	};
}

/**
 * Create a factory function for creating reactive refs with a specific adapter.
 * Removes the need for global state by returning a configured ref function.
 *
 * @param adapter - The reactivity adapter to use for ref creation
 * @returns A ref function that creates reactive refs with the configured adapter
 *
 * @example
 * ```ts
 * import { withAdapterRef } from 'unisig';
 * import svelteAdapter from './svelteAdapter';
 *
 * const ref = withAdapterRef(svelteAdapter);
 * const count = ref(0);
 *
 * console.log(count.value);  // Tracks the value
 * count.value = 5;           // Notifies watchers
 * count.value++;             // Also works
 * ```
 */
export function withAdapterRef<T extends ReactivityAdapter = ReactivityAdapter>(
	adapter: T,
): <U>(initial: U) => Ref<U> {
	return function createReactiveRef<U>(initial: U): Ref<U> {
		const scope = new Scope(adapter);
		const key = `ref_${++keyCounter}`;

		return scope.deepProxy({value: initial}, key);
	};
}

/**
 * Type helper to extract the inner type from a Ref.
 */
export type UnwrapRef<T> = T extends Ref<infer V> ? V : T;

/**
 * Check if a value is a Ref.
 * A value is considered a Ref if it's an object with exactly one property named 'value'.
 *
 * @param value - The value to check
 * @returns true if the value is a Ref
 *
 * @example
 * ```ts
 * const count = state(0);
 * isRef(count)  // true
 *
 * const obj = { value: 1, other: 2 };
 * isRef(obj)    // false (has more than one property)
 *
 * isRef(null)   // false
 * isRef(42)     // false
 * ```
 */
export function isRef<T>(value: unknown): value is Ref<T> {
	return (
		value !== null &&
		typeof value === 'object' &&
		'value' in value &&
		Object.keys(value).length === 1
	);
}

// Counter for generating unique keys
let keyCounter = 0;