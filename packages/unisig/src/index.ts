/**
 * Signal interface - the return type of signal()
 * Provides get/set methods for shallow reactive values.
 */
export interface Signal<T> {
	/**
	 * Get the current value.
	 * Called during read operations to track the dependency.
	 */
	get(): T;

	/**
	 * Set a new value.
	 * Called during write operations to trigger re-execution.
	 */
	set(value: T): void;
}

/**
 * Boxed value wrapper for primitives.
 * Used when reactive() receives a primitive value.
 */
export interface Boxed<T> {
	value: T;
}

/**
 * Type helper to check if T is a primitive type.
 * Primitives: string, number, boolean, symbol, bigint, null, undefined
 */
export type IsPrimitive<T> = T extends object ? false : true;

/**
 * Conditional return type for reactive().
 * - Objects return T directly (deep reactive proxy)
 * - Primitives return { value: T } (boxed value)
 *
 * This ensures a consistent API across adapters that may have
 * different capabilities for handling primitives.
 */
export type ReactiveResult<T> = T extends object ? T : Boxed<T>;

/**
 * Minimal adapter for standalone reactive state.
 *
 * This is the core interface that all reactivity adapters must implement
 * to provide reactive state and effects for unisig.
 *
 * @example
 * ```ts
 * // Svelte adapter
 * const svelteAdapter: BasicReactivityAdapter = {
 *   effect: (fn) => {
 *     let cleanup;
 *     const rootCleanup = $effect.root(() => {
 *       $effect(() => {
 *         cleanup?.();
 *         const result = fn();
 *         cleanup = typeof result === 'function' ? result : undefined;
 *       });
 *     });
 *     return () => { cleanup?.(); rootCleanup(); };
 *   },
 *   state: <T>(initial: T) => $state(initial),
 *   signal: <T>(initial: T) => {
 *     const s = $state({ value: initial });
 *     return { get: () => s.value, set: (v) => s.value = v };
 *   },
 * };
 * ```
 */
export interface BasicReactivityAdapter {
	/**
	 * Create a reactive effect that re-runs when tracked dependencies change.
	 *
	 * The effect function can optionally return a cleanup function that will be
	 * called before each re-run and when the effect is disposed.
	 *
	 * @param fn - The effect function to run. May return a cleanup function.
	 * @returns A cleanup function that stops the effect when called.
	 */
	effect(fn: () => void | (() => void)): () => void;

	/**
	 * Create a deep reactive state.
	 *
	 * - For objects: Returns the object directly with deep reactivity
	 * - For primitives: Returns { value: T } wrapper (boxed value)
	 *
	 * This conditional return type ensures a consistent API across adapters.
	 *
	 * @param initial - Initial value
	 * @returns For objects: T (deep reactive proxy). For primitives: { value: T }
	 *
	 * @example
	 * ```ts
	 * // Objects - direct property access
	 * const user = reactive({ name: 'Alice', age: 30 });
	 * user.name = 'Bob';  // Triggers reactivity
	 *
	 * // Primitives - use .value
	 * const count = reactive(5);
	 * count.value = 10;   // Triggers reactivity
	 * console.log(count.value);  // 10
	 * ```
	 */
	reactive<T>(initial: T): ReactiveResult<T>;

	/**
	 * Create a shallow reactive signal with get/set interface.
	 *
	 * Like Solid's createSignal, but with object interface.
	 *
	 * @param initial - Initial value
	 * @returns Signal with get/set methods
	 *
	 * @example
	 * ```ts
	 * // Solid implementation
	 * signal<T>(initial: T): Signal<T> {
	 *   const [get, set] = createSignal(initial);
	 *   return { get, set };
	 * }
	 *
	 * // Svelte implementation
	 * signal<T>(initial: T): Signal<T> {
	 *   const s = $state({ value: initial });
	 *   return { get: () => s.value, set: (v) => s.value = v };
	 * }
	 * ```
	 */
	signal<T>(initial: T): Signal<T>;
}

/**
 * Bundle of reactive primitives returned by unisig().
 */
export interface ReactivityBundle<Adapter extends BasicReactivityAdapter> {
	/**
	 * Create a deep reactive state.
	 *
	 * - For objects: Returns the object directly with deep reactivity
	 * - For primitives: Returns { value: T } wrapper (boxed value)
	 *
	 * @param initial - Initial value
	 * @returns For objects: T (deep reactive proxy). For primitives: { value: T }
	 *
	 * @example
	 * ```ts
	 * const { reactive } = unisig(adapter);
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
	reactive: <T>(initial: T) => ReactiveResult<T>;

	/**
	 * Create a shallow reactive signal with get/set interface.
	 *
	 * @param initial - Initial value
	 * @returns Signal with get/set methods
	 *
	 * @example
	 * ```ts
	 * const { signal } = unisig(adapter);
	 *
	 * const count = signal(0);
	 * console.log(count.get());  // 0
	 * count.set(1);              // Triggers reactivity
	 * ```
	 */
	signal: <T>(initial: T) => Signal<T>;

	/**
	 * Create a reactive effect that re-runs when tracked dependencies change.
	 *
	 * @param fn - The effect function. Can return a cleanup function.
	 * @returns A cleanup function to stop the effect.
	 *
	 * @example
	 * ```ts
	 * const { effect, reactive } = unisig(adapter);
	 *
	 * const user = reactive({ name: 'Alice' });
	 *
	 * const cleanup = effect(() => {
	 *   console.log('Name:', user.name);
	 *   return () => console.log('Cleanup');
	 * });
	 *
	 * user.name = 'Bob';  // Effect re-runs, logs "Cleanup" then "Name: Bob"
	 * cleanup();          // Stops the effect
	 * ```
	 */
	effect: (fn: () => void | (() => void)) => () => void;

	/**
	 * The raw adapter, for advanced use cases.
	 */
	adapter: Adapter;
}

/**
 * Create a bundle of reactive primitives from an adapter.
 *
 * This is the main entry point for using unisig. Pass your adapter
 * and get back reactive, signal, and effect functions pre-configured
 * with your reactivity system.
 *
 * @param adapter - The reactivity adapter to use
 * @returns A bundle with reactive, signal, effect, and the adapter
 *
 * @example
 * ```ts
 * // setup.ts (or setup.svelte.ts for Svelte)
 * import { unisig } from 'unisig';
 * import { svelteAdapter } from '@unisig/svelte';
 *
 * export const { reactive, signal, effect } = unisig(svelteAdapter);
 * ```
 *
 * @example
 * ```ts
 * // Usage
 * import { reactive, signal, effect } from './setup';
 *
 * const user = reactive({ name: 'Alice', age: 30 });
 * const count = signal(0);
 *
 * effect(() => {
 *   console.log(`${user.name} is ${user.age} years old, count: ${count.get()}`);
 * });
 *
 * user.name = 'Bob';   // Effect re-runs
 * count.set(1);        // Effect re-runs
 * ```
 */
export function unisig<Adapter extends BasicReactivityAdapter>(
	adapter: Adapter,
): ReactivityBundle<Adapter> {
	return {
		reactive: <T>(initial: T) => adapter.reactive(initial) as ReactiveResult<T>,
		signal: <T>(initial: T) => adapter.signal(initial),
		effect: (fn) => adapter.effect(fn),
		adapter,
	};
}
