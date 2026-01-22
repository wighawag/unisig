import type {Scope} from './Scope.js';
import type {ScopeAdapter} from './types.js';

/**
 * Types that should not be proxied (they have special internal state)
 */
const SKIP_PROXY_TYPES = [Date, RegExp, Map, Set, WeakMap, WeakSet, Error];

/**
 * Check if a value should be deeply proxied
 */
function shouldDeepProxy(value: unknown): value is object {
	if (value === null || typeof value !== 'object') return false;
	if (SKIP_PROXY_TYPES.some((Type) => value instanceof Type)) return false;
	// Skip if it's a promise-like object
	if (typeof (value as any).then === 'function') return false;
	return true;
}

/**
 * Interface for proxy factory methods
 */
export interface ProxyFactory {
	/**
	 * Create a proxy that auto-tracks property reads and auto-triggers property writes.
	 *
	 * If the adapter provides a `reactive()` method, it will be used for better performance.
	 * Otherwise, falls back to a custom proxy implementation.
	 */
	proxy<T extends object>(target: T, key: string): T;

	/**
	 * Create a proxy for a collection item that auto-tracks property reads
	 * and auto-triggers property writes.
	 *
	 * Always uses custom proxy implementation to ensure proper integration
	 * with Scope's granular tracking (collection/item/property levels).
	 */
	itemProxy<T extends object>(
		target: T,
		collection: string,
		id: string | number,
	): T;

	/**
	 * Create a deep proxy that auto-tracks property reads at any nesting level.
	 * Uses dot notation for nested paths (e.g., 'stats.health').
	 *
	 * If the adapter provides a `reactive()` method, it will be used for better performance.
	 * Otherwise, falls back to a custom proxy implementation.
	 */
	deepProxy<T extends object>(target: T, key: string): T;

	/**
	 * Create a deep proxy for a collection item that auto-tracks property reads
	 * at any nesting level. Uses dot notation for nested paths.
	 *
	 * Always uses custom proxy implementation to ensure proper integration
	 * with Scope's granular tracking (collection/item/property levels).
	 */
	deepItemProxy<T extends object>(
		target: T,
		collection: string,
		id: string | number,
	): T;

	/**
	 * Create a read-only proxy that tracks property reads but throws on writes.
	 */
	readonlyProxy<T extends object>(target: T, key: string): Readonly<T>;

	/**
	 * Create a read-only proxy for a collection item that tracks property reads
	 * but throws on writes.
	 */
	readonlyItemProxy<T extends object>(
		target: T,
		collection: string,
		id: string | number,
	): Readonly<T>;

	/**
	 * Create a deep read-only proxy that tracks property reads at any nesting level
	 * but throws on writes.
	 */
	readonlyDeepProxy<T extends object>(target: T, key: string): Readonly<T>;

	/**
	 * Create a deep read-only proxy for a collection item that tracks property reads
	 * at any nesting level but throws on writes.
	 */
	readonlyDeepItemProxy<T extends object>(
		target: T,
		collection: string,
		id: string | number,
	): Readonly<T>;
}

/**
 * Create a proxy factory bound to a specific Scope instance.
 *
 * @param scope - The Scope instance to bind to
 * @returns An object containing all proxy factory methods
 *
 * @example
 * ```ts
 * const scope = new Scope(adapter);
 * const proxies = createProxyFactory(scope);
 *
 * // Use the factory methods
 * const proxiedConfig = proxies.deepProxy(config, 'config');
 * const proxiedUser = proxies.deepItemProxy(user, 'users', user.id);
 * ```
 */
export function createProxyFactory(scope: Scope): ProxyFactory {
	const adapter = scope.getAdapter();

	// ============ DEEP PROXY HELPERS ============

	function createDeepProxy<T extends object>(
		target: T,
		key: string,
		basePath: string,
		cache: WeakMap<object, object>,
	): T {
		// Return cached proxy if exists (maintains identity)
		if (cache.has(target)) {
			return cache.get(target) as T;
		}

		const proxy = new Proxy(target, {
			get(obj, prop, receiver) {
				const value = Reflect.get(obj, prop, receiver);

				// Only track string properties (not symbols)
				if (typeof prop === 'string') {
					const fullPath = basePath ? `${basePath}.${prop}` : prop;
					scope.trackProp(key, fullPath);

					// Recursively proxy nested objects
					if (shouldDeepProxy(value)) {
						return createDeepProxy(value, key, fullPath, cache);
					}

					// Handle arrays specially
					if (Array.isArray(value)) {
						return createDeepArrayProxy(
							value,
							key,
							'',
							fullPath,
							cache,
							'prop',
						);
					}
				}

				return value;
			},

			set(obj, prop, value, receiver) {
				const result = Reflect.set(obj, prop, value, receiver);

				if (typeof prop === 'string') {
					const fullPath = basePath ? `${basePath}.${prop}` : prop;
					scope.triggerProp(key, fullPath);
				}

				return result;
			},
		});

		cache.set(target, proxy);
		return proxy as T;
	}

	function createDeepItemProxy<T extends object>(
		target: T,
		collection: string,
		id: string | number,
		basePath: string,
		cache: WeakMap<object, object>,
	): T {
		// Return cached proxy if exists (maintains identity)
		if (cache.has(target)) {
			return cache.get(target) as T;
		}

		const proxy = new Proxy(target, {
			get(obj, prop, receiver) {
				const value = Reflect.get(obj, prop, receiver);

				// Only track string properties (not symbols)
				if (typeof prop === 'string') {
					const fullPath = basePath ? `${basePath}.${prop}` : prop;
					scope.trackItemProp(collection, id, fullPath);

					// Recursively proxy nested objects
					if (shouldDeepProxy(value)) {
						return createDeepItemProxy(value, collection, id, fullPath, cache);
					}

					// Handle arrays specially
					if (Array.isArray(value)) {
						return createDeepArrayProxy(
							value,
							collection,
							id,
							fullPath,
							cache,
							'item',
						);
					}
				}

				return value;
			},

			set(obj, prop, value, receiver) {
				const result = Reflect.set(obj, prop, value, receiver);

				if (typeof prop === 'string') {
					const fullPath = basePath ? `${basePath}.${prop}` : prop;
					scope.triggerItemProp(collection, id, fullPath);
				}

				return result;
			},
		});

		cache.set(target, proxy);
		return proxy as T;
	}

	function createDeepArrayProxy<T>(
		arr: T[],
		keyOrCollection: string,
		idOrPath: string | number,
		path: string,
		cache: WeakMap<object, object>,
		mode: 'prop' | 'item',
	): T[] {
		// Return cached proxy if exists
		if (cache.has(arr)) {
			return cache.get(arr) as T[];
		}

		// Helper to track/trigger based on mode
		const track = (propPath: string) => {
			if (mode === 'prop') {
				scope.trackProp(keyOrCollection, propPath);
			} else {
				scope.trackItemProp(keyOrCollection, idOrPath, propPath);
			}
		};

		const trigger = (propPath: string) => {
			if (mode === 'prop') {
				scope.triggerProp(keyOrCollection, propPath);
			} else {
				scope.triggerItemProp(keyOrCollection, idOrPath, propPath);
			}
		};

		// Mutation methods that should trigger the array itself
		const mutationMethods = [
			'push',
			'pop',
			'shift',
			'unshift',
			'splice',
			'sort',
			'reverse',
			'fill',
			'copyWithin',
		];

		const proxy = new Proxy(arr, {
			get(target, prop, receiver) {
				const value = Reflect.get(target, prop, receiver);

				if (typeof prop === 'string') {
					// Numeric index access
					if (!isNaN(Number(prop))) {
						const fullPath = `${path}.${prop}`;
						track(fullPath);

						if (shouldDeepProxy(value)) {
							if (mode === 'prop') {
								return createDeepProxy(
									value as object,
									keyOrCollection,
									fullPath,
									cache,
								);
							} else {
								return createDeepItemProxy(
									value as object,
									keyOrCollection,
									idOrPath,
									fullPath,
									cache,
								);
							}
						}

						return value;
					}

					// Array length
					if (prop === 'length') {
						track(`${path}.length`);
						return value;
					}

					// Mutation methods - wrap to trigger after mutation
					if (mutationMethods.includes(prop) && typeof value === 'function') {
						return function (this: T[], ...args: unknown[]) {
							const result = (value as Function).apply(target, args);
							trigger(path); // Trigger the array path
							return result;
						};
					}

					// Iteration methods that access elements
					if (
						[
							'forEach',
							'map',
							'filter',
							'find',
							'findIndex',
							'some',
							'every',
							'reduce',
							'reduceRight',
						].includes(prop)
					) {
						track(path); // Track the whole array for iteration
						return value;
					}
				}

				return value;
			},

			set(target, prop, value, receiver) {
				const result = Reflect.set(target, prop, value, receiver);

				if (typeof prop === 'string') {
					if (!isNaN(Number(prop))) {
						trigger(`${path}.${prop}`);
					} else if (prop === 'length') {
						trigger(path);
					}
				}

				return result;
			},
		});

		cache.set(arr, proxy);
		return proxy as T[];
	}

	// ============ READONLY DEEP PROXY HELPERS ============

	function createReadonlyDeepProxy<T extends object>(
		target: T,
		key: string,
		basePath: string,
		cache: WeakMap<object, object>,
	): T {
		// Return cached proxy if exists (maintains identity)
		if (cache.has(target)) {
			return cache.get(target) as T;
		}

		const proxy = new Proxy(target, {
			get(obj, prop, receiver) {
				const value = Reflect.get(obj, prop, receiver);

				// Only track string properties (not symbols)
				if (typeof prop === 'string') {
					const fullPath = basePath ? `${basePath}.${prop}` : prop;
					scope.trackProp(key, fullPath);

					// Recursively proxy nested objects
					if (shouldDeepProxy(value)) {
						return createReadonlyDeepProxy(value, key, fullPath, cache);
					}

					// Handle arrays specially
					if (Array.isArray(value)) {
						return createReadonlyDeepArrayProxy(
							value,
							key,
							'',
							fullPath,
							cache,
							'prop',
						);
					}
				}

				return value;
			},

			set(obj, prop, value, receiver) {
				throw new Error(
					`Cannot modify read-only proxy. Attempted to set property '${String(prop)}' on key '${key}'`,
				);
			},

			deleteProperty(obj, prop) {
				throw new Error(
					`Cannot modify read-only proxy. Attempted to delete property '${String(prop)}' on key '${key}'`,
				);
			},
		});

		cache.set(target, proxy);
		return proxy as T;
	}

	function createReadonlyDeepItemProxy<T extends object>(
		target: T,
		collection: string,
		id: string | number,
		basePath: string,
		cache: WeakMap<object, object>,
	): T {
		// Return cached proxy if exists (maintains identity)
		if (cache.has(target)) {
			return cache.get(target) as T;
		}

		const proxy = new Proxy(target, {
			get(obj, prop, receiver) {
				const value = Reflect.get(obj, prop, receiver);

				// Only track string properties (not symbols)
				if (typeof prop === 'string') {
					const fullPath = basePath ? `${basePath}.${prop}` : prop;
					scope.trackItemProp(collection, id, fullPath);

					// Recursively proxy nested objects
					if (shouldDeepProxy(value)) {
						return createReadonlyDeepItemProxy(
							value,
							collection,
							id,
							fullPath,
							cache,
						);
					}

					// Handle arrays specially
					if (Array.isArray(value)) {
						return createReadonlyDeepArrayProxy(
							value,
							collection,
							id,
							fullPath,
							cache,
							'item',
						);
					}
				}

				return value;
			},

			set(obj, prop, value, receiver) {
				throw new Error(
					`Cannot modify read-only proxy. Attempted to set property '${String(prop)}' on item '${id}' in collection '${collection}'`,
				);
			},

			deleteProperty(obj, prop) {
				throw new Error(
					`Cannot modify read-only proxy. Attempted to delete property '${String(prop)}' on item '${id}' in collection '${collection}'`,
				);
			},
		});

		cache.set(target, proxy);
		return proxy as T;
	}

	function createReadonlyDeepArrayProxy<T>(
		arr: T[],
		keyOrCollection: string,
		idOrPath: string | number,
		path: string,
		cache: WeakMap<object, object>,
		mode: 'prop' | 'item',
	): T[] {
		// Return cached proxy if exists
		if (cache.has(arr)) {
			return cache.get(arr) as T[];
		}

		// Helper to track based on mode
		const track = (propPath: string) => {
			if (mode === 'prop') {
				scope.trackProp(keyOrCollection, propPath);
			} else {
				scope.trackItemProp(keyOrCollection, idOrPath, propPath);
			}
		};

		// Mutation methods that should throw
		const mutationMethods = [
			'push',
			'pop',
			'shift',
			'unshift',
			'splice',
			'sort',
			'reverse',
			'fill',
			'copyWithin',
		];

		const proxy = new Proxy(arr, {
			get(target, prop, receiver) {
				const value = Reflect.get(target, prop, receiver);

				if (typeof prop === 'string') {
					// Numeric index access
					if (!isNaN(Number(prop))) {
						const fullPath = `${path}.${prop}`;
						track(fullPath);

						if (shouldDeepProxy(value)) {
							if (mode === 'prop') {
								return createReadonlyDeepProxy(
									value as object,
									keyOrCollection,
									fullPath,
									cache,
								);
							} else {
								return createReadonlyDeepItemProxy(
									value as object,
									keyOrCollection,
									idOrPath,
									fullPath,
									cache,
								);
							}
						}

						return value;
					}

					// Array length
					if (prop === 'length') {
						track(`${path}.length`);
						return value;
					}

					// Mutation methods - wrap to throw
					if (mutationMethods.includes(prop) && typeof value === 'function') {
						return function (this: T[], ...args: unknown[]) {
							throw new Error(
								`Cannot modify read-only proxy. Attempted to call method '${prop}' on array at path '${path}'`,
							);
						};
					}

					// Iteration methods that access elements
					if (
						[
							'forEach',
							'map',
							'filter',
							'find',
							'findIndex',
							'some',
							'every',
							'reduce',
							'reduceRight',
						].includes(prop)
					) {
						track(path); // Track the whole array for iteration
						return value;
					}
				}

				return value;
			},

			set(target, prop, value, receiver) {
				throw new Error(
					`Cannot modify read-only proxy. Attempted to set index '${String(prop)}' on array at path '${path}'`,
				);
			},

			deleteProperty(target, prop) {
				throw new Error(
					`Cannot modify read-only proxy. Attempted to delete index '${String(prop)}' on array at path '${path}'`,
				);
			},
		});

		cache.set(arr, proxy);
		return proxy as T[];
	}

	// ============ PUBLIC FACTORY METHODS ============

	return {
		/**
		 * Create a proxy that auto-tracks property reads and auto-triggers property writes.
		 * Uses adapter.reactive() if available for better performance.
		 */
		proxy<T extends object>(target: T, key: string): T {
			// Use adapter.reactive() if available for better performance
			if (adapter?.reactive) {
				return adapter.reactive(target) as T;
			}

			// Fallback to custom proxy implementation
			return new Proxy(target, {
				get(obj, prop, receiver) {
					if (typeof prop === 'string') {
						scope.trackProp(key, prop);
					}
					return Reflect.get(obj, prop, receiver);
				},
				set(obj, prop, value, receiver) {
					const result = Reflect.set(obj, prop, value, receiver);
					if (typeof prop === 'string') {
						scope.triggerProp(key, prop);
					}
					return result;
				},
			});
		},

		/**
		 * Create a proxy for a collection item.
		 * Always uses custom proxy to maintain collection/item context for granular tracking.
		 */
		itemProxy<T extends object>(
			target: T,
			collection: string,
			id: string | number,
		): T {
			// Always use custom proxy for item proxies to ensure proper
			// integration with Scope's granular tracking (collection/item/property levels)
			return new Proxy(target, {
				get(obj, prop, receiver) {
					if (typeof prop === 'string') {
						scope.trackItemProp(collection, id, prop);
					}
					return Reflect.get(obj, prop, receiver);
				},
				set(obj, prop, value, receiver) {
					const result = Reflect.set(obj, prop, value, receiver);
					if (typeof prop === 'string') {
						scope.triggerItemProp(collection, id, prop);
					}
					return result;
				},
			});
		},

		/**
		 * Create a deep proxy for key-based tracking.
		 * Uses adapter.reactive() if available for better performance.
		 */
		deepProxy<T extends object>(target: T, key: string): T {
			// Use adapter.reactive() if available for better performance
			if (adapter?.reactive) {
				return adapter.reactive(target) as T;
			}

			// Fallback to custom proxy implementation
			return createDeepProxy(target, key, '', new WeakMap());
		},

		/**
		 * Create a deep proxy for a collection item.
		 * Always uses custom proxy to maintain collection/item context for granular tracking.
		 */
		deepItemProxy<T extends object>(
			target: T,
			collection: string,
			id: string | number,
		): T {
			// Always use custom proxy for item proxies to ensure proper
			// integration with Scope's granular tracking (collection/item/property levels)
			return createDeepItemProxy(target, collection, id, '', new WeakMap());
		},

		/**
		 * Create a read-only proxy for key-based tracking.
		 */
		readonlyProxy<T extends object>(target: T, key: string): Readonly<T> {
			return new Proxy(target, {
				get(obj, prop, receiver) {
					if (typeof prop === 'string') {
						scope.trackProp(key, prop);
					}
					return Reflect.get(obj, prop, receiver);
				},
				set(obj, prop, value, receiver) {
					throw new Error(
						`Cannot modify read-only proxy. Attempted to set property '${String(prop)}' on key '${key}'`,
					);
				},
				deleteProperty(obj, prop) {
					throw new Error(
						`Cannot modify read-only proxy. Attempted to delete property '${String(prop)}' on key '${key}'`,
					);
				},
			}) as Readonly<T>;
		},

		/**
		 * Create a read-only proxy for a collection item.
		 */
		readonlyItemProxy<T extends object>(
			target: T,
			collection: string,
			id: string | number,
		): Readonly<T> {
			return new Proxy(target, {
				get(obj, prop, receiver) {
					if (typeof prop === 'string') {
						scope.trackItemProp(collection, id, prop);
					}
					return Reflect.get(obj, prop, receiver);
				},
				set(obj, prop, value, receiver) {
					throw new Error(
						`Cannot modify read-only proxy. Attempted to set property '${String(prop)}' on item '${id}' in collection '${collection}'`,
					);
				},
				deleteProperty(obj, prop) {
					throw new Error(
						`Cannot modify read-only proxy. Attempted to delete property '${String(prop)}' on item '${id}' in collection '${collection}'`,
					);
				},
			}) as Readonly<T>;
		},

		/**
		 * Create a deep read-only proxy for key-based tracking.
		 */
		readonlyDeepProxy<T extends object>(target: T, key: string): Readonly<T> {
			return createReadonlyDeepProxy(target, key, '', new WeakMap());
		},

		/**
		 * Create a deep read-only proxy for a collection item.
		 */
		readonlyDeepItemProxy<T extends object>(
			target: T,
			collection: string,
			id: string | number,
		): Readonly<T> {
			return createReadonlyDeepItemProxy(
				target,
				collection,
				id,
				'',
				new WeakMap(),
			);
		},
	};
}
