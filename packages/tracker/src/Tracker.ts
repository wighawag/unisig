import {Scope} from './Scope.js';
import type {ScopeAdapter, Dependency} from './types.js';

/**
 * Options for configuring Tracker behavior
 */
export interface TrackerOptions {
	/**
	 * Optional scope adapter to use immediately
	 */
	adapter?: ScopeAdapter;
}

/**
 * Reactive helper that provides granular signal tracking.
 *
 * This class provides granular reactivity at collection, item, and property levels.
 * It tracks dependencies and notifies changes through the signal system.
 *
 * @example
 * ```ts
 * class UserStore {
 *   private $ = new Tracker({ adapter: myAdapter })
 *   private users = new Map<string, User>()
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
 *   // Write methods - call trigger()
 *   add(user: User) {
 *     this.users.set(user.id, user)
 *     this.$.trigger('users')
 *   }
 *
 *   remove(id: string) {
 *     const user = this.users.get(id)
 *     if (!user) return
 *     this.users.delete(id)
 *     this.$.triggerItemRemoved('users', id)
 *   }
 * }
 * ```
 */
export class Tracker {
	private scope: Scope;

	/**
	 * Create a new Tracker instance.
	 *
	 * @param options - Optional configuration including adapter
	 *
	 * @example
	 * ```ts
	 * // With adapter
	 * const tracker = new Tracker({ adapter: myAdapter });
	 *
	 * // Without adapter (can be set later)
	 * const tracker = new Tracker();
	 * ```
	 */
	constructor(options?: TrackerOptions) {
		const {adapter} = options || {};
		this.scope = new Scope(adapter);
	}

	/**
	 * Get the current adapter, if any.
	 */
	getAdapter(): ScopeAdapter | undefined {
		return this.scope.getAdapter();
	}

	/**
	 * Check if currently inside a reactive scope.
	 */
	isInScope(): boolean {
		return this.scope.isInScope();
	}

	// ============ DEPENDENCY ACCESS ============

	/**
	 * Get or create a dependency by key.
	 * Returns undefined if no adapter is set.
	 */
	dep(key: string): Dependency | undefined {
		return this.scope.dep(key);
	}

	/**
	 * Get or create a per-item dependency.
	 * Returns undefined if no adapter is set.
	 */
	itemDep(collection: string, id: string | number): Dependency | undefined {
		return this.scope.itemDep(collection, id);
	}

	/**
	 * Get or create a property dependency for a key.
	 * Returns undefined if no adapter is set.
	 */
	propDep(key: string, prop: string): Dependency | undefined {
		return this.scope.propDep(key, prop);
	}

	/**
	 * Get or create a property dependency for a specific item.
	 * Returns undefined if no adapter is set.
	 */
	itemPropDep(collection: string, id: string | number, prop: string): Dependency | undefined {
		return this.scope.itemPropDep(collection, id, prop);
	}

	// ============ TRACKING (for reads) ============

	/**
	 * Track a read operation for a key.
	 * Call this at the start of getter methods.
	 *
	 * @param key - The dependency key to track
	 */
	track(key: string): void {
		this.scope.track(key);
	}

	/**
	 * Track a read operation for a specific item.
	 * Also tracks the collection for removal detection.
	 *
	 * @param collection - Name of the collection
	 * @param id - Item identifier
	 */
	trackItem(collection: string, id: string | number): void {
		this.scope.trackItem(collection, id);
	}

	/**
	 * Track a read operation for a specific property of a key.
	 * Also tracks the key itself.
	 *
	 * @param key - The dependency key
	 * @param prop - The property name
	 */
	trackProp(key: string, prop: string): void {
		this.scope.trackProp(key, prop);
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
		this.scope.trackItemProp(collection, id, prop);
	}

	// ============ TRIGGERING (for writes) ============

	/**
	 * Trigger a change notification for a key.
	 *
	 * @param key - The dependency key that changed
	 */
	trigger(key: string): void {
		this.scope.trigger(key);
	}

	/**
	 * Trigger a change for a specific item.
	 * Does NOT trigger the collection - use triggerCollection() for that.
	 * Also notifies all property watchers for this item.
	 *
	 * @param collection - Name of the collection
	 * @param id - Item identifier
	 */
	triggerItem(collection: string, id: string | number): void {
		this.scope.triggerItem(collection, id);
	}

	/**
	 * Trigger a change for a specific property of a key.
	 * Does NOT trigger the key itself - use trigger() for that.
	 *
	 * @param key - The dependency key
	 * @param prop - The property that changed
	 */
	triggerProp(key: string, prop: string): void {
		this.scope.triggerProp(key, prop);
	}

	/**
	 * Trigger a change for a specific property of an item.
	 * Does NOT trigger the item or collection.
	 *
	 * @param collection - Name of the collection
	 * @param id - Item identifier
	 * @param prop - The property that changed
	 */
	triggerItemProp(collection: string, id: string | number, prop: string): void {
		this.scope.triggerItemProp(collection, id, prop);
	}

	/**
	 * Trigger a collection change.
	 *
	 * @param collection - Name of the collection
	 */
	triggerCollection(collection: string): void {
		this.scope.triggerList(collection);
	}

	/**
	 * Trigger for item removal: notifies item watchers, collection watchers,
	 * and cleans up the item dep.
	 *
	 * @param collection - Name of the collection
	 * @param id - Item identifier being removed
	 */
	triggerItemRemoved(collection: string, id: string | number): void {
		this.scope.triggerRemove(collection, id);
	}

	/**
	 * Trigger for item addition: notifies collection watchers.
	 *
	 * @param collection - Name of the collection
	 */
	triggerItemAdded(collection: string): void {
		this.scope.triggerList(collection);
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
		return this.scope.proxy(target, key);
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
		return this.scope.itemProxy(target, collection, id);
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
		return this.scope.deepProxy(target, key);
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
		return this.scope.deepItemProxy(target, collection, id);
	}

	// ============ READONLY PROXIES ============

	/**
	 * Create a read-only proxy that tracks property reads but throws on writes.
	 *
	 * @param target - The object to wrap
	 * @param key - The dependency key for this object
	 * @returns A read-only proxy that tracks but doesn't trigger
	 *
	 * @example
	 * ```ts
	 * getReadonlyConfig() {
	 *   this.$.track('config')
	 *   return this.$.readonlyProxy(this.config, 'config')
	 * }
	 *
	 * // Usage in effect:
	 * createEffect(() => {
	 *   console.log(store.getReadonlyConfig().theme) // Only re-runs when theme changes
	 *   store.getReadonlyConfig().theme = 'dark' // Throws: Cannot modify read-only proxy
	 * })
	 * ```
	 */
	readonlyProxy<T extends object>(target: T, key: string): Readonly<T> {
		return this.scope.readonlyProxy(target, key);
	}

	/**
	 * Create a read-only proxy for a collection item that tracks property reads
	 * but throws on writes.
	 *
	 * @param target - The object to wrap
	 * @param collection - The collection name
	 * @param id - The item id
	 * @returns A read-only proxy that tracks but doesn't trigger
	 *
	 * @example
	 * ```ts
	 * getReadonlyUser(id: string) {
	 *   this.$.trackItem('users', id)
	 *   const user = this.users.get(id)
	 *   return user ? this.$.readonlyItemProxy(user, 'users', id) : undefined
	 * }
	 *
	 * // Usage in effect:
	 * createEffect(() => {
	 *   const user = store.getReadonlyUser('1')
	 *   console.log(user?.score) // Only re-runs when score changes
	 *   user?.score = 100 // Throws: Cannot modify read-only proxy
	 * })
	 * ```
	 */
	readonlyItemProxy<T extends object>(
		target: T,
		collection: string,
		id: string | number,
	): Readonly<T> {
		return this.scope.readonlyItemProxy(target, collection, id);
	}

