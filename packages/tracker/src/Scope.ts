import type {Dependency, ScopeAdapter} from './types.js';
import {createProxyFactory, type ProxyFactory} from './ProxyFactory.js';

/**
 * Manages reactive dependencies for a class or object.
 *
 * Provides methods to track reads and trigger notifications for both
 * simple key-based dependencies and granular per-item dependencies.
 * Also supports property-level tracking and auto-tracking proxies.
 *
 * @example
 * ```ts
 * class MyStore {
 *   private scope = new Scope(myAdapter)
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
	private adapter?: ScopeAdapter;
	private deps = new Map<string, Dependency>();
	private itemDeps = new Map<string, Map<string | number, Dependency>>();
	private propDeps = new Map<string, Map<string, Dependency>>();
	private itemPropDeps = new Map<
		string,
		Map<string | number, Map<string, Dependency>>
	>();
	private proxyFactory: ProxyFactory;

	/**
	 * Create a new Scope, optionally with an adapter.
	 *
	 * @param adapter - Optional reactivity adapter to use
	 */
	constructor(adapter?: ScopeAdapter) {
		this.adapter = adapter;
		this.proxyFactory = createProxyFactory(this);
	}

	/**
	 * Get the current adapter, if any.
	 */
	getAdapter(): ScopeAdapter | undefined {
		return this.adapter;
	}

	/**
	 * Check if currently inside a reactive scope.
	 * Returns false if no adapter is set.
	 */
	isInScope(): boolean {
		if (!this.adapter) return false;
		if (!this.adapter.isInScope) return true;
		return this.adapter.isInScope();
	}

	/**
	 * Get or create a dependency by key.
	 * Returns undefined if no adapter is set.
	 *
	 * @param key - Unique key for this dependency
	 */
	dep(key: string): Dependency | undefined {
		if (!this.adapter) return undefined;
		if (!this.deps.has(key)) {
			this.deps.set(key, this.adapter.create());
		}
		return this.deps.get(key)!;
	}

	/**
	 * Get or create a per-item dependency.
	 * Useful for granular updates (e.g., only re-render when a specific item changes).
	 * Returns undefined if no adapter is set.
	 *
	 * @param collection - Name of the collection/group
	 * @param id - Unique identifier of the item
	 */
	itemDep(collection: string, id: string | number): Dependency | undefined {
		if (!this.adapter) return undefined;
		if (!this.itemDeps.has(collection)) {
			this.itemDeps.set(collection, new Map());
		}
		const map = this.itemDeps.get(collection)!;
		if (!map.has(id)) {
			map.set(id, this.adapter.create());
		}
		return map.get(id)!;
	}

	/**
	 * Remove a per-item dependency.
	 * Call this when an item is removed to clean up.
	 *
	 * @param collection - Name of the collection/group
	 * @param id - Unique identifier of the item
	 */
	removeItemDep(collection: string, id: string | number): void {
		this.itemDeps.get(collection)?.delete(id);
		// Also clean up any property deps for this item
		this.itemPropDeps.get(collection)?.delete(id);
	}

	/**
	 * Get or create a property dependency for a key.
	 * Useful for granular updates (e.g., only re-render when a specific property changes).
	 * Returns undefined if no adapter is set.
	 *
	 * @param key - The main key
	 * @param prop - The property name
	 */
	propDep(key: string, prop: string): Dependency | undefined {
		if (!this.adapter) return undefined;
		if (!this.propDeps.has(key)) {
			this.propDeps.set(key, new Map());
		}
		const map = this.propDeps.get(key)!;
		if (!map.has(prop)) {
			map.set(prop, this.adapter.create());
		}
		return map.get(prop)!;
	}

	/**
	 * Get or create a property dependency for a specific item.
	 * Useful for very granular updates (e.g., only re-render when user.score changes).
	 * Returns undefined if no adapter is set.
	 *
	 * @param collection - Name of the collection/group
	 * @param id - Unique identifier of the item
	 * @param prop - The property name
	 */
	itemPropDep(
		collection: string,
		id: string | number,
		prop: string,
	): Dependency | undefined {
		if (!this.adapter) return undefined;
		if (!this.itemPropDeps.has(collection)) {
			this.itemPropDeps.set(collection, new Map());
		}
		const collectionMap = this.itemPropDeps.get(collection)!;
		if (!collectionMap.has(id)) {
			collectionMap.set(id, new Map());
		}
		const propMap = collectionMap.get(id)!;
		if (!propMap.has(prop)) {
			propMap.set(prop, this.adapter.create());
		}
		return propMap.get(prop)!;
	}

	/**
	 * Check if a per-item dependency exists.
	 *
	 * @param collection - Name of the collection/group
	 * @param id - Unique identifier of the item
	 */
	hasItemDep(collection: string, id: string | number): boolean {
		return this.itemDeps.get(collection)?.has(id) ?? false;
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
			this.dep(key)?.depend();
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
			this.itemDep(collection, id)?.depend();
			// Also track the collection so removal can be detected
			this.dep(collection)?.depend();
		}
	}

	/**
	 * Track a read operation for a specific property of a key.
	 * Also tracks the key itself.
	 *
	 * @param key - The main key
	 * @param prop - The property name
	 *
	 * @example
	 * ```ts
	 * getConfig(prop: string) {
	 *   this.scope.trackProp('config', prop)
	 *   return this.config[prop]
	 * }
	 * ```
	 */
	trackProp(key: string, prop: string): void {
		if (this.isInScope()) {
			this.propDep(key, prop)?.depend();
			// Also track the key so complete replacement can be detected
			this.dep(key)?.depend();
		}
	}

	/**
	 * Track a read operation for a specific property of an item.
	 * Also tracks the item and collection.
	 *
	 * @param collection - Name of the collection/group
	 * @param id - Unique identifier of the item
	 * @param prop - The property name
	 *
	 * @example
	 * ```ts
	 * getUserScore(id: string) {
	 *   this.scope.trackItemProp('users', id, 'score')
	 *   return this.users.get(id)?.score
	 * }
	 * ```
	 */
	trackItemProp(collection: string, id: string | number, prop: string): void {
		if (this.isInScope()) {
			this.itemPropDep(collection, id, prop)?.depend();
			// Also track the item so complete replacement can be detected
			this.itemDep(collection, id)?.depend();
			// Also track the collection so removal can be detected
			this.dep(collection)?.depend();
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
		this.dep(key)?.notify();
	}

	/**
	 * Notify that a specific item has changed.
	 * Does NOT notify the collection - use triggerList() for that.
	 * Also notifies all property watchers for this item.
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
		this.itemDep(collection, id)?.notify();
		// Also notify all property watchers
		const propMap = this.itemPropDeps.get(collection)?.get(id);
		if (propMap) {
			for (const dep of propMap.values()) {
				dep.notify();
			}
		}
	}

	/**
	 * Notify that a specific property of a key has changed.
	 * Does NOT notify the key itself - use trigger() for that.
	 *
	 * @param key - The main key
	 * @param prop - The property that changed
	 *
	 * @example
	 * ```ts
	 * setConfigValue(prop: string, value: unknown) {
	 *   this.config[prop] = value
	 *   this.scope.triggerProp('config', prop)
	 * }
	 * ```
	 */
	triggerProp(key: string, prop: string): void {
		this.propDep(key, prop)?.notify();
	}

	/**
	 * Notify that a specific property of an item has changed.
	 * Does NOT notify the item or collection - use triggerItem() for that.
	 *
	 * @param collection - Name of the collection/group
	 * @param id - Unique identifier of the item
	 * @param prop - The property that changed
	 *
	 * @example
	 * ```ts
	 * updateUserScore(id: string, score: number) {
	 *   this.users.get(id).score = score
	 *   this.scope.triggerItemProp('users', id, 'score')
	 * }
	 * ```
	 */
	triggerItemProp(collection: string, id: string | number, prop: string): void {
		this.itemPropDep(collection, id, prop)?.notify();
	}

	/**
	 * Notify that a collection/list has changed.
	 * Use this for add/remove operations.
	 *
	 * @param collection - Name of the collection
	 */
	triggerList(collection: string): void {
		this.dep(collection)?.notify();
	}

	/**
	 * Notify item change, list change, and cleanup item dep.
	 * Use this when removing an item.
	 *
	 * @param collection - Name of the collection
	 * @param id - Unique identifier of the removed item
	 */
	triggerRemove(collection: string, id: string | number): void {
		this.triggerItem(collection, id);
		this.triggerList(collection);
		this.removeItemDep(collection, id);
	}

	/**
	 * Clear all dependencies.
	 * Useful for cleanup/disposal.
	 */
	clear(): void {
		this.deps.clear();
		this.itemDeps.clear();
		this.propDeps.clear();
		this.itemPropDeps.clear();
	}

	// ============ AUTO-TRACKING PROXIES ============
	// These methods delegate to ProxyFactory for cleaner separation of concerns.
	// Item proxies always use custom implementation to maintain collection/item context.
	// Non-item proxies may use adapter.reactive() when available for better performance.

	/**
	 * Create a proxy that auto-tracks property reads and auto-triggers property writes.
	 *
	 * If the adapter provides a `reactive()` method, it will be used for better performance.
	 * Otherwise, falls back to a custom proxy implementation.
	 *
	 * @param target - The object to wrap
	 * @param key - The dependency key for this object
	 * @returns A proxy that automatically tracks/triggers
	 *
	 * @example
	 * ```ts
	 * getConfig() {
	 *   this.scope.track('config')
	 *   return this.scope.proxy(this.config, 'config')
	 * }
	 *
	 * // Usage in effect:
	 * createEffect(() => {
	 *   console.log(store.getConfig().theme) // Only re-runs when theme changes
	 * })
	 * ```
	 */
	proxy<T extends object>(target: T, key: string): T {
		return this.proxyFactory.proxy(target, key);
	}

	/**
	 * Create a proxy for a collection item that auto-tracks property reads
	 * and auto-triggers property writes.
	 *
	 * Always uses custom proxy implementation to ensure proper integration
	 * with Scope's granular tracking (collection/item/property levels).
	 *
	 * @param target - The object to wrap
	 * @param collection - The collection name
	 * @param id - The item id
	 * @returns A proxy that automatically tracks/triggers
	 *
	 * @example
	 * ```ts
	 * getUser(id: string) {
	 *   this.scope.trackItem('users', id)
	 *   const user = this.users.get(id)
	 *   return user ? this.scope.itemProxy(user, 'users', id) : undefined
	 * }
	 *
	 * // Usage in effect:
	 * createEffect(() => {
	 *   const user = store.getUser('1')
	 *   console.log(user?.score) // Only re-runs when score changes
	 * })
	 * ```
	 */
	itemProxy<T extends object>(
		target: T,
		collection: string,
		id: string | number,
	): T {
		return this.proxyFactory.itemProxy(target, collection, id);
	}

	/**
	 * Create a deep proxy that auto-tracks property reads at any nesting level.
	 * Uses dot notation for nested paths (e.g., 'stats.health').
	 *
	 * If the adapter provides a `reactive()` method, it will be used for better performance.
	 * Otherwise, falls back to a custom proxy implementation.
	 *
	 * @param target - The object to wrap
	 * @param key - The dependency key for this object
	 * @returns A deeply proxied object
	 *
	 * @example
	 * ```ts
	 * getConfig() {
	 *   this.scope.track('config')
	 *   return this.scope.deepProxy(this.config, 'config')
	 * }
	 *
	 * // Nested access is tracked:
	 * createEffect(() => {
	 *   console.log(store.getConfig().theme.colors.primary) // Tracks 'theme.colors.primary'
	 * })
	 * ```
	 */
	deepProxy<T extends object>(target: T, key: string): T {
		return this.proxyFactory.deepProxy(target, key);
	}

	/**
	 * Create a deep proxy for a collection item that auto-tracks property reads
	 * at any nesting level. Uses dot notation for nested paths.
	 *
	 * Always uses custom proxy implementation to ensure proper integration
	 * with Scope's granular tracking (collection/item/property levels).
	 *
	 * @param target - The object to wrap
	 * @param collection - The collection name
	 * @param id - The item id
	 * @returns A deeply proxied object
	 *
	 * @example
	 * ```ts
	 * getUser(id: string) {
	 *   this.scope.trackItem('users', id)
	 *   const user = this.users.get(id)
	 *   return user ? this.scope.deepItemProxy(user, 'users', id) : undefined
	 * }
	 *
	 * // Nested access is tracked:
	 * createEffect(() => {
	 *   const user = store.getUser('1')
	 *   console.log(user?.stats.health) // Tracks 'stats.health'
	 * })
	 * ```
	 */
	deepItemProxy<T extends object>(
		target: T,
		collection: string,
		id: string | number,
	): T {
		return this.proxyFactory.deepItemProxy(target, collection, id);
	}

	// ============ READONLY PROXIES ============

	/**
	 * Create a read-only proxy that tracks property reads but throws on writes.
	 *
	 * Note: Read-only proxies always use the custom proxy implementation
	 * since adapter.reactive() doesn't provide read-only semantics.
	 *
	 * @param target - The object to wrap
	 * @param key - The dependency key for this object
	 * @returns A read-only proxy that tracks but doesn't trigger
	 *
	 * @example
	 * ```ts
	 * getReadonlyConfig() {
	 *   this.scope.track('config')
	 *   return this.scope.readonlyProxy(this.config, 'config')
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
		return this.proxyFactory.readonlyProxy(target, key);
	}

	/**
	 * Create a read-only proxy for a collection item that tracks property reads
	 * but throws on writes.
	 *
	 * Note: Read-only proxies always use the custom proxy implementation
	 * since adapter.reactive() doesn't provide read-only semantics.
	 *
	 * @param target - The object to wrap
	 * @param collection - The collection name
	 * @param id - The item id
	 * @returns A read-only proxy that tracks but doesn't trigger
	 *
	 * @example
	 * ```ts
	 * getReadonlyUser(id: string) {
	 *   this.scope.trackItem('users', id)
	 *   const user = this.users.get(id)
	 *   return user ? this.scope.readonlyItemProxy(user, 'users', id) : undefined
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
		return this.proxyFactory.readonlyItemProxy(target, collection, id);
	}

	/**
	 * Create a deep read-only proxy that tracks property reads at any nesting level
	 * but throws on writes. Uses dot notation for nested paths.
	 *
	 * Note: Read-only proxies always use the custom proxy implementation
	 * since adapter.reactive() doesn't provide read-only semantics.
	 *
	 * @param target - The object to wrap
	 * @param key - The dependency key for this object
	 * @returns A deeply read-only proxied object
	 *
	 * @example
	 * ```ts
	 * getReadonlyConfig() {
	 *   this.scope.track('config')
	 *   return this.scope.readonlyDeepProxy(this.config, 'config')
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
		return this.proxyFactory.readonlyDeepProxy(target, key);
	}

	/**
	 * Create a deep read-only proxy for a collection item that tracks property reads
	 * at any nesting level but throws on writes. Uses dot notation for nested paths.
	 *
	 * Note: Read-only proxies always use the custom proxy implementation
	 * since adapter.reactive() doesn't provide read-only semantics.
	 *
	 * @param target - The object to wrap
	 * @param collection - The collection name
	 * @param id - The item id
	 * @returns A deeply read-only proxied object
	 *
	 * @example
	 * ```ts
	 * getReadonlyUser(id: string) {
	 *   this.scope.trackItem('users', id)
	 *   const user = this.users.get(id)
	 *   return user ? this.scope.readonlyDeepItemProxy(user, 'users', id) : undefined
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
		return this.proxyFactory.readonlyDeepItemProxy(target, collection, id);
	}
}
