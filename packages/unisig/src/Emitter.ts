/**
 * Generic event listener type
 */
export type Listener<T = unknown> = (data: T) => void;

/**
 * Unsubscribe function returned by `on()`
 */
export type Unsubscribe = () => void;

/**
 * A minimal, type-safe event emitter.
 *
 * Extend this class or use it as a property to add event capabilities
 * to your classes. Events always work, regardless of whether a
 * reactivity adapter is configured.
 *
 * @example
 * ```ts
 * interface MyEvents {
 *   'item:added': { id: string; name: string }
 *   'item:removed': string
 *   'cleared': void
 * }
 *
 * class MyStore extends Emitter<MyEvents> {
 *   add(item: { id: string; name: string }) {
 *     // ... add logic
 *     this.emit('item:added', item)
 *   }
 * }
 * ```
 */
export class Emitter<
	Events extends Record<string, unknown> = Record<string, unknown>,
> {
	private _listeners = new Map<keyof Events, Set<Listener<unknown>>>();

	/**
	 * Subscribe to an event.
	 *
	 * @param event - The event name to listen for
	 * @param listener - Callback function to invoke when event is emitted
	 * @returns Unsubscribe function to remove the listener
	 *
	 * @example
	 * ```ts
	 * const unsub = emitter.on('item:added', (item) => {
	 *   console.log('Added:', item)
	 * })
	 *
	 * // Later, to stop listening:
	 * unsub()
	 * ```
	 */
	on<K extends keyof Events>(
		event: K,
		listener: Listener<Events[K]>,
	): Unsubscribe {
		if (!this._listeners.has(event)) {
			this._listeners.set(event, new Set());
		}
		this._listeners.get(event)!.add(listener as Listener<unknown>);
		return () => this._listeners.get(event)?.delete(listener as Listener<unknown>);
	}

	/**
	 * Unsubscribe a specific listener from an event.
	 *
	 * @param event - The event name
	 * @param listener - The exact listener function to remove
	 */
	off<K extends keyof Events>(event: K, listener: Listener<Events[K]>): void {
		this._listeners.get(event)?.delete(listener as Listener<unknown>);
	}

	/**
	 * Subscribe to an event for a single emission only.
	 * Automatically unsubscribes after the first event.
	 *
	 * @param event - The event name to listen for
	 * @param listener - Callback function to invoke once
	 * @returns Unsubscribe function to remove the listener before it fires
	 */
	once<K extends keyof Events>(
		event: K,
		listener: Listener<Events[K]>,
	): Unsubscribe {
		const onceListener: Listener<Events[K]> = (data) => {
			this.off(event, onceListener);
			listener(data);
		};
		return this.on(event, onceListener);
	}

	/**
	 * Emit an event to all subscribed listeners.
	 *
	 * @param event - The event name to emit
	 * @param data - The data to pass to listeners
	 *
	 * @example
	 * ```ts
	 * this.emit('item:added', { id: '1', name: 'Test' })
	 * ```
	 */
	emit<K extends keyof Events>(event: K, data: Events[K]): void {
		this._listeners.get(event)?.forEach((fn) => fn(data));
	}

	/**
	 * Check if there are any listeners for an event.
	 * Useful for avoiding expensive data preparation when no one is listening.
	 *
	 * @param event - The event name to check
	 * @returns true if there are listeners
	 */
	hasListeners<K extends keyof Events>(event: K): boolean {
		const listeners = this._listeners.get(event);
		return listeners !== undefined && listeners.size > 0;
	}

	/**
	 * Get the number of listeners for an event.
	 *
	 * @param event - The event name to check
	 * @returns Number of listeners
	 */
	listenerCount<K extends keyof Events>(event: K): number {
		return this._listeners.get(event)?.size ?? 0;
	}

	/**
	 * Remove all listeners for a specific event, or all events if no event specified.
	 *
	 * @param event - Optional event name. If omitted, removes all listeners.
	 */
	removeAllListeners<K extends keyof Events>(event?: K): void {
		if (event !== undefined) {
			this._listeners.delete(event);
		} else {
			this._listeners.clear();
		}
	}
}