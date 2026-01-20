import type { ReactivityAdapter, Dependency } from './types'
import { Emitter, type Listener, type Unsubscribe } from './Emitter'
import { Scope } from './Scope'

/**
 * Combined reactive helper that provides both signal tracking and event emission.
 * 
 * This is the main class you'll use to add reactivity to your existing classes.
 * It combines a Scope (for signal-based reactivity) with an Emitter (for events).
 * 
 * @example
 * ```ts
 * interface MyEvents {
 *   'user:added': User
 *   'user:removed': string
 * }
 * 
 * class UserStore {
 *   private $ = new Reactive<MyEvents>()
 *   private users = new Map<string, User>()
 *   
 *   // Expose configuration
 *   setReactivityAdapter(adapter: ReactivityAdapter) {
 *     this.$.setAdapter(adapter)
 *   }
 *   
 *   on<K extends keyof MyEvents>(event: K, listener: Listener<MyEvents[K]>) {
 *     return this.$.on(event, listener)
 *   }
 *   
 *   // Read methods - call track()
 *   getAll() {
 *     this.$.track('users')
 *     return [...this.users.values()]
 *   }
 *   
 *   get(id: string) {
 *     this.$.trackItem('users', id)
 *     return this.users.get(id)
 *   }
 *   
 *   // Write methods - call trigger() and emit()
 *   add(user: User) {
 *     this.users.set(user.id, user)
 *     this.$.trigger('users', 'user:added', user)
 *   }
 *   
 *   remove(id: string) {
 *     const user = this.users.get(id)
 *     if (!user) return
 *     this.users.delete(id)
 *     this.$.triggerRemove('users', id, 'user:removed', id)
 *   }
 * }
 * ```
 */
export class Reactive<Events extends Record<string, unknown> = Record<string, unknown>> {
  private scope: Scope
  private emitter: Emitter<Events>

  /**
   * Create a new Reactive instance.
   * 
   * @param adapter - Optional reactivity adapter to use immediately
   */
  constructor(adapter?: ReactivityAdapter) {
    this.scope = new Scope(adapter)
    this.emitter = new (class extends Emitter<Events> {
      // Expose emit as public for Reactive to use
      public emit<K extends keyof Events>(event: K, data: Events[K]): void {
        super.emit(event, data)
      }
      public hasListeners<K extends keyof Events>(event: K): boolean {
        return super.hasListeners(event)
      }
    })()
  }

  // ============ ADAPTER CONFIGURATION ============

  /**
   * Set or change the reactivity adapter.
   * 
   * @param adapter - The reactivity adapter to use
   */
  setAdapter(adapter: ReactivityAdapter): void {
    this.scope.setAdapter(adapter)
  }

  /**
   * Get the current adapter, if any.
   */
  getAdapter(): ReactivityAdapter | undefined {
    return this.scope.getAdapter()
  }

  /**
   * Check if currently inside a reactive scope.
   */
  isInScope(): boolean {
    return this.scope.isInScope()
  }

  // ============ EVENT METHODS ============

  /**
   * Subscribe to an event.
   * 
   * @param event - Event name to listen for
   * @param listener - Callback function
   * @returns Unsubscribe function
   */
  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): Unsubscribe {
    return this.emitter.on(event, listener)
  }

  /**
   * Unsubscribe from an event.
   * 
   * @param event - Event name
   * @param listener - The exact listener function to remove
   */
  off<K extends keyof Events>(event: K, listener: Listener<Events[K]>): void {
    this.emitter.off(event, listener)
  }

  /**
   * Subscribe to an event for a single emission.
   * 
   * @param event - Event name
   * @param listener - Callback function (called once)
   * @returns Unsubscribe function
   */
  once<K extends keyof Events>(event: K, listener: Listener<Events[K]>): Unsubscribe {
    return this.emitter.once(event, listener)
  }

  // ============ DEPENDENCY ACCESS ============

  /**
   * Get or create a dependency by key.
   * Returns null if no adapter is set.
   */
  dep(key: string): Dependency | null {
    return this.scope.dep(key)
  }

  /**
   * Get or create a per-item dependency.
   * Returns null if no adapter is set.
   */
  itemDep(collection: string, id: string | number): Dependency | null {
    return this.scope.itemDep(collection, id)
  }

  /**
   * Get or create a property dependency for a key.
   * Returns null if no adapter is set.
   */
  propDep(key: string, prop: string): Dependency | null {
    return this.scope.propDep(key, prop)
  }

  /**
   * Get or create a property dependency for a specific item.
   * Returns null if no adapter is set.
   */
  itemPropDep(collection: string, id: string | number, prop: string): Dependency | null {
    return this.scope.itemPropDep(collection, id, prop)
  }

  // ============ TRACKING (for reads) ============

  /**
   * Track a read operation for a key.
   * Call this at the start of getter methods.
   * 
   * @param key - The dependency key to track
   */
  track(key: string): void {
    this.scope.track(key)
  }

  /**
   * Track a read operation for a specific item.
   * Also tracks the collection for removal detection.
   *
   * @param collection - Name of the collection
   * @param id - Item identifier
   */
  trackItem(collection: string, id: string | number): void {
    this.scope.trackItem(collection, id)
  }

  /**
   * Track a read operation for a specific property of a key.
   * Also tracks the key itself.
   *
   * @param key - The dependency key
   * @param prop - The property name
   */
  trackProp(key: string, prop: string): void {
    this.scope.trackProp(key, prop)
  }

  /**
   * Track a read operation for a specific property of an item.
   * Also tracks the item and collection.
   *
   * @param collection - Name of the collection
   * @param id - Item identifier
   * @param prop - The property name
   */
  trackItemProp(collection: string, id: string | number, prop: string): void {
    this.scope.trackItemProp(collection, id, prop)
  }

  // ============ TRIGGERING (for writes) ============

  /**
   * Trigger a change notification and optionally emit an event.
   * 
   * @param key - The dependency key that changed
   * @param event - Optional event to emit
   * @param data - Optional event data
   */
  trigger<K extends keyof Events>(key: string, event?: K, data?: Events[K]): void {
    this.scope.trigger(key)
    if (event !== undefined) {
      (this.emitter as any).emit(event, data)
    }
  }

  /**
   * Trigger a change for a specific item and optionally emit an event.
   * Does NOT trigger the collection - use triggerList() for that.
   * Also notifies all property watchers for this item.
   *
   * @param collection - Name of the collection
   * @param id - Item identifier
   * @param event - Optional event to emit
   * @param data - Optional event data
   */
  triggerItem<K extends keyof Events>(
    collection: string,
    id: string | number,
    event?: K,
    data?: Events[K]
  ): void {
    this.scope.triggerItem(collection, id)
    if (event !== undefined) {
      (this.emitter as any).emit(event, data)
    }
  }

  /**
   * Trigger a change for a specific property of a key and optionally emit an event.
   * Does NOT trigger the key itself - use trigger() for that.
   *
   * @param key - The dependency key
   * @param prop - The property that changed
   * @param event - Optional event to emit
   * @param data - Optional event data
   */
  triggerProp<K extends keyof Events>(
    key: string,
    prop: string,
    event?: K,
    data?: Events[K]
  ): void {
    this.scope.triggerProp(key, prop)
    if (event !== undefined) {
      (this.emitter as any).emit(event, data)
    }
  }

  /**
   * Trigger a change for a specific property of an item and optionally emit an event.
   * Does NOT trigger the item or collection.
   *
   * @param collection - Name of the collection
   * @param id - Item identifier
   * @param prop - The property that changed
   * @param event - Optional event to emit
   * @param data - Optional event data
   */
  triggerItemProp<K extends keyof Events>(
    collection: string,
    id: string | number,
    prop: string,
    event?: K,
    data?: Events[K]
  ): void {
    this.scope.triggerItemProp(collection, id, prop)
    if (event !== undefined) {
      (this.emitter as any).emit(event, data)
    }
  }

  /**
   * Trigger a list change and optionally emit an event.
   * 
   * @param collection - Name of the collection
   * @param event - Optional event to emit
   * @param data - Optional event data
   */
  triggerList<K extends keyof Events>(collection: string, event?: K, data?: Events[K]): void {
    this.scope.triggerList(collection)
    if (event !== undefined) {
      (this.emitter as any).emit(event, data)
    }
  }

  /**
   * Trigger for item removal: notifies item watchers, list watchers,
   * cleans up the item dep, and optionally emits an event.
   * 
   * @param collection - Name of the collection
   * @param id - Item identifier being removed
   * @param event - Optional event to emit
   * @param data - Optional event data
   */
  triggerRemove<K extends keyof Events>(
    collection: string,
    id: string | number,
    event?: K,
    data?: Events[K]
  ): void {
    this.scope.triggerRemove(collection, id)
    if (event !== undefined) {
      (this.emitter as any).emit(event, data)
    }
  }

  /**
   * Trigger for item addition: notifies list watchers and optionally emits an event.
   * 
   * @param collection - Name of the collection
   * @param event - Optional event to emit
   * @param data - Optional event data
   */
  triggerAdd<K extends keyof Events>(collection: string, event?: K, data?: Events[K]): void {
    this.scope.triggerList(collection)
    if (event !== undefined) {
      (this.emitter as any).emit(event, data)
    }
  }

  // ============ DIRECT EMIT ============

  /**
   * Emit an event without triggering any signals.
   * Use this when you only want event notification.
   * 
   * @param event - Event name
   * @param data - Event data
   */
  emit<K extends keyof Events>(event: K, data: Events[K]): void {
    (this.emitter as any).emit(event, data)
  }

  // ============ AUTO-TRACKING PROXIES ============

  /**
   * Create a proxy that auto-tracks property reads and auto-triggers property writes.
   *
   * @param target - The object to wrap
   * @param key - The dependency key for this object
   * @returns A proxy that automatically tracks/triggers
   *
   * @example
   * ```ts
   * getConfig() {
   *   this.$.track('config')
   *   return this.$.proxy(this.config, 'config')
   * }
   * ```
   */
  proxy<T extends object>(target: T, key: string): T {
    return this.scope.proxy(target, key)
  }

  /**
   * Create a proxy for a collection item that auto-tracks property reads
   * and auto-triggers property writes.
   *
   * @param target - The object to wrap
   * @param collection - The collection name
   * @param id - The item id
   * @returns A proxy that automatically tracks/triggers
   *
   * @example
   * ```ts
   * getUser(id: string) {
   *   this.$.trackItem('users', id)
   *   const user = this.users.get(id)
   *   return user ? this.$.itemProxy(user, 'users', id) : undefined
   * }
   * ```
   */
  itemProxy<T extends object>(target: T, collection: string, id: string | number): T {
    return this.scope.itemProxy(target, collection, id)
  }

  // ============ DEEP AUTO-TRACKING PROXIES ============

  /**
   * Create a deep proxy that auto-tracks property reads at any nesting level.
   * Uses dot notation for nested paths (e.g., 'stats.health').
   *
   * @param target - The object to wrap
   * @param key - The dependency key for this object
   * @returns A deeply proxied object
   *
   * @example
   * ```ts
   * getConfig() {
   *   this.$.track('config')
   *   return this.$.deepProxy(this.config, 'config')
   * }
   *
   * // Nested access is tracked:
   * createEffect(() => {
   *   console.log(store.getConfig().theme.colors.primary) // Tracks 'theme.colors.primary'
   * })
   * ```
   */
  deepProxy<T extends object>(target: T, key: string): T {
    return this.scope.deepProxy(target, key)
  }

  /**
   * Create a deep proxy for a collection item that auto-tracks property reads
   * at any nesting level. Uses dot notation for nested paths.
   *
   * @param target - The object to wrap
   * @param collection - The collection name
   * @param id - The item id
   * @returns A deeply proxied object
   *
   * @example
   * ```ts
   * getUser(id: string) {
   *   this.$.trackItem('users', id)
   *   const user = this.users.get(id)
   *   return user ? this.$.deepItemProxy(user, 'users', id) : undefined
   * }
   *
   * // Nested access is tracked:
   * createEffect(() => {
   *   const user = store.getUser('1')
   *   console.log(user?.stats.health) // Tracks 'stats.health'
   * })
   * ```
   */
  deepItemProxy<T extends object>(target: T, collection: string, id: string | number): T {
    return this.scope.deepItemProxy(target, collection, id)
  }

  // ============ CLEANUP ============

  /**
   * Clear all dependencies.
   * Events are not affected.
   */
  clear(): void {
    this.scope.clear()
  }
}

/**
 * Create a new Reactive instance.
 * Convenience function alternative to `new Reactive()`.
 * 
 * @param adapter - Optional reactivity adapter
 */
export function reactive<Events extends Record<string, unknown> = Record<string, unknown>>(
  adapter?: ReactivityAdapter
): Reactive<Events> {
  return new Reactive<Events>(adapter)
}