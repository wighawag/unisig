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
  depend(): void
  
  /**
   * Called during write operations to notify all subscribers
   * that this dependency has changed, triggering re-execution
   */
  notify(): void
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
  create(): Dependency
  
  /**
   * Optional: Check if currently inside a reactive scope.
   * If not provided, assumes always in scope when adapter is set.
   * 
   * Used to avoid unnecessary dependency tracking when not in a reactive context.
   * 
   * @returns true if currently inside a reactive scope (effect, computed, etc.)
   */
  isInScope?(): boolean
  
  /**
   * Optional: Register a cleanup callback for when the reactive scope ends.
   * Used for automatic cleanup of observers/subscriptions.
   * 
   * @param callback - Function to call when the scope is disposed
   * @param dep - The dependency this cleanup is associated with
   */
  onDispose?(callback: () => void, dep: Dependency): void
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
  adapter: ReactivityAdapter & { create(): T }
): ReactivityAdapter {
  return adapter
}