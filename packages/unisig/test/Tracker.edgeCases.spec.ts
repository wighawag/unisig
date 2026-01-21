import {describe, it, expect, vi, beforeEach} from 'vitest';
import {Tracker, createTracker} from '../src/Tracker.js';
import type {ReactivityAdapter} from '../src/types.js';

// Mock adapter
function createMockAdapter() {
	const deps: Array<{
		depend: ReturnType<typeof vi.fn>;
		notify: ReturnType<typeof vi.fn>;
	}> = [];

	const adapter: ReactivityAdapter & {deps: typeof deps; inScope: boolean} = {
		deps,
		inScope: true,
		create() {
			const dep = {
				depend: vi.fn(),
				notify: vi.fn(),
			};
			deps.push(dep);
			return dep;
		},
		isInScope() {
			return this.inScope;
		},
	};

	return adapter;
}

type TestEvents = {
	'item:added': {id: string; value: number};
	'item:removed': string;
	'list:cleared': void;
	'error:occurred': {message: string};
};

describe('Tracker - Edge Cases', () => {
	describe('constructor and tracker()', () => {
		it('should create without adapter', () => {
			const r = new Tracker<TestEvents>();
			expect(r.getAdapter()).toBeUndefined();
		});

		it('should create with adapter', () => {
			const adapter = createMockAdapter();
			const r = new Tracker<TestEvents>({adapter});
			expect(r.getAdapter()).toBe(adapter);
		});

		it('tracker() should be equivalent to new Tracker()', () => {
			const r = createTracker<TestEvents>();
			expect(r).toBeInstanceOf(Tracker);
		});
	});

	describe('setAdapter()', () => {
		it('should set the adapter', () => {
			const r = new Tracker<TestEvents>();
			const adapter = createMockAdapter();

			r.setAdapter(adapter);
			expect(r.getAdapter()).toBe(adapter);
		});

		it('should replace existing adapter', () => {
			const adapter1 = createMockAdapter();
			const adapter2 = createMockAdapter();
			const r = new Tracker<TestEvents>({adapter: adapter1});

			r.setAdapter(adapter2);
			expect(r.getAdapter()).toBe(adapter2);
		});
	});

	describe('isInScope()', () => {
		it('should return false when no adapter', () => {
			const r = new Tracker<TestEvents>();
			expect(r.isInScope()).toBe(false);
		});

		it('should return true when adapter has no isInScope', () => {
			const adapter: ReactivityAdapter = {
				create: () => ({depend: vi.fn(), notify: vi.fn()}),
			};
			const r = new Tracker<TestEvents>({adapter});
			expect(r.isInScope()).toBe(true);
		});

		it('should delegate to adapter.isInScope', () => {
			const adapter = createMockAdapter();
			const r = new Tracker<TestEvents>({adapter});

			adapter.inScope = true;
			expect(r.isInScope()).toBe(true);

			adapter.inScope = false;
			expect(r.isInScope()).toBe(false);
		});
	});

	describe('Event listener edge cases', () => {
		it('should handle multiple unsubscribes without errors', () => {
			const r = new Tracker<TestEvents>();
			const listener = vi.fn();

			const unsub = r.on('item:added', listener);
			unsub();
			unsub(); // Second unsubscribe should be safe

			expect(listener).not.toHaveBeenCalled();
		});

		it('should handle off() with non-existent listener', () => {
			const r = new Tracker<TestEvents>();
			const listener = vi.fn();

			// Should not throw
			r.off('item:added', listener);
			expect(true).toBe(true);
		});

		it('should handle off() with non-existent event', () => {
			const r = new Tracker<TestEvents>();
			const listener = vi.fn();

			// Should not throw
			r.off('nonexistent' as any, listener);
			expect(true).toBe(true);
		});

		it('should handle once() that unsubscribes before firing', () => {
			const r = new Tracker<TestEvents>();
			const listener = vi.fn();

			const unsub = r.once('item:added', listener);
			unsub();
			r.emit('item:added', {id: '1', value: 42});

			expect(listener).not.toHaveBeenCalled();
		});
	});

	describe('Tracking without adapter', () => {
		it('should not throw when tracking without adapter', () => {
			const r = new Tracker<TestEvents>();

			// Should not throw
			r.track('items');
			r.trackItem('items', '1');
			r.trackProp('config', 'theme');
			r.trackItemProp('items', '1', 'score');

			expect(true).toBe(true);
		});

		it('should not throw when triggering without adapter', () => {
			const r = new Tracker<TestEvents>();

			// Should not throw
			r.trigger('items');
			r.triggerItem('items', '1');
			r.triggerCollection('items');
			r.triggerItemRemoved('items', '1');
			r.triggerItemAdded('items');
			r.triggerProp('config', 'theme');
			r.triggerItemProp('items', '1', 'score');

			expect(true).toBe(true);
		});
	});

	describe('dep() edge cases', () => {
		it('should return undefined when no adapter', () => {
			const r = new Tracker<TestEvents>();
			expect(r.dep('test')).toBeUndefined();
		});

		it('should return same dependency for same key', () => {
			const adapter = createMockAdapter();
			const r = new Tracker<TestEvents>({adapter});

			const dep1 = r.dep('test');
			const dep2 = r.dep('test');

			expect(dep1).toBe(dep2);
			expect(adapter.deps).toHaveLength(1);
		});

		it('should return different dependencies for different keys', () => {
			const adapter = createMockAdapter();
			const r = new Tracker<TestEvents>({adapter});

			const dep1 = r.dep('key1');
			const dep2 = r.dep('key2');

			expect(dep1).not.toBe(dep2);
			expect(adapter.deps).toHaveLength(2);
		});
	});

	describe('itemDep() edge cases', () => {
		it('should return undefined when no adapter', () => {
			const r = new Tracker<TestEvents>();
			expect(r.itemDep('users', '1')).toBeUndefined();
		});

		it('should return same dependency for same collection and id', () => {
			const adapter = createMockAdapter();
			const r = new Tracker<TestEvents>({adapter});

			const dep1 = r.itemDep('users', '1');
			const dep2 = r.itemDep('users', '1');

			expect(dep1).toBe(dep2);
		});

		it('should return different dependencies for different ids', () => {
			const adapter = createMockAdapter();
			const r = new Tracker<TestEvents>({adapter});

			const dep1 = r.itemDep('users', '1');
			const dep2 = r.itemDep('users', '2');

			expect(dep1).not.toBe(dep2);
		});

		it('should return different dependencies for different collections', () => {
			const adapter = createMockAdapter();
			const r = new Tracker<TestEvents>({adapter});

			const dep1 = r.itemDep('users', '1');
			const dep2 = r.itemDep('posts', '1');

			expect(dep1).not.toBe(dep2);
		});

		it('should support numeric ids', () => {
			const adapter = createMockAdapter();
			const r = new Tracker<TestEvents>({adapter});

			const dep1 = r.itemDep('items', 1);
			const dep2 = r.itemDep('items', 2);

			expect(dep1).not.toBe(dep2);
		});
	});

	describe('propDep() edge cases', () => {
		it('should return undefined when no adapter', () => {
			const r = new Tracker<TestEvents>();
			expect(r.propDep('config', 'theme')).toBeUndefined();
		});

		it('should return same dependency for same key and prop', () => {
			const adapter = createMockAdapter();
			const r = new Tracker<TestEvents>({adapter});

			const dep1 = r.propDep('config', 'theme');
			const dep2 = r.propDep('config', 'theme');

			expect(dep1).toBe(dep2);
		});

		it('should return different dependencies for different props', () => {
			const adapter = createMockAdapter();
			const r = new Tracker<TestEvents>({adapter});

			const dep1 = r.propDep('config', 'theme');
			const dep2 = r.propDep('config', 'language');

			expect(dep1).not.toBe(dep2);
		});
	});

	describe('itemPropDep() edge cases', () => {
		it('should return undefined when no adapter', () => {
			const r = new Tracker<TestEvents>();
			expect(r.itemPropDep('users', '1', 'score')).toBeUndefined();
		});

		it('should return same dependency for same collection, id, and prop', () => {
			const adapter = createMockAdapter();
			const r = new Tracker<TestEvents>({adapter});

			const dep1 = r.itemPropDep('users', '1', 'score');
			const dep2 = r.itemPropDep('users', '1', 'score');

			expect(dep1).toBe(dep2);
		});

		it('should return different dependencies for different props', () => {
			const adapter = createMockAdapter();
			const r = new Tracker<TestEvents>({adapter});

			const dep1 = r.itemPropDep('users', '1', 'score');
			const dep2 = r.itemPropDep('users', '1', 'name');

			expect(dep1).not.toBe(dep2);
		});
	});

	describe('trigger() edge cases', () => {
		it('should create dep if not exists', () => {
			const adapter = createMockAdapter();
			const r = new Tracker<TestEvents>({adapter});

			r.trigger('test');

			expect(adapter.deps).toHaveLength(1);
			expect(adapter.deps[0].notify).toHaveBeenCalledTimes(1);
		});

		it('should work without event', () => {
			const adapter = createMockAdapter();
			const r = new Tracker<TestEvents>({adapter});

			r.trigger('items');

			expect(adapter.deps[0].notify).toHaveBeenCalledTimes(1);
		});
	});

	describe('triggerItemRemoved() edge cases', () => {
		it('should clean up item deps after removal', () => {
			const adapter = createMockAdapter();
			const r = new Tracker<TestEvents>({adapter});

			r.itemDep('users', '1');
			r.dep('users');
			r.triggerItemRemoved('users', '1');

			// After removal, new dep should be created
			r.itemDep('users', '1');
			expect(adapter.deps).toHaveLength(3); // 2 original + 1 new
		});
	});

	describe('emit() edge cases', () => {
		it('should work without adapter', () => {
			const r = new Tracker<TestEvents>();
			const listener = vi.fn();

			r.on('item:added', listener);
			r.emit('item:added', {id: '1', value: 42});

			expect(listener).toHaveBeenCalledWith({id: '1', value: 42});
		});

		it('should do nothing if no listeners', () => {
			const r = new Tracker<TestEvents>();

			// Should not throw
			r.emit('item:added', {id: '1', value: 42});
			expect(true).toBe(true);
		});

		it('should call all listeners in order', () => {
			const r = new Tracker<TestEvents>();
			const order: number[] = [];

			r.on('item:added', () => order.push(1));
			r.on('item:added', () => order.push(2));
			r.on('item:added', () => order.push(3));

			r.emit('item:added', {id: '1', value: 42});

			expect(order).toEqual([1, 2, 3]);
		});
	});

	describe('clear() edge cases', () => {
		it('should clear all dependencies', () => {
			const adapter = createMockAdapter();
			const r = new Tracker<TestEvents>({adapter});

			r.dep('key1');
			r.dep('key2');
			r.itemDep('users', '1');
			r.itemDep('users', '2');

			r.clear();

			// After clear, new deps should be created for same keys
			const oldDepsCount = adapter.deps.length;
			r.dep('key1');
			expect(adapter.deps.length).toBe(oldDepsCount + 1);
		});

		it('should not affect events', () => {
			const adapter = createMockAdapter();
			const r = new Tracker<TestEvents>({adapter});
			const listener = vi.fn();

			r.on('item:added', listener);
			r.clear();

			// Events should still work
			r.emit('item:added', {id: '1', value: 42});
			expect(listener).toHaveBeenCalled();
		});
	});

	describe('proxy() edge cases', () => {
		it('should work without adapter', () => {
			const r = new Tracker<TestEvents>();
			const obj = {theme: 'dark'};

			const proxied = r.proxy(obj, 'config');

			// Should not throw
			expect(proxied.theme).toBe('dark');
		});

		it('should handle symbol properties', () => {
			const adapter = createMockAdapter();
			const r = new Tracker<TestEvents>({adapter});
			const sym = Symbol('test');
			const obj = {theme: 'dark', [sym]: 'value'};

			const proxied = r.proxy(obj, 'config');

			// Symbol properties should work but not be tracked
			expect(proxied[sym]).toBe('value');
		});

		it('should maintain original object behavior', () => {
			const adapter = createMockAdapter();
			const r = new Tracker<TestEvents>({adapter});
			const obj = {
				get value() {
					return 42;
				},
			};

			const proxied = r.proxy(obj, 'config');

			expect(proxied.value).toBe(42);
		});
	});

	describe('itemProxy() edge cases', () => {
		it('should work without adapter', () => {
			const r = new Tracker<TestEvents>();
			const item = {id: '1', value: 42};

			const proxied = r.itemProxy(item, 'items', '1');

			// Should not throw
			expect(proxied.value).toBe(42);
		});

		it('should handle numeric ids', () => {
			const adapter = createMockAdapter();
			const r = new Tracker<TestEvents>({adapter});
			const item = {id: 1, value: 42};

			const proxied = r.itemProxy(item, 'items', 1);

			expect(proxied.value).toBe(42);
		});
	});

	describe('deepProxy() edge cases', () => {
		it('should work without adapter', () => {
			const r = new Tracker<TestEvents>();
			const obj = {nested: {value: 42}};

			const proxied = r.deepProxy(obj, 'config');

			// Should not throw
			expect(proxied.nested.value).toBe(42);
		});

		it('should handle deeply nested objects', () => {
			const adapter = createMockAdapter();
			const r = new Tracker<TestEvents>({adapter});
			const obj = {
				level1: {
					level2: {
						level3: {
							value: 42,
						},
					},
				},
			};

			const proxied = r.deepProxy(obj, 'config');
			const value = proxied.level1.level2.level3.value;

			expect(value).toBe(42);
		});
	});

	describe('deepItemProxy() edge cases', () => {
		it('should work without adapter', () => {
			const r = new Tracker<TestEvents>();
			const item = {nested: {value: 42}};

			const proxied = r.deepItemProxy(item, 'items', '1');

			// Should not throw
			expect(proxied.nested.value).toBe(42);
		});

		it('should handle numeric ids', () => {
			const adapter = createMockAdapter();
			const r = new Tracker<TestEvents>({adapter});
			const item = {id: 1, nested: {value: 42}};

			const proxied = r.deepItemProxy(item, 'items', 1);

			expect(proxied.nested.value).toBe(42);
		});
	});

	describe('Integration with events and signals', () => {
		it('should emit event when triggering with event', () => {
			const adapter = createMockAdapter();
			const r = new Tracker<TestEvents>({adapter});
			const listener = vi.fn();

			r.on('item:added', listener);
			r.trigger('items', 'item:added', {id: '1', value: 42});

			expect(listener).toHaveBeenCalledWith({id: '1', value: 42});
			expect(adapter.deps[0].notify).toHaveBeenCalledTimes(1);
		});

		it('should only emit event without signal when using emit()', () => {
			const adapter = createMockAdapter();
			const r = new Tracker<TestEvents>({adapter});
			const listener = vi.fn();

			r.on('item:added', listener);
			r.dep('items'); // Create a dep
			r.emit('item:added', {id: '1', value: 42});

			expect(listener).toHaveBeenCalledWith({id: '1', value: 42});
			expect(adapter.deps[0].notify).not.toHaveBeenCalled();
		});
	});

	describe('Error handling', () => {
		it('should propagate error when no error handler (fail-fast)', () => {
			const r = new Tracker<TestEvents>();
			const error = new Error('Listener error');

			r.on('item:added', () => {
				throw error;
			});

			expect(() => r.emit('item:added', {id: '1', value: 42})).toThrow(error);
		});

		it('should call error handler when configured in Tracker', () => {
			const errorHandler = vi.fn();
			const r = new Tracker<TestEvents>({errorHandler});
			const error = new Error('Listener error');

			r.on('item:added', () => {
				throw error;
			});

			r.emit('item:added', {id: '1', value: 42});

			expect(errorHandler).toHaveBeenCalledTimes(1);
			expect(errorHandler).toHaveBeenCalledWith(
				'item:added',
				error,
				expect.any(Function),
			);
		});

		it('should continue execution after error when handler configured', () => {
			const errorHandler = vi.fn();
			const r = new Tracker<TestEvents>({errorHandler});
			const listener1 = vi.fn(() => {
				throw new Error('Listener 1 error');
			});
			const listener2 = vi.fn();

			r.on('item:added', listener1);
			r.on('item:added', listener2);

			r.emit('item:added', {id: '1', value: 42});

			expect(listener1).toHaveBeenCalledTimes(1);
			expect(listener2).toHaveBeenCalledTimes(1);
			expect(errorHandler).toHaveBeenCalledTimes(1);
		});

		it('should handle errors in trigger() with event', () => {
			const errorHandler = vi.fn();
			const r = new Tracker<TestEvents>({errorHandler});
			const error = new Error('Trigger error');

			r.on('item:added', () => {
				throw error;
			});

			r.trigger('items', 'item:added', {id: '1', value: 42});

			expect(errorHandler).toHaveBeenCalledWith(
				'item:added',
				error,
				expect.any(Function),
			);
		});

		it('should handle errors in once() listeners', () => {
			const errorHandler = vi.fn();
			const r = new Tracker<TestEvents>({errorHandler});
			const listener = vi.fn(() => {
				throw new Error('Once listener error');
			});

			r.once('item:added', listener);

			r.emit('item:added', {id: '1', value: 42});

			expect(listener).toHaveBeenCalledTimes(1);
			expect(errorHandler).toHaveBeenCalledTimes(1);

			// Should not be called again (once behavior)
			r.emit('item:added', {id: '2', value: 43});
			expect(listener).toHaveBeenCalledTimes(1);
		});

		it('should work with adapter and error handler together', () => {
			const adapter = createMockAdapter();
			const errorHandler = vi.fn();
			const r = new Tracker<TestEvents>({adapter, errorHandler});
			const error = new Error('Listener error');

			r.on('item:added', () => {
				throw error;
			});

			r.trigger('items', 'item:added', {id: '1', value: 42});

			// Signal should still be triggered
			expect(adapter.deps[0].notify).toHaveBeenCalled();
			// Error should be handled
			expect(errorHandler).toHaveBeenCalledWith(
				'item:added',
				error,
				expect.any(Function),
			);
		});

		it('should work with options object containing only errorHandler', () => {
			const errorHandler = vi.fn();
			const r = new Tracker<TestEvents>({errorHandler});
			const error = new Error('Listener error');

			r.on('item:added', () => {
				throw error;
			});

			r.emit('item:added', {id: '1', value: 42});

			expect(errorHandler).toHaveBeenCalledWith(
				'item:added',
				error,
				expect.any(Function),
			);
		});
	});
});
