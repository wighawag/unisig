import type {
	ReactivityAdapter,
	Dependency,
	ErrorHandler,
	Listener,
} from 'unisig';
import {Scope} from 'unisig';
import {Emitter, type Unsubscribe, type EmitterOptions} from './Emitter.js';

/**
 * Options for configuring Tracker behavior
 */
export interface TrackerOptions<Events> {
	/**
	 * Optional reactivity adapter to use immediately
	 */
	adapter?: ReactivityAdapter;

	/**
	 * Optional error handler for event listener errors.
	 * If provided, errors in listeners will be caught and passed to this handler.
	 * If not provided, errors will propagate to the caller (fail-fast).
	 *
	 * @param event - The event being emitted
	 * @param error - The error that occurred
	 * @param listener - The listener function that threw the error
	 *
	 * @example
	 * ```ts
	 * const tracker = new Tracker<MyEvents>({
	 *   adapter: myAdapter,
	 *   errorHandler: (event, error, listener) => {
	 *     console.error(`Error in ${String(event)}:`, error);
	 *     Sentry.captureException(error);
	 *   },
	 * });
	 * ```
	 */
	errorHandler?: ErrorHandler<Events>;
}

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
 *   private $ = new Tracker<MyEvents>({ adapter: myAdapter })
 *   private users = new Map<string, User>()
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
 *     this.$.triggerItemRemoved('users', id, 'user:removed', id)
 *   }
 * }
 * ```
 */
export class Tracker<
	Events extends Record<string, unknown> = Record<string, unknown>,
> {
	private scope: Scope;
	private emitter: Emitter<Events>;

	/**
	 * Create a new Tracker instance.
	 *
	 * @param options - Optional configuration including adapter and error handler
	 *
	 * @example
	 * ```ts
	 * // With adapter
	 * const tracker = new Tracker<MyEvents>({ adapter: myAdapter });
	 *
	 * // With error handler
	 * const tracker = new Tracker<MyEvents>({
	 *   adapter: myAdapter,
	 *   errorHandler: (event, error, listener) => {
	 *     console.error(`Error in ${String(event)}:`, error);
	 *   },
	 * });
	 *
	 * // With error handler only (no adapter)
	 * const tracker = new Tracker<MyEvents>({
	 *   errorHandler: (event, error, listener) => {
	 *     console.error(`Error in ${String(event)}:`, error);
	 *   },
	 * });
	 * ```
	 */
	constructor(options?: TrackerOptions<Events>) {
		const {adapter, errorHandler} = options || {};
		this.scope = new Scope(adapter);
		this.emitter = new Emitter<Events>(
			errorHandler ? {errorHandler} : undefined,
		);
	}

	/**
	 * Get the current adapter, if any.
	 */
	getAdapter(): ReactivityAdapter | undefined {
		return this.scope.getAdapter();
	}

	/**
	 * Check if currently inside a reactive scope.
	 */
	isInScope(): boolean {
		return this.scope.isInScope();
	}

	// ============ EVENT METHODS ============

	/**
	 * Subscribe to an event.
	 *
	 * @param event - Event name to listen for
	 * @param listener - Callback function
	 * @returns Unsubscribe function
	 */
	on<K extends keyof Events>(
		event: K,
		listener: Listener<Events[K]>,
	): Unsubscribe {
		return this.emitter.on(event, listener);
	}

	/**
	 * Unsubscribe from an event.
	 *
	 * @param event - Event name
	 * @param listener - The exact listener function to remove
	 */
	off<K extends keyof Events>(event: K, listener: Listener<Events[K]>): void {
		this.emitter.off(event, listener);
	}

	/**
	 * Subscribe to an event for a single emission.
	 *
	 * @param event - Event name
	 * @param listener - Callback function (called once)
	 * @returns Unsubscribe function
	 */
	once<K extends keyof Events>(
		event: K,
		listener: Listener<Events[K]>,
	): Unsubscribe {
		return this.emitter.once(event, listener);
	}

	/**
	 * Create a subscription function for an event that calls the listener
	 * immediately with the current value, then subscribes for future emissions.
	 *
	 * This factory pattern is useful for value-like events where subscribers
	 * want to receive the current state immediately upon subscription.
	 * Not all events have a concept of "current value", so this is opt-in
	 * per event type.
	 *
	 * @param event - Event name to create subscription for
	 * @param getCurrentValue - Function that returns the current value
	 * @returns A subscription function that accepts a listener
	 *
	 * @example
	 * ```ts
	 * class Store {
	 *   private $ = new Tracker<{ 'count:changed': number }>()
	 *   private count = 0
	 *
	 *   // Create subscription function once
	 *   subscribe = this.$.createSubscription('count:changed', () => this.count)
	 *
	 *   increment() {
	 *     this.count++
	 *     this.$.emit('count:changed', this.count)
	 *   }
	 * }
	 *
	 * // Subscriber receives current value immediately
	 * store.subscribe((count) => console.log('Count:', count))
	 * // Logs: "Count: 0" immediately upon subscription
	 * ```
	 */
	createSubscription<K extends keyof Events>(
		event: K,
		getCurrentValue: () => Events[K],
	): (listener: Listener<Events[K]>) => Unsubscribe {
		return (listener: Listener<Events[K]>): Unsubscribe => {
			// Call listener immediately with current value
			listener(getCurrentValue());
			// Then subscribe for future events
			return this.on(event, listener);
		};
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
	itemPropDep(
		collection: string,
		id: string | number,
		prop: string,
	): Dependency | undefined {
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
	 * Trigger a change notification and optionally emit an event.
	 *
	 * @param key - The dependency key that changed
	 * @param event - Event to emit (must provide data with this)
	 * @param data - Event data (required when event is provided)
	 */
	trigger(key: string): void;
	trigger<K extends keyof Events>(key: string, event: K, data: Events[K]): void;
	trigger(key: string, event?: unknown, data?: unknown): void {
		this.scope.trigger(key);
		if (arguments.length === 3) {
			this.emitter.emit(event as keyof Events, data as Events[keyof Events]);
		}
	}

	/**
	 * Trigger a change for a specific item and optionally emit an event.
	 * Does NOT trigger the collection - use triggerCollection() for that.
	 * Also notifies all property watchers for this item.
	 *
	 * @param collection - Name of the collection
	 * @param id - Item identifier
	 * @param event - Event to emit (must provide data with this)
	 * @param data - Event data (required when event is provided)
	 */
	triggerItem(collection: string, id: string | number): void;
	triggerItem<K extends keyof Events>(
		collection: string,
		id: string | number,
		event: K,
		data: Events[K],
	): void;
	triggerItem(
		collection: string,
		id: string | number,
		event?: unknown,
		data?: unknown,
	): void {
		this.scope.triggerItem(collection, id);
		if (arguments.length === 4) {
			this.emitter.emit(event as keyof Events, data as Events[keyof Events]);
		}
	}

	/**
	 * Trigger a change for a specific property of a key and optionally emit an event.
	 * Does NOT trigger the key itself - use trigger() for that.
	 *
	 * @param key - The dependency key
	 * @param prop - The property that changed
	 * @param event - Event to emit (must provide data with this)
	 * @param data - Event data (required when event is provided)
	 */
	triggerProp(key: string, prop: string): void;
	triggerProp<K extends keyof Events>(
		key: string,
		prop: string,
		event: K,
		data: Events[K],
	): void;
	triggerProp(
		key: string,
		prop: string,
		event?: unknown,
		data?: unknown,
	): void {
		this.scope.triggerProp(key, prop);
		if (arguments.length === 4) {
			this.emitter.emit(event as keyof Events, data as Events[keyof Events]);
		}
	}

	/**
	 * Trigger a change for a specific property of an item and optionally emit an event.
	 * Does NOT trigger the item or collection.
	 *
	 * @param collection - Name of the collection
	 * @param id - Item identifier
	 * @param prop - The property that changed
	 * @param event - Event to emit (must provide data with this)
	 * @param data - Event data (required when event is provided)
	 */
	triggerItemProp(collection: string, id: string | number, prop: string): void;
	triggerItemProp<K extends keyof Events>(
		collection: string,
		id: string | number,
		prop: string,
		event: K,
		data: Events[K],
	): void;
	triggerItemProp(
		collection: string,
		id: string | number,
		prop: string,
		event?: unknown,
		data?: unknown,
	): void {
		this.scope.triggerItemProp(collection, id, prop);
		if (arguments.length === 5) {
			this.emitter.emit(event as keyof Events, data as Events[keyof Events]);
		}
	}

	/**
	 * Trigger a collection change and optionally emit an event.
	 *
	 * @param collection - Name of the collection
	 * @param event - Event to emit (must provide data with this)
	 * @param data - Event data (required when event is provided)
	 */
	triggerCollection(collection: string): void;
	triggerCollection<K extends keyof Events>(
		collection: string,
		event: K,
		data: Events[K],
	): void;
	triggerCollection(collection: string, event?: unknown, data?: unknown): void {
		this.scope.triggerList(collection);
		if (arguments.length === 3) {
			this.emitter.emit(event as keyof Events, data as Events[keyof Events]);
		}
	}

	/**
	 * Trigger for item removal: notifies item watchers, collection watchers,
	 * cleans up the item dep, and optionally emits an event.
	 *
	 * @param collection - Name of the collection
	 * @param id - Item identifier being removed
	 * @param event - Event to emit (must provide data with this)
	 * @param data - Event data (required when event is provided)
	 */
	triggerItemRemoved(collection: string, id: string | number): void;
	triggerItemRemoved<K extends keyof Events>(
		collection: string,
		id: string | number,
		event: K,
		data: Events[K],
	): void;
	triggerItemRemoved(
		collection: string,
		id: string | number,
		event?: unknown,
		data?: unknown,
	): void {
		this.scope.triggerRemove(collection, id);
		if (arguments.length === 4) {
			this.emitter.emit(event as keyof Events, data as Events[keyof Events]);
		}
	}

	/**
	 * Trigger for item addition: notifies collection watchers and optionally emits an event.
	 *
	 * @param collection - Name of the collection
	 * @param event - Event to emit (must provide data with this)
	 * @param data - Event data (required when event is provided)
	 */
	triggerItemAdded(collection: string): void;
	triggerItemAdded<K extends keyof Events>(
		collection: string,
		event: K,
		data: Events[K],
	): void;
	triggerItemAdded(collection: string, event?: unknown, data?: unknown): void {
		this.scope.triggerList(collection);
		if (arguments.length === 3) {
			this.emitter.emit(event as keyof Events, data as Events[keyof Events]);
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
		this.emitter.emit(event, data);
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
	itemProxy<T extends object>(
		target: T,
		collection: string,
		id: string | number,
	): T {
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
	deepItemProxy<T extends object>(
		target: T,
		collection: string,
		id: string | number,
	): T {
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
	 * Events are not affected.
	 */
	clear(): void {
		this.scope.clear();
	}
}

/**
 * Create a new Tracker instance.
 * Convenience function alternative to `new Tracker()`.
 *
 * @param options - Optional configuration including adapter and error handler
 *
 * @example
 * ```ts
 * // With adapter
 * const tracker = createTracker<MyEvents>({ adapter: myAdapter });
 *
 * // With error handler
 * const tracker = createTracker<MyEvents>({
 *   adapter: myAdapter,
 *   errorHandler: (event, error, listener) => {
 *     console.error(`Error in ${String(event)}:`, error);
 *   },
 * });
 *
 * // With error handler only (no adapter)
 * const tracker = createTracker<MyEvents>({
 *   errorHandler: (event, error, listener) => {
 *     console.error(`Error in ${String(event)}:`, error);
 *   },
 * });
 * ```
 */
export function createTracker<
	Events extends Record<string, unknown> = Record<string, unknown>,
>(options?: TrackerOptions<Events>): Tracker<Events> {
	return new Tracker<Events>(options);
}

/**
 * Options for creating a Tracker via the factory (excludes adapter since it's pre-configured).
 */
export type TrackerFactoryOptions<Events> = Omit<
	TrackerOptions<Events>,
	'adapter'
>;

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
 * // Use the factory to create typed Tracker instances
 * type PlayerEvents = {
 *   'score:changed': number;
 *   'name:changed': string;
 * };
 *
 * type GameEvents = {
 *   'started': void;
 *   'ended': { winner: string };
 * };
 *
 * const playerTracker = createTracker<PlayerEvents>();
 * const gameTracker = createTracker<GameEvents>();
 *
 * // You can still pass additional options like errorHandler
 * const trackerWithErrorHandling = createTracker<PlayerEvents>({
 *   errorHandler: (event, error) => console.error(`Error in ${String(event)}:`, error),
 * });
 * ```
 */
export function createTrackerFactory(
	adapter: ReactivityAdapter,
): <Events extends Record<string, unknown> = Record<string, unknown>>(
	options?: TrackerFactoryOptions<Events>,
) => Tracker<Events> {
	return function <
		Events extends Record<string, unknown> = Record<string, unknown>,
	>(options?: TrackerFactoryOptions<Events>): Tracker<Events> {
		return new Tracker<Events>({
			...options,
			adapter,
		});
	};
}
