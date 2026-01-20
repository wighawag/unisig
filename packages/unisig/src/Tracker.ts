import type {ReactivityAdapter, Dependency, ErrorHandler, Listener} from './types.js';
import {
	Emitter,
	type Unsubscribe,
	type EmitterOptions,
} from './Emitter.js';
import {Scope} from './Scope.js';

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
 *   private $ = new Tracker<MyEvents>()
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
export class Tracker<
	Events extends Record<string, unknown> = Record<string, unknown>,
> {
	private scope: Scope;
	private emitter: Emitter<Events>;

	/**
	 * Create a new Tracker instance.
	 *
	 * @param adapterOrOptions - Optional reactivity adapter, or options object with adapter and error handler
	 *
	 * @example
	 * ```ts
	 * // With adapter only (backward compatible)
	 * const tracker = new Tracker<MyEvents>(adapter);
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
	constructor(adapterOrOptions?: ReactivityAdapter | TrackerOptions<Events>) {
		const isOptions =
			typeof adapterOrOptions === 'object' &&
			adapterOrOptions !== null &&
			!('create' in adapterOrOptions); // Check if it's an adapter (has create method)

		const adapter = isOptions
			? (adapterOrOptions as TrackerOptions<Events>).adapter
			: adapterOrOptions;
		const errorHandler = isOptions
			? (adapterOrOptions as TrackerOptions<Events>).errorHandler
			: undefined;

		this.scope = new Scope(adapter);
		this.emitter = new Emitter<Events>(
			errorHandler ? {errorHandler} : undefined,
		);
	}

	/**
	 * Set or change the reactivity adapter.
	 * Existing dependencies are not affected.
	 *
	 * @param adapter - The reactivity adapter to use
	 */
	setAdapter(adapter: ReactivityAdapter): void {
		this.scope.setAdapter(adapter);
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

	// ============ DEPENDENCY ACCESS ============

	/**
	 * Get or create a dependency by key.
	 * Returns null if no adapter is set.
	 */
	dep(key: string): Dependency | null {
		return this.scope.dep(key);
	}

	/**
	 * Get or create a per-item dependency.
	 * Returns null if no adapter is set.
	 */
	itemDep(collection: string, id: string | number): Dependency | null {
		return this.scope.itemDep(collection, id);
	}

	/**
	 * Get or create a property dependency for a key.
	 * Returns null if no adapter is set.
	 */
	propDep(key: string, prop: string): Dependency | null {
		return this.scope.propDep(key, prop);
	}

	/**
	 * Get or create a property dependency for a specific item.
	 * Returns null if no adapter is set.
	 */
	itemPropDep(
		collection: string,
		id: string | number,
		prop: string,
	): Dependency | null {
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
	trigger<K extends keyof Events>(
		key: string,
		event: K,
		data: Events[K],
	): void;
	trigger(key: string, event?: unknown, data?: unknown): void {
		this.scope.trigger(key);
		if (arguments.length === 3) {
			this.emitter.emit(event as keyof Events, data as Events[keyof Events]);
		}
	}

	/**
	 * Trigger a change for a specific item and optionally emit an event.
	 * Does NOT trigger the collection - use triggerList() for that.
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
	triggerProp(key: string, prop: string, event?: unknown, data?: unknown): void {
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
	 * Trigger a list change and optionally emit an event.
	 *
	 * @param collection - Name of the collection
	 * @param event - Event to emit (must provide data with this)
	 * @param data - Event data (required when event is provided)
	 */
	triggerList(collection: string): void;
	triggerList<K extends keyof Events>(
		collection: string,
		event: K,
		data: Events[K],
	): void;
	triggerList(collection: string, event?: unknown, data?: unknown): void {
		this.scope.triggerList(collection);
		if (arguments.length === 3) {
			this.emitter.emit(event as keyof Events, data as Events[keyof Events]);
		}
	}

	/**
	 * Trigger for item removal: notifies item watchers, list watchers,
	 * cleans up the item dep, and optionally emits an event.
	 *
	 * @param collection - Name of the collection
	 * @param id - Item identifier being removed
	 * @param event - Event to emit (must provide data with this)
	 * @param data - Event data (required when event is provided)
	 */
	triggerRemove(collection: string, id: string | number): void;
	triggerRemove<K extends keyof Events>(
		collection: string,
		id: string | number,
		event: K,
		data: Events[K],
	): void;
	triggerRemove(
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
	 * Trigger for item addition: notifies list watchers and optionally emits an event.
	 *
	 * @param collection - Name of the collection
	 * @param event - Event to emit (must provide data with this)
	 * @param data - Event data (required when event is provided)
	 */
	triggerAdd(collection: string): void;
	triggerAdd<K extends keyof Events>(
		collection: string,
		event: K,
		data: Events[K],
	): void;
	triggerAdd(collection: string, event?: unknown, data?: unknown): void {
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
 * @param adapterOrOptions - Optional reactivity adapter, or options object with adapter and error handler
 *
 * @example
 * ```ts
 * // With adapter only
 * const tracker = tracker<MyEvents>(adapter);
 *
 * // With error handler
 * const tracker = tracker<MyEvents>({
 *   adapter: myAdapter,
 *   errorHandler: (event, error, listener) => {
 *     console.error(`Error in ${String(event)}:`, error);
 *   },
 * });
 * ```
 */
export function tracker<
	Events extends Record<string, unknown> = Record<string, unknown>,
>(
	adapterOrOptions?: ReactivityAdapter | TrackerOptions<Events>,
): Tracker<Events> {
	return new Tracker<Events>(adapterOrOptions);
}
