import {describe, it, expect, vi} from 'vitest';
import {Scope} from '../src/Scope.js';
import type {ScopeAdapter, Dependency} from '../src/types.js';

// Mock adapter that tracks all calls
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

describe('Scope - Deep Proxies', () => {
	describe('deepProxy()', () => {
		it('should track nested property access with dot notation', () => {
			const adapter = createMockAdapter();
			const scope = new Scope(adapter);

			const obj = {
				config: {
					theme: {
						colors: {
							primary: 'blue',
						},
					},
				},
			};

			const proxied = scope.deepProxy(obj, 'config');
			const _ = proxied.config.theme.colors.primary;

			// Should track the nested path
			expect(adapter.deps.length).toBeGreaterThan(0);
		});

		it('should trigger nested property writes', () => {
			const adapter = createMockAdapter();
			const scope = new Scope(adapter);

			const obj = {
				config: {
					theme: 'dark',
				},
			};

			const proxied = scope.deepProxy(obj, 'config');

			// Read to create dependency
			const _ = proxied.config.theme;

			// Write
			proxied.config.theme = 'light';

			// Should have triggered notify
			const notifyCalls = adapter.deps.filter((d) => d.notify.mock.calls.length > 0);
			expect(notifyCalls.length).toBeGreaterThan(0);
		});

		it('should maintain proxy identity for same nested object', () => {
			const adapter = createMockAdapter();
			const scope = new Scope(adapter);

			const obj = {
				nested: {
					value: 42,
				},
			};

			const proxied = scope.deepProxy(obj, 'config');
			const nested1 = proxied.nested;
			const nested2 = proxied.nested;

			// Same proxy instance due to WeakMap caching
			expect(nested1).toBe(nested2);
		});

		it('should not proxy Date objects', () => {
			const adapter = createMockAdapter();
			const scope = new Scope(adapter);

			const obj = {
				date: new Date('2024-01-01'),
			};

			const proxied = scope.deepProxy(obj, 'config');
			const date = proxied.date;

			// Should return the actual Date, not a proxy
			expect(date).toBeInstanceOf(Date);
			expect(date.getTime()).toBe(new Date('2024-01-01').getTime());
		});

		it('should not proxy RegExp objects', () => {
			const adapter = createMockAdapter();
			const scope = new Scope(adapter);

			const obj = {
				pattern: /test/g,
			};

			const proxied = scope.deepProxy(obj, 'config');
			const pattern = proxied.pattern;

			// Should return the actual RegExp, not a proxy
			expect(pattern).toBeInstanceOf(RegExp);
			expect(pattern.test('test')).toBe(true);
		});

		it('should not proxy Map objects', () => {
			const adapter = createMockAdapter();
			const scope = new Scope(adapter);

			const obj = {
				map: new Map([['key', 'value']]),
			};

			const proxied = scope.deepProxy(obj, 'config');
			const map = proxied.map;

			// Should return the actual Map, not a proxy
			expect(map).toBeInstanceOf(Map);
			expect(map.get('key')).toBe('value');
		});

		it('should not proxy Set objects', () => {
			const adapter = createMockAdapter();
			const scope = new Scope(adapter);

			const obj = {
				set: new Set([1, 2, 3]),
			};

			const proxied = scope.deepProxy(obj, 'config');
			const set = proxied.set;

			// Should return the actual Set, not a proxy
			expect(set).toBeInstanceOf(Set);
			expect(set.has(2)).toBe(true);
		});

		it('should not proxy WeakMap objects', () => {
			const adapter = createMockAdapter();
			const scope = new Scope(adapter);

			const obj = {
				weakMap: new WeakMap(),
			};

			const proxied = scope.deepProxy(obj, 'config');
			const weakMap = proxied.weakMap;

			// Should return the actual WeakMap, not a proxy
			expect(weakMap).toBeInstanceOf(WeakMap);
		});

		it('should not proxy WeakSet objects', () => {
			const adapter = createMockAdapter();
			const scope = new Scope(adapter);

			const obj = {
				weakSet: new WeakSet(),
			};

			const proxied = scope.deepProxy(obj, 'config');
			const weakSet = proxied.weakSet;

			// Should return the actual WeakSet, not a proxy
			expect(weakSet).toBeInstanceOf(WeakSet);
		});

		it('should not proxy Error objects', () => {
			const adapter = createMockAdapter();
			const scope = new Scope(adapter);

			const obj = {
				error: new Error('test error'),
			};

			const proxied = scope.deepProxy(obj, 'config');
			const error = proxied.error;

			// Should return the actual Error, not a proxy
			expect(error).toBeInstanceOf(Error);
			expect(error.message).toBe('test error');
		});

		it('should not proxy Promise-like objects', () => {
			const adapter = createMockAdapter();
			const scope = new Scope(adapter);

			const promise = Promise.resolve('value');
			const obj = {
				promise,
			};

			const proxied = scope.deepProxy(obj, 'config');
			const result = proxied.promise;

			// Should return the actual Promise, not a proxy
			expect(result).toBe(promise);
		});

		it('should handle arrays with index tracking', () => {
			const adapter = createMockAdapter();
			const scope = new Scope(adapter);

			const obj = {
				items: [1, 2, 3],
			};

			const proxied = scope.deepProxy(obj, 'config');
			const first = proxied.items[0];

			expect(first).toBe(1);
			expect(adapter.deps.length).toBeGreaterThan(0);
		});

		it('should track array length', () => {
			const adapter = createMockAdapter();
			const scope = new Scope(adapter);

			const obj = {
				items: [1, 2, 3],
			};

			const proxied = scope.deepProxy(obj, 'config');
			const length = proxied.items.length;

			expect(length).toBe(3);
			expect(adapter.deps.length).toBeGreaterThan(0);
		});

		it('should track array mutation methods', () => {
			const adapter = createMockAdapter();
			const scope = new Scope(adapter);

			const obj = {
				items: [1, 2, 3],
			};

			const proxied = scope.deepProxy(obj, 'config');
			proxied.items.push(4);

			// Should have triggered notify for the array
			const notifyCalls = adapter.deps.filter((d) => d.notify.mock.calls.length > 0);
			expect(notifyCalls.length).toBeGreaterThan(0);
		});

		it('should track array.splice() mutations', () => {
			const adapter = createMockAdapter();
			const scope = new Scope(adapter);

			const obj = {
				items: [1, 2, 3, 4],
			};

			const proxied = scope.deepProxy(obj, 'config');
			proxied.items.splice(1, 1);

			// Should have triggered notify
			const notifyCalls = adapter.deps.filter((d) => d.notify.mock.calls.length > 0);
			expect(notifyCalls.length).toBeGreaterThan(0);
		});

		it('should track array.pop() mutations', () => {
			const adapter = createMockAdapter();
			const scope = new Scope(adapter);

			const obj = {
				items: [1, 2, 3],
			};

			const proxied = scope.deepProxy(obj, 'config');
			proxied.items.pop();

			// Should have triggered notify
			const notifyCalls = adapter.deps.filter((d) => d.notify.mock.calls.length > 0);
			expect(notifyCalls.length).toBeGreaterThan(0);
		});

		it('should handle nested arrays', () => {
			const adapter = createMockAdapter();
			const scope = new Scope(adapter);

			const obj = {
				matrix: [
					[1, 2],
					[3, 4],
				],
			};

			const proxied = scope.deepProxy(obj, 'config');
			const value = proxied.matrix[0][1];

			expect(value).toBe(2);
			expect(adapter.deps.length).toBeGreaterThan(0);
		});

		it('should not create infinite loops with circular references', () => {
			const adapter = createMockAdapter();
			const scope = new Scope(adapter);

			const obj: any = {
				name: 'test',
			};
			obj.self = obj;

			const proxied = scope.deepProxy(obj, 'config');
			const result = proxied.self.self.name;

			expect(result).toBe('test');
		});
	});

	describe('deepItemProxy()', () => {
		it('should track nested property access for collection items', () => {
			const adapter = createMockAdapter();
			const scope = new Scope(adapter);

			const item = {
				stats: {
					health: 100,
					mana: 50,
				},
			};

			const proxied = scope.deepItemProxy(item, 'players', '1');
			const health = proxied.stats.health;

			expect(health).toBe(100);
			expect(adapter.deps.length).toBeGreaterThan(0);
		});

		it('should trigger nested property writes for collection items', () => {
			const adapter = createMockAdapter();
			const scope = new Scope(adapter);

			const item = {
				stats: {
					health: 100,
				},
			};

			const proxied = scope.deepItemProxy(item, 'players', '1');

			// Read to create dependency
			const _ = proxied.stats.health;

			// Write
			proxied.stats.health = 50;

			// Should have triggered notify
			const notifyCalls = adapter.deps.filter((d) => d.notify.mock.calls.length > 0);
			expect(notifyCalls.length).toBeGreaterThan(0);
		});

		it('should maintain proxy identity for same nested item object', () => {
			const adapter = createMockAdapter();
			const scope = new Scope(adapter);

			const item = {
				nested: {
					value: 42,
				},
			};

			const proxied = scope.deepItemProxy(item, 'players', '1');
			const nested1 = proxied.nested;
			const nested2 = proxied.nested;

			// Same proxy instance due to WeakMap caching
			expect(nested1).toBe(nested2);
		});

		it('should handle arrays in collection items', () => {
			const adapter = createMockAdapter();
			const scope = new Scope(adapter);

			const item = {
				inventory: ['sword', 'shield'],
			};

			const proxied = scope.deepItemProxy(item, 'players', '1');
			const firstItem = proxied.inventory[0];

			expect(firstItem).toBe('sword');
			expect(adapter.deps.length).toBeGreaterThan(0);
		});

		it('should not proxy unsupported types in collection items', () => {
			const adapter = createMockAdapter();
			const scope = new Scope(adapter);

			const item = {
				date: new Date('2024-01-01'),
			};

			const proxied = scope.deepItemProxy(item, 'players', '1');
			const date = proxied.date;

			expect(date).toBeInstanceOf(Date);
			expect(date.getTime()).toBe(new Date('2024-01-01').getTime());
		});
	});

	describe('deep proxy array methods', () => {
		it('should track forEach iteration', () => {
			const adapter = createMockAdapter();
			const scope = new Scope(adapter);

			const obj = {
				items: [1, 2, 3],
			};

			const proxied = scope.deepProxy(obj, 'config');
			proxied.items.forEach((item) => item);

			// Should track the array during iteration
			expect(adapter.deps.length).toBeGreaterThan(0);
		});

		it('should track map iteration', () => {
			const adapter = createMockAdapter();
			const scope = new Scope(adapter);

			const obj = {
				items: [1, 2, 3],
			};

			const proxied = scope.deepProxy(obj, 'config');
			proxied.items.map((item) => item * 2);

			// Should track the array during iteration
			expect(adapter.deps.length).toBeGreaterThan(0);
		});

		it('should track filter iteration', () => {
			const adapter = createMockAdapter();
			const scope = new Scope(adapter);

			const obj = {
				items: [1, 2, 3, 4, 5],
			};

			const proxied = scope.deepProxy(obj, 'config');
			proxied.items.filter((item) => item % 2 === 0);

			// Should track the array during iteration
			expect(adapter.deps.length).toBeGreaterThan(0);
		});

		it('should track find iteration', () => {
			const adapter = createMockAdapter();
			const scope = new Scope(adapter);

			const obj = {
				items: [1, 2, 3],
			};

			const proxied = scope.deepProxy(obj, 'config');
			proxied.items.find((item) => item === 2);

			// Should track the array during iteration
			expect(adapter.deps.length).toBeGreaterThan(0);
		});

		it('should track reduce iteration', () => {
			const adapter = createMockAdapter();
			const scope = new Scope(adapter);

			const obj = {
				items: [1, 2, 3],
			};

			const proxied = scope.deepProxy(obj, 'config');
			proxied.items.reduce((sum, item) => sum + item, 0);

			// Should track the array during iteration
			expect(adapter.deps.length).toBeGreaterThan(0);
		});
	});
});
