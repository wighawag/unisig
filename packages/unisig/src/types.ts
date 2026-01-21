/**
 * Generic event listener type
 */
export type Listener<T = unknown> = (data: T) => void;

/**
 * Error handler type for managing errors in event listeners.
 *
 * Used by both Emitter and Tracker to provide custom error handling
 * when listeners throw exceptions.
 *
 * @param event - The event being emitted
 * @param error - The error that occurred
 * @param listener - The listener function that threw the error
 *
 * @example
 * ```ts
 * const errorHandler: ErrorHandler<MyEvents> = (event, error, listener) => {
 *   console.error(`Error in ${String(event)}:`, error);
 *   // Send to error tracking service
 *   Sentry.captureException(error);
 * };
 * ```
 */
export type ErrorHandler<Events> = (
	event: keyof Events,
	error: Error,
	listener: Listener<unknown>,
) => void;

/**
 * Event map type for type-safe event handling.
 *
 * Use this type to define your event contracts explicitly.
 * It ensures all keys are strings and values can be any type.
 *
 * @example
 * ```ts
 * type MyEvents = EventMap<{
 *   'user:added': { id: string; name: string };
 *   'user:removed': string;
 *   'data:loaded': number[];
 *   'error': Error;
 * }>;
 * ```
 */
export type EventMap<
	T extends Record<string, unknown> = Record<string, unknown>,
> = T;

/**
 * Core dependency interface - the minimal abstraction every signal library can implement.
 *
 * This is the "lowest common denominator" of reactive systems:
 * - `depend()` is called during read operations to track the dependency
 * - `notify()` is called during write operations to trigger re-execution
 */
export interface Dependency {
	/**
	 * Called during read operations to register this as a dependency
	 * of the currently running reactive scope (effect/computed/etc.)
	 */
	depend(): void;

	/**
	 * Called during write operations to notify all subscribers
	 * that this dependency has changed, triggering re-execution
	 */
	notify(): void;
}

/**
 * Adapter interface to bridge any signal library.
 *
 * Implement this interface to connect your signal library of choice.
 * The library provides no adapters by default - you bring your own.
 */
export interface ReactivityAdapter {
	/**
	 * Factory function to create a new dependency tracker.
	 * Called once per tracked value/collection.
	 */
	create(): Dependency;

	/**
	 * Optional: Check if currently inside a reactive scope.
	 * If not provided, assumes always in scope when adapter is set.
	 *
	 * Used to avoid unnecessary dependency tracking when not in a reactive context.
	 *
	 * @returns true if currently inside a reactive scope (effect, computed, etc.)
	 */
	isInScope?(): boolean;

	/**
	 * Optional: Register a cleanup callback for when the reactive scope ends.
	 * Used for automatic cleanup of observers/subscriptions.
	 *
	 * @param callback - Function to call when the scope is disposed
	 * @param dep - The dependency this cleanup is associated with
	 */
	onDispose?(callback: () => void, dep: Dependency): void;
}

/**
 * Helper to create a type-safe reactivity adapter.
 * Simply returns the input - used for better type inference.
 *
 * @example
 * ```ts
 * const solidAdapter = createReactivityAdapter({
 *   create: () => {
 *     const [track, trigger] = createSignal(undefined, { equals: false })
 *     return { depend: () => track(), notify: () => trigger(undefined) }
 *   },
 *   isInScope: () => !!getOwner()
 * })
 * ```
 */
export function createReactivityAdapter<T extends Dependency = Dependency>(
	adapter: ReactivityAdapter & {create(): T},
): ReactivityAdapter {
	return adapter;
}