	/**
	 * Create a deep read-only proxy that tracks property reads at any nesting level
	 * but throws on writes. Uses dot notation for nested paths.
	 *
	 * @param target - The object to wrap
	 * @param key - The dependency key for this object
	 * @returns A deeply read-only proxied object
	 *
	 * @example
	 * ```ts
	 * getReadonlyConfig() {
	 *   this.$.track('config')
	 *   return this.$.readonlyDeepProxy(this.config, 'config')
	 * }
	 *
	 * // Nested access is tracked:
	 * createEffect(() => {
	 *   console.log(store.getReadonlyConfig().theme.colors.primary) // Tracks 'theme.colors.primary'
	 *   store.getReadonlyConfig().theme.colors.primary = '#ff0000' // Throws
	 * })
	 * ```
	 */
	readonlyDeepProxy<T extends object>(target: T, key: string): Readonly<T> {
		return this.scope.readonlyDeepProxy(target, key);
	}

	/**
	 * Create a deep read-only proxy for a collection item that tracks property reads
	 * at any nesting level but throws on writes. Uses dot notation for nested paths.
	 *
	 * @param target - The object to wrap
	 * @param collection - The collection name
	 * @param id - The item id
	 * @returns A deeply read-only proxied object
	 *
	 * @example
	 * ```ts
	 * getReadonlyUser(id: string) {
	 *   this.$.trackItem('users', id)
	 *   const user = this.users.get(id)
	 *   return user ? this.$.readonlyDeepItemProxy(user, 'users', id) : undefined
	 * }
	 *
	 * // Nested access is tracked:
	 * createEffect(() => {
	 *   const user = store.getReadonlyUser('1')
	 *   console.log(user?.stats.health) // Tracks 'stats.health'
	 *   user?.stats.health = 100 // Throws
	 * })
	 * ```
	 */
	readonlyDeepItemProxy<T extends object>(
		target: T,
		collection: string,
		id: string | number,
	): Readonly<T> {
		return this.scope.readonlyDeepItemProxy(target, collection, id);
	}

	// ============ CLEANUP ============

	/**
	 * Clear all dependencies.
	 */
	clear(): void {
		this.scope.clear();
	}
}

/**
 * Create a new Tracker instance.
 * Convenience function alternative to `new Tracker()`.
 *
 * @param options - Optional configuration including adapter
 *
 * @example
 * ```ts
 * // With adapter
 * const tracker = createTracker({ adapter: myAdapter });
 *
 * // Without adapter
 * const tracker = createTracker();
 * ```
 */
export function createTracker(options?: TrackerOptions): Tracker {
	return new Tracker(options);
}

/**
 * Options for creating a Tracker via the factory (excludes adapter since it's pre-configured).
 */
export type TrackerFactoryOptions = Omit<TrackerOptions, 'adapter'>;

/**
 * Create a factory function for creating Tracker instances with a pre-configured adapter.
 * This is useful when you want to create multiple Trackers with the same adapter
 * without repeating the adapter configuration.
 *
 * @param adapter - The reactivity adapter to use for all created Trackers
 * @returns A factory function that creates Tracker instances with the configured adapter
 *
 * @example
 * ```ts
 * import { createTrackerFactory } from 'unisig';
 * import svelteAdapter from './svelteAdapter';
 *
 * // Create the factory with your adapter
 * const createTracker = createTrackerFactory(svelteAdapter);
 *
 * // Use the factory to create Tracker instances
 * const playerTracker = createTracker();
 * const gameTracker = createTracker();
 * ```
 */
export function createTrackerFactory(
	adapter: ScopeAdapter,
): (options?: TrackerFactoryOptions) => Tracker {
	return function (options?: TrackerFactoryOptions): Tracker {
		return new Tracker({
			...options,
			adapter,
		});
	};
}
