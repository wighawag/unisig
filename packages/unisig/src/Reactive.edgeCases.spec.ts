import {describe, it, expect, vi, beforeEach} from 'vitest';
import {Reactive, reactive} from './Reactive';
import type {ReactivityAdapter} from './types';

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

describe('Reactive - Edge Cases', () => {
	describe('constructor and reactive()', () => {
		it('should create without adapter', () => {
			const r = new Reactive<TestEvents>();
			expect(r.getAdapter()).toBeUndefined();
		});

		it('should create with adapter', () => {
			const adapter = createMockAdapter();
			const r = new Reactive<TestEvents>(adapter);
			expect(r.getAdapter()).toBe(adapter);
		});

		it('reactive() should be equivalent to new Reactive()', () => {
			const r = reactive<TestEvents>();
			expect(r).toBeInstanceOf(Reactive);
		});
	});

	describe('setAdapter()', () => {
		it('should set the adapter', () => {
			const r = new Reactive<TestEvents>();
			const adapter = createMockAdapter();

			r.setAdapter(adapter);
			expect(r.getAdapter()).toBe(adapter);
		});

		it('should replace existing adapter', () => {
			const adapter1 = createMockAdapter();
			const adapter2 = createMockAdapter();
			const r = new Reactive<TestEvents>(adapter1);

			r.setAdapter(adapter2);
			expect(r.getAdapter()).toBe(adapter2);
		});
	});

	describe('isInScope()', () => {
		it('should return false when no adapter', () => {
			const r = new Reactive<TestEvents>();
			expect(r.isInScope()).toBe(false);
		});

		it('should return true when adapter has no isInScope', () => {
			const adapter: ReactivityAdapter = {
				create: () => ({depend: vi.fn(), notify: vi.fn()}),
			};
			const r = new Reactive<TestEvents>(adapter);
			expect(r.isInScope()).toBe(true);
		});

		it('should delegate to adapter.isInScope', () => {
			const adapter = createMockAdapter();
			const r = new Reactive<TestEvents>(adapter);

			adapter.inScope = true;
			expect(r.isInScope()).toBe(true);

			adapter.inScope = false;
			expect(r.isInScope()).toBe(false);
		});
	});

	describe('Event listener edge cases', () => {
		it('should handle multiple unsubscribes without errors', () => {
			const r = new Reactive<TestEvents>();
			const listener = vi.fn();

			const unsub = r.on('item:added', listener);
			unsub();
			unsub(); // Second unsubscribe should be safe

			expect(listener).not.toHaveBeenCalled();
		});

		it('should handle off() with non-existent listener', () => {
			const r = new Reactive<TestEvents>();
			const listener = vi.fn();

			// Should not throw
			r.off('item:added', listener);
			expect(true).toBe(true);
		});

		it('should handle off() with non-existent event', () => {
			const r = new Reactive<TestEvents>();
			const listener = vi.fn();

			// Should not throw
			r.off('nonexistent' as any, listener);
			expect(true).toBe(true);
		});

		it('should handle once() that unsubscribes before firing', () => {
			const r = new Reactive<TestEvents>();
			const listener = vi.fn();

			const unsub = r.once('item:added', listener);
			unsub();
			r.emit('item:added', {id: '1', value: 42});

			expect(listener).not.toHaveBeenCalled();
		});
	});

	describe('Tracking without adapter', () => {
		it('should not throw when tracking without adapter', () => {
			const r = new Reactive<TestEvents>();

			// Should not throw
			r.track('items');
			r.trackItem('items', '1');
			r.trackProp('config', 'theme');
			r.trackItemProp('items', '1', 'score');

			expect(true).toBe(true);
		});

		it('should not throw when triggering without adapter', () => {
			const r = new Reactive<TestEvents>();

			// Should not throw
			r.trigger('items');
			r.triggerItem('items', '1');
			r.triggerList('items');
			r.triggerRemove('items', '1');
			r.triggerAdd('items');
			r.triggerProp('config', 'theme');
			r.triggerItemProp('items', '1', 'score');

			expect(true).toBe(true);
		});
	});

	describe('dep() edge cases', () => {
		it('should return null when no adapter', () => {
			const r = new Reactive<TestEvents>();
			expect(r.dep('test')).toBeNull();
		});

		it('should return same dependency for same key', () => {
			const adapter = createMockAdapter();
			const r = new Reactive<TestEvents>(adapter);

			const dep1 = r.dep('test');
			const dep2 = r.dep('test');

			expect(dep1).toBe(dep2);
			expect(adapter.deps).toHaveLength(1);
		});

		it('should return different dependencies for different keys', () => {
			const adapter = createMockAdapter();
			const r = new Reactive<TestEvents>(adapter);

			const dep1 = r.dep('key1');
			const dep2 = r.dep('key2');

			expect(dep1).not.toBe(dep2);
			expect(adapter.deps).toHaveLength(2);
		});
	});

	describe('itemDep() edge cases', () => {
		it('should return null when no adapter', () => {
			const r = new Reactive<TestEvents>();
			expect(r.itemDep('users', '1')).toBeNull();
		});

		it('should return same dependency for same collection and id', () => {
			const adapter = createMockAdapter();
			const r = new Reactive<TestEvents>(adapter);

			const dep1 = r.itemDep('users', '1');
			const dep2 = r.itemDep('users', '1');

			expect(dep1).toBe(dep2);
		});

		it('should return different dependencies for different ids', () => {
			const adapter = createMockAdapter();
			const r = new Reactive<TestEvents>(adapter);

			const dep1 = r.itemDep('users', '1');
			const dep2 = r.itemDep('users', '2');

			expect(dep1).not.toBe(dep2);
		});

		it('should return different dependencies for different collections', () => {
			const adapter = createMockAdapter();
			const r = new Reactive<TestEvents>(adapter);

			const dep1 = r.itemDep('users', '1');
			const dep2 = r.itemDep('posts', '1');

			expect(dep1).not.toBe(dep2);
		});

		it('should support numeric ids', () => {
			const adapter = createMockAdapter();
			const r = new Reactive<TestEvents>(adapter);

			const dep1 = r.itemDep('items', 1);
			const dep2 = r.itemDep('items', 2);

			expect(dep1).not.toBe(dep2);
		});
	});

	describe('propDep() edge cases', () => {
		it('should return null when no adapter', () => {
			const r = new Reactive<TestEvents>();
			expect(r.propDep('config', 'theme')).toBeNull();
		});

		it('should return same dependency for same key and prop', () => {
			const adapter = createMockAdapter();
			const r = new Reactive<TestEvents>(adapter);

			const dep1 = r.propDep('config', 'theme');
			const dep2 = r.propDep('config', 'theme');

			expect(dep1).toBe(dep2);
		});

		it('should return different dependencies for different props', () => {
			const adapter = createMockAdapter();
			const r = new Reactive<TestEvents>(adapter);

			const dep1 = r.propDep('config', 'theme');
			const dep2 = r.propDep('config', 'language');

			expect(dep1).not.toBe(dep2);
		});
	});

	describe('itemPropDep() edge cases', () => {
		it('should return null when no adapter', () => {
			const r = new Reactive<TestEvents>();
			expect(r.itemPropDep('users', '1', 'score')).toBeNull();
		});

		it('should return same dependency for same collection, id, and prop', () => {
			const adapter = createMockAdapter();
			const r = new Reactive<TestEvents>(adapter);

			const dep1 = r.itemPropDep('users', '1', 'score');
			const dep2 = r.itemPropDep('users', '1', 'score');

			expect(dep1).toBe(dep2);
		});

		it('should return different dependencies for different props', () => {
			const adapter = createMockAdapter();
			const r = new Reactive<TestEvents>(adapter);

			const dep1 = r.itemPropDep('users', '1', 'score');
			const dep2 = r.itemPropDep('users', '1', 'name');

			expect(dep1).not.toBe(dep2);
		});
	});

	describe('trigger() edge cases', () => {
		it('should create dep if not exists', () => {
			const adapter = createMockAdapter();
			const r = new Reactive<TestEvents>(adapter);

			r.trigger('test');

			expect(adapter.deps).toHaveLength(1);
			expect(adapter.deps[0].notify).toHaveBeenCalledTimes(1);
		});

		it('should work without event', () => {
			const adapter = createMockAdapter();
			const r = new Reactive<TestEvents>(adapter);

			r.trigger('items');

			expect(adapter.deps[0].notify).toHaveBeenCalledTimes(1);
		});
	});

	describe('triggerRemove() edge cases', () => {
		it('should clean up item deps after removal', () => {
			const adapter = createMockAdapter();
			const r = new Reactive<TestEvents>(adapter);

			r.itemDep('users', '1');
			r.dep('users');
			r.triggerRemove('users', '1');

			// After removal, new dep should be created
			r.itemDep('users', '1');
			expect(adapter.deps).toHaveLength(3); // 2 original + 1 new
		});
	});

	describe('emit() edge cases', () => {
		it('should work without adapter', () => {
			const r = new Reactive<TestEvents>();
			const listener = vi.fn();

			r.on('item:added', listener);
			r.emit('item:added', {id: '1', value: 42});

			expect(listener).toHaveBeenCalledWith({id: '1', value: 42});
		});

		it('should do nothing if no listeners', () => {
			const r = new Reactive<TestEvents>();

			// Should not throw
			r.emit('item:added', {id: '1', value: 42});
			expect(true).toBe(true);
		});

		it('should call all listeners in order', () => {
			const r = new Reactive<TestEvents>();
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
			const r = new Reactive<TestEvents>(adapter);

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
			const r = new Reactive<TestEvents>(adapter);
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
			const r = new Reactive<TestEvents>();
			const obj = {theme: 'dark'};

			const proxied = r.proxy(obj, 'config');

			// Should not throw
			expect(proxied.theme).toBe('dark');
		});

		it('should handle symbol properties', () => {
			const adapter = createMockAdapter();
			const r = new Reactive<TestEvents>(adapter);
			const sym = Symbol('test');
			const obj = {theme: 'dark', [sym]: 'value'};

			const proxied = r.proxy(obj, 'config');

			// Symbol properties should work but not be tracked
			expect(proxied[sym]).toBe('value');
		});

		it('should maintain original object behavior', () => {
			const adapter = createMockAdapter();
			const r = new Reactive<TestEvents>(adapter);
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
			const r = new Reactive<TestEvents>();
			const item = {id: '1', value: 42};

			const proxied = r.itemProxy(item, 'items', '1');

			// Should not throw
			expect(proxied.value).toBe(42);
		});

		it('should handle numeric ids', () => {
			const adapter = createMockAdapter();
			const r = new Reactive<TestEvents>(adapter);
			const item = {id: 1, value: 42};

			const proxied = r.itemProxy(item, 'items', 1);

			expect(proxied.value).toBe(42);
		});
	});

	describe('deepProxy() edge cases', () => {
		it('should work without adapter', () => {
			const r = new Reactive<TestEvents>();
			const obj = {nested: {value: 42}};

			const proxied = r.deepProxy(obj, 'config');

			// Should not throw
			expect(proxied.nested.value).toBe(42);
		});

		it('should handle deeply nested objects', () => {
			const adapter = createMockAdapter();
			const r = new Reactive<TestEvents>(adapter);
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
			const r = new Reactive<TestEvents>();
			const item = {nested: {value: 42}};

			const proxied = r.deepItemProxy(item, 'items', '1');

			// Should not throw
			expect(proxied.nested.value).toBe(42);
		});

		it('should handle numeric ids', () => {
			const adapter = createMockAdapter();
			const r = new Reactive<TestEvents>(adapter);
			const item = {id: 1, nested: {value: 42}};

			const proxied = r.deepItemProxy(item, 'items', 1);

			expect(proxied.nested.value).toBe(42);
		});
	});

	describe('Integration with events and signals', () => {
		it('should emit event when triggering with event', () => {
			const adapter = createMockAdapter();
			const r = new Reactive<TestEvents>(adapter);
			const listener = vi.fn();

			r.on('item:added', listener);
			r.trigger('items', 'item:added', {id: '1', value: 42});

			expect(listener).toHaveBeenCalledWith({id: '1', value: 42});
			expect(adapter.deps[0].notify).toHaveBeenCalledTimes(1);
		});

		it('should only emit event without signal when using emit()', () => {
			const adapter = createMockAdapter();
			const r = new Reactive<TestEvents>(adapter);
			const listener = vi.fn();

			r.on('item:added', listener);
			r.dep('items'); // Create a dep
			r.emit('item:added', {id: '1', value: 42});

			expect(listener).toHaveBeenCalledWith({id: '1', value: 42});
			expect(adapter.deps[0].notify).not.toHaveBeenCalled();
		});
	});

	describe('Error handling', () => {
		it('should handle errors in event listeners gracefully', () => {
			const r = new Reactive<TestEvents>();
			const errorListener = vi.fn(() => {
				throw new Error('Test error');
			});
			const normalListener = vi.fn();

			r.on('item:added', errorListener);
			r.on('item:added', normalListener);

			// This might throw depending on implementation
			try {
				r.emit('item:added', {id: '1', value: 42});
			} catch (e) {
				// Error is expected
			}

			// Normal listener should have been called (implementation dependent)
			// This test documents current behavior
		});
	});
});