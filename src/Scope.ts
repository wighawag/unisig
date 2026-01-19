import type { Dependency, ReactivityAdapter } from './types'

/**
 * Manages reactive dependencies for a class or object.
 * 
 * Provides methods to track reads and trigger notifications for both
 * simple key-based dependencies and granular per-item dependencies.
 * 
 * @example
 * ```ts
 * class MyStore {
 *   private scope = new Scope()
 *   
 *   setAdapter(adapter: ReactivityAdapter) {
 *     this.scope.setAdapter(adapter)
 *   }
 *   
 *   getItems() {
 *     this.scope.track('items')
 *     return this.items
 *   }
 *   
 *   addItem(item: Item) {
 *     this.items.push(item)
 *     this.scope.trigger('items')
 *   }
 * }
 * ```
 */
export class Scope {
  private adapter?: ReactivityAdapter
  private deps = new Map<string, Dependency>()
  private itemDeps = new Map<string, Map<string | number, Dependency>>()

  /**
   * Create a new Scope, optionally with an adapter.
   * 
   * @param adapter - Optional reactivity adapter to use
   */
  constructor(adapter?: ReactivityAdapter) {
    this.adapter = adapter
  }

  /**
   * Set or change the reactivity adapter.
   * Existing dependencies are not affected.
   * 
   * @param adapter - The reactivity adapter to use
   */
  setAdapter(adapter: ReactivityAdapter): void {
    this.adapter = adapter
  }

  /**
   * Get the current adapter, if any.
   */
  getAdapter(): ReactivityAdapter | undefined {
    return this.adapter
  }

  /**
   * Check if currently inside a reactive scope.
   * Returns false if no adapter is set.
   */
  isInScope(): boolean {
    if (!this.adapter) return false
    if (!this.adapter.isInScope) return true
    return this.adapter.isInScope()
  }

  /**
   * Get or create a dependency by key.
   * Returns null if no adapter is set.
   * 
   * @param key - Unique key for this dependency
   */
  dep(key: string): Dependency | null {
    if (!this.adapter) return null
    if (!this.deps.has(key)) {
      this.deps.set(key, this.adapter.create())
    }
    return this.deps.get(key)!
  }

  /**
   * Get or create a per-item dependency.
   * Useful for granular updates (e.g., only re-render when a specific item changes).
   * Returns null if no adapter is set.
   * 
   * @param collection - Name of the collection/group
   * @param id - Unique identifier of the item
   */
  itemDep(collection: string, id: string | number): Dependency | null {
    if (!this.adapter) return null
    if (!this.itemDeps.has(collection)) {
      this.itemDeps.set(collection, new Map())
    }
    const map = this.itemDeps.get(collection)!
    if (!map.has(id)) {
      map.set(id, this.adapter.create())
    }
    return map.get(id)!
  }

  /**
   * Remove a per-item dependency.
   * Call this when an item is removed to clean up.
   * 
   * @param collection - Name of the collection/group
   * @param id - Unique identifier of the item
   */
  removeItemDep(collection: string, id: string | number): void {
    this.itemDeps.get(collection)?.delete(id)
  }

  /**
   * Check if a per-item dependency exists.
   * 
   * @param collection - Name of the collection/group
   * @param id - Unique identifier of the item
   */
  hasItemDep(collection: string, id: string | number): boolean {
    return this.itemDeps.get(collection)?.has(id) ?? false
  }

  /**
   * Track a read operation for a key.
   * Call this at the start of getter methods.
   * Does nothing if not in a reactive scope.
   * 
   * @param key - The dependency key to track
   * 
   * @example
   * ```ts
   * getUsers() {
   *   this.scope.track('users')
   *   return this.users
   * }
   * ```
   */
  track(key: string): void {
    if (this.isInScope()) {
      this.dep(key)?.depend()
    }
  }

  /**
   * Track a read operation for a specific item.
   * Also tracks the collection for removal detection.
   * 
   * @param collection - Name of the collection/group
   * @param id - Unique identifier of the item
   * 
   * @example
   * ```ts
   * getUser(id: string) {
   *   this.scope.trackItem('users', id)
   *   return this.users.get(id)
   * }
   * ```
   */
  trackItem(collection: string, id: string | number): void {
    if (this.isInScope()) {
      this.itemDep(collection, id)?.depend()
      // Also track the collection so removal can be detected
      this.dep(collection)?.depend()
    }
  }

  /**
   * Notify that a key has changed.
   * Call this after mutation operations.
   * 
   * @param key - The dependency key that changed
   * 
   * @example
   * ```ts
   * addUser(user: User) {
   *   this.users.push(user)
   *   this.scope.trigger('users')
   * }
   * ```
   */
  trigger(key: string): void {
    this.dep(key)?.notify()
  }

  /**
   * Notify that a specific item has changed.
   * Does NOT notify the collection - use triggerList() for that.
   * 
   * @param collection - Name of the collection/group
   * @param id - Unique identifier of the item
   * 
   * @example
   * ```ts
   * updateUser(id: string, changes: Partial<User>) {
   *   Object.assign(this.users.get(id), changes)
   *   this.scope.triggerItem('users', id)
   * }
   * ```
   */
  triggerItem(collection: string, id: string | number): void {
    this.itemDep(collection, id)?.notify()
  }

  /**
   * Notify that a collection/list has changed.
   * Use this for add/remove operations.
   * 
   * @param collection - Name of the collection
   */
  triggerList(collection: string): void {
    this.dep(collection)?.notify()
  }

  /**
   * Notify item change, list change, and cleanup item dep.
   * Use this when removing an item.
   * 
   * @param collection - Name of the collection
   * @param id - Unique identifier of the removed item
   */
  triggerRemove(collection: string, id: string | number): void {
    this.triggerItem(collection, id)
    this.triggerList(collection)
    this.removeItemDep(collection, id)
  }

  /**
   * Clear all dependencies.
   * Useful for cleanup/disposal.
   */
  clear(): void {
    this.deps.clear()
    this.itemDeps.clear()
  }
}