import {describe, it, expect, vi, beforeEach} from 'vitest';
import {ScopeAdapter} from '../src/types';
import {createTrackerFactory, Tracker} from '../src/Tracker';
import {ReactiveResult} from 'unisig';

// Mock adapter
function createMockAdapter() {
	const deps: Array<{
		depend: ReturnType<typeof vi.fn>;
		notify: ReturnType<typeof vi.fn>;
	}> = [];

	const adapter: ScopeAdapter & {deps: typeof deps; inScope: boolean} = {
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
		reactive: undefined as any,
	};

	return adapter;
}

const createTracker = createTrackerFactory(createMockAdapter());

describe('Tracker - Edge Cases', () => {
	describe('constructor and tracker()', () => {
		it('should create with adapter', () => {
			const adapter = createMockAdapter();
			const r = createTrackerFactory(adapter)();
			expect(r.getAdapter()).toBe(adapter);
		});

		it('tracker() should be equivalent to createTracker()', () => {
			const r = createTracker();
			expect(r).toBeInstanceOf(Tracker);
		});
	});

	describe('isInScope()', () => {
		it('should return true when adapter has no isInScope', () => {
			const adapter: ScopeAdapter = {
				create: () => ({depend: vi.fn(), notify: vi.fn()}),
			} as unknown as ScopeAdapter;
			const r = createTrackerFactory(adapter)();
			expect(r.isInScope()).toBe(true);
		});

		it('should delegate to adapter.isInScope', () => {
			const adapter = createMockAdapter();
			const r = createTrackerFactory(adapter)();

			adapter.inScope = true;
			expect(r.isInScope()).toBe(true);

			adapter.inScope = false;
			expect(r.isInScope()).toBe(false);
		});
	});

	describe('Tracking without adapter', () => {
		it('should not throw when tracking without adapter', () => {
			const r = createTracker();

			// Should not throw
			r.track('items');
			r.trackItem('items', '1');
			r.trackProp('config', 'theme');
			r.trackItemProp('items', '1', 'score');

			expect(true).toBe(true);
		});

		it('should not throw when triggering without adapter', () => {
			const r = createTracker();

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
		it('should return same dependency for same key', () => {
			const adapter = createMockAdapter();
			const r = createTrackerFactory(adapter)();

			const dep1 = r.dep('test');
			const dep2 = r.dep('test');

			expect(dep1).toBe(dep2);
			expect(adapter.deps).toHaveLength(1);
		});

		it('should return different dependencies for different keys', () => {
			const adapter = createMockAdapter();
			const r = createTrackerFactory(adapter)();

			const dep1 = r.dep('key1');
			const dep2 = r.dep('key2');

			expect(dep1).not.toBe(dep2);
			expect(adapter.deps).toHaveLength(2);
		});
	});

	describe('itemDep() edge cases', () => {
		it('should return same dependency for same collection and id', () => {
			const adapter = createMockAdapter();
			const r = createTrackerFactory(adapter)();

			const dep1 = r.itemDep('users', '1');
			const dep2 = r.itemDep('users', '1');

			expect(dep1).toBe(dep2);
		});

		it('should return different dependencies for different ids', () => {
			const adapter = createMockAdapter();
			const r = createTrackerFactory(adapter)();

			const dep1 = r.itemDep('users', '1');
			const dep2 = r.itemDep('users', '2');

			expect(dep1).not.toBe(dep2);
		});

		it('should return different dependencies for different collections', () => {
			const adapter = createMockAdapter();
			const r = createTrackerFactory(adapter)();

			const dep1 = r.itemDep('users', '1');
			const dep2 = r.itemDep('posts', '1');

			expect(dep1).not.toBe(dep2);
		});

		it('should support numeric ids', () => {
			const adapter = createMockAdapter();
			const r = createTrackerFactory(adapter)();

			const dep1 = r.itemDep('items', 1);
			const dep2 = r.itemDep('items', 2);

			expect(dep1).not.toBe(dep2);
		});
	});

	describe('propDep() edge cases', () => {
		it('should return same dependency for same key and prop', () => {
			const adapter = createMockAdapter();
			const r = createTrackerFactory(adapter)();

			const dep1 = r.propDep('config', 'theme');
			const dep2 = r.propDep('config', 'theme');

			expect(dep1).toBe(dep2);
		});

		it('should return different dependencies for different props', () => {
			const adapter = createMockAdapter();
			const r = createTrackerFactory(adapter)();

			const dep1 = r.propDep('config', 'theme');
			const dep2 = r.propDep('config', 'language');

			expect(dep1).not.toBe(dep2);
		});
	});

	describe('itemPropDep() edge cases', () => {
		it('should return same dependency for same collection, id, and prop', () => {
			const adapter = createMockAdapter();
			const r = createTrackerFactory(adapter)();

			const dep1 = r.itemPropDep('users', '1', 'score');
			const dep2 = r.itemPropDep('users', '1', 'score');

			expect(dep1).toBe(dep2);
		});

		it('should return different dependencies for different props', () => {
			const adapter = createMockAdapter();
			const r = createTrackerFactory(adapter)();

			const dep1 = r.itemPropDep('users', '1', 'score');
			const dep2 = r.itemPropDep('users', '1', 'name');

			expect(dep1).not.toBe(dep2);
		});
	});

	describe('trigger() edge cases', () => {
		it('should create dep if not exists', () => {
			const adapter = createMockAdapter();
			const r = createTrackerFactory(adapter)();

			r.trigger('test');

			expect(adapter.deps).toHaveLength(1);
			expect(adapter.deps[0].notify).toHaveBeenCalledTimes(1);
		});
	});

	describe('triggerItemRemoved() edge cases', () => {
		it('should clean up item deps after removal', () => {
			const adapter = createMockAdapter();
			const r = createTrackerFactory(adapter)();

			r.itemDep('users', '1');
			r.dep('users');
			r.triggerItemRemoved('users', '1');

			// After removal, new dep should be created
			r.itemDep('users', '1');
			expect(adapter.deps).toHaveLength(3); // 2 original + 1 new
		});
	});

	describe('clear() edge cases', () => {
		it('should clear all dependencies', () => {
			const adapter = createMockAdapter();
			const r = createTrackerFactory(adapter)();

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
	});

	describe('proxy() edge cases', () => {
		it('should work without adapter', () => {
			const r = createTracker();
			const obj = {theme: 'dark'};

			const proxied = r.proxy(obj, 'config');

			// Should not throw
			expect(proxied.theme).toBe('dark');
		});

		it('should handle symbol properties', () => {
			const adapter = createMockAdapter();
			const r = createTrackerFactory(adapter)();
			const sym = Symbol('test');
			const obj = {theme: 'dark', [sym]: 'value'};

			const proxied = r.proxy(obj, 'config');

			// Symbol properties should work but not be tracked
			expect(proxied[sym]).toBe('value');
		});

		it('should maintain original object behavior', () => {
			const adapter = createMockAdapter();
			const r = createTrackerFactory(adapter)();
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
			const r = createTracker();
			const item = {id: '1', value: 42};

			const proxied = r.itemProxy(item, 'items', '1');

			// Should not throw
			expect(proxied.value).toBe(42);
		});

		it('should handle numeric ids', () => {
			const adapter = createMockAdapter();
			const r = createTrackerFactory(adapter)();
			const item = {id: 1, value: 42};

			const proxied = r.itemProxy(item, 'items', 1);

			expect(proxied.value).toBe(42);
		});
	});

	describe('deepProxy() edge cases', () => {
		it('should work without adapter', () => {
			const r = createTracker();
			const obj = {nested: {value: 42}};

			const proxied = r.deepProxy(obj, 'config');

			// Should not throw
			expect(proxied.nested.value).toBe(42);
		});

		it('should handle deeply nested objects', () => {
			const adapter = createMockAdapter();
			const r = createTrackerFactory(adapter)();
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
			const r = createTracker();
			const item = {nested: {value: 42}};

			const proxied = r.deepItemProxy(item, 'items', '1');

			// Should not throw
			expect(proxied.nested.value).toBe(42);
		});

		it('should handle numeric ids', () => {
			const adapter = createMockAdapter();
			const r = createTrackerFactory(adapter)();
			const item = {id: 1, nested: {value: 42}};

			const proxied = r.deepItemProxy(item, 'items', 1);

			expect(proxied.nested.value).toBe(42);
		});
	});
});
