import {Scope} from './Scope';
import type {ReactivityAdapter} from './types';

/**
 * Error thrown when no reactivity adapter is available but one is required.
 */
export class NoAdapterError extends Error {
	constructor() {
		super(
			'No adapter provided and no default adapter set. ' +
				'Call setDefaultAdapter() first or pass an adapter to state()/ref().',
		);
		this.name = 'NoAdapterError';
	}
}

/**
 * Global default adapter for standalone state/ref usage.
 * Set this once at app initialization.
 */
let defaultAdapter: ReactivityAdapter | undefined;

/**
 * Set the default reactivity adapter for standalone state/ref functions.
 * Call this once at app startup.
 *
 * @example
 * ```ts
 * import { setDefaultAdapter } from 'unisig';
 * import svelteAdapter from '@signaldb/svelte';
 *
 * setDefaultAdapter(svelteAdapter);
 * ```
 */
export function setDefaultAdapter(adapter: ReactivityAdapter): void {
	defaultAdapter = adapter;
}

/**
 * Get the current default adapter.
 */
export function getDefaultAdapter(): ReactivityAdapter | undefined {
	return defaultAdapter;
}

// Counter for generating unique keys
let keyCounter = 0;

/**
 * Wrapper type for primitive values to enable reactivity.
 * Use this when you need reactive primitives (numbers, strings, booleans).
 */
export interface Ref<T> {
	value: T;
}

/**
 * Helper to resolve adapter
 * @throws {NoAdapterError} When no adapter is available
 */
function resolveAdapter(adapter?: ReactivityAdapter): ReactivityAdapter {
	const resolved = adapter ?? defaultAdapter;
	if (!resolved) {
		throw new NoAdapterError();
	}
	return resolved;
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
 * Create reactive state from a primitive value.
 * Returns a ref object with a reactive `value` property.
 *
 * @param initial - The initial primitive value
 * @param adapter - Optional adapter (uses default if not provided)
 * @returns A ref object with reactive `value` property
 */
export function state<T extends number | string | boolean | null | undefined | symbol | bigint>(
	initial: T,
	adapter?: ReactivityAdapter,
): Ref<T>;

/**
 * Create reactive state from an object.
 * Returns a deeply proxied version that automatically tracks reads
 * and triggers updates on writes.
 *
 * @param initial - The initial state object
 * @param adapter - Optional adapter (uses default if not provided)
 * @returns A deeply proxied reactive object
 */
export function state<T extends object>(initial: T, adapter?: ReactivityAdapter): T;

/**
 * Create reactive state.
 *
 * - For primitives (number, string, boolean, null, undefined, symbol, bigint):
 *   Returns a `Ref<T>` with a reactive `value` property.
 * - For objects: Returns a deeply proxied version that tracks reads/writes.
 *
 * Use with your framework's native computed/derived for derived values:
 * - Svelte: `$derived.by(() => player.score * 2)`
 * - Solid: `createMemo(() => player.score * 2)`
 * - Vue: `computed(() => player.score * 2)`
 *
 * @param initial - The initial state value
 * @param adapter - Optional adapter (uses default if not provided)
 * @returns A reactive state (Ref for primitives, proxy for objects)
 *
 * @example
 * ```ts
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
 *
 * @throws {NoAdapterError} When no adapter is available
 * @throws {TypeError} When the value type is not supported
 */
export function state<T>(
	initial: T,
	adapter?: ReactivityAdapter,
): T extends object ? T : Ref<T> {
	validateValue(initial);
	const resolvedAdapter = resolveAdapter(adapter);
	const scope = new Scope(resolvedAdapter);
	const key = `state_${++keyCounter}`;

	if (isPrimitive(initial)) {
		// Wrap primitives in a ref object
		return scope.deepProxy({value: initial}, key) as T extends object
			? T
			: Ref<T>;
	}

	return scope.deepProxy(initial as object, key) as T extends object
		? T
		: Ref<T>;
}

/**
 * Create reactive state from a primitive value.
 * Alias for `state()` when you explicitly want a ref.
 * Returns a ref object with a reactive `value` property.
 *
 * @param initial - The initial primitive value
 * @param adapter - Optional adapter (uses default if not provided)
 * @returns A ref object with reactive `value` property
 *
 * @example
 * ```ts
 * const count = ref(0);
 *
 * // In a reactive context:
 * console.log(count.value);  // Tracks the value
 *
 * // Mutations trigger updates:
 * count.value = 5;           // Notifies watchers
 * count.value++;             // Also works
 *
 * // Derived values use framework primitives:
 * const doubled = $derived.by(() => count.value * 2);  // Svelte
 * ```
 *
 * @throws {NoAdapterError} When no adapter is available
 */
export function ref<T>(initial: T, adapter?: ReactivityAdapter): Ref<T> {
	const resolvedAdapter = resolveAdapter(adapter);
	const scope = new Scope(resolvedAdapter);
	const key = `ref_${++keyCounter}`;

	return scope.deepProxy({value: initial}, key);
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
 * const count = ref(0);
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