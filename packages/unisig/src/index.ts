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
	 * Create a deep reactive object - mutable with deep tracking.
	 *
	 * Returns the object directly with property access/assignment that
	 * automatically tracks and triggers reactivity.
	 *
	 * Like Svelte's $state, Vue's reactive(), Solid's createMutable.
	 *
	 * @param initial - Initial value (objects are deeply reactive)
	 * @returns Reactive version of the value (same shape as input)
	 *
	 * @example
	 * ```ts
	 * // Svelte implementation
	 * state<T>(initial: T): T {
	 *   return $state(initial);
	 * }
	 *
	 * // Solid implementation (using solid-js/store)
	 * state<T extends object>(initial: T): T {
	 *   return createMutable(initial);
	 * }
	 * ```
	 */
	state<T>(initial: T): T;

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
	 * Create a deep reactive object - mutable with deep tracking.
	 *
	 * @param initial - Initial value (objects are deeply reactive)
	 * @returns Reactive version of the value (same shape as input)
	 *
	 * @example
	 * ```ts
	 * const { state } = unisig(adapter);
	 *
	 * const user = state({ name: 'Alice', age: 30 });
	 * user.name = 'Bob';  // Triggers reactivity
	 * user.age = 31;      // Triggers reactivity
	 * ```
	 */
	state: <T>(initial: T) => T;

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
	 * const { effect, state } = unisig(adapter);
	 *
	 * const user = state({ name: 'Alice' });
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
 * and get back state, signal, and effect functions pre-configured
 * with your reactivity system.
 *
 * @param adapter - The reactivity adapter to use
 * @returns A bundle with state, signal, effect, and the adapter
 *
 * @example
 * ```ts
 * // setup.ts (or setup.svelte.ts for Svelte)
 * import { unisig } from 'unisig';
 * import { svelteAdapter } from '@unisig/svelte';
 *
 * export const { state, signal, effect } = unisig(svelteAdapter);
 * ```
 *
 * @example
 * ```ts
 * // Usage
 * import { state, signal, effect } from './setup';
 *
 * const user = state({ name: 'Alice', age: 30 });
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
		state: <T>(initial: T) => adapter.state(initial),
		signal: <T>(initial: T) => adapter.signal(initial),
		effect: (fn) => adapter.effect(fn),
		adapter,
	};
}