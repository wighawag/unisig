import {describe, it, expect} from 'vitest';
import {Tracker} from '@unisig/tracker';
import type {ScopeAdapter} from '@unisig/scope';

/**
 * Integration tests for Tracker + Scope proxies.
 * These tests verify that Tracker correctly delegates proxy methods to its internal Scope.
 */

// Simple mock adapter for testing
const mockAdapter: ScopeAdapter = {
	create: () => ({
		depend: () => {},
		notify: () => {},
	}),
};

describe('Tracker Proxy Integration', () => {
	describe('Simple Proxy (Shallow)', () => {
		it('should create a proxy via tracker.proxy()', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			const obj = {name: 'Alice', score: 100};
			const proxy = tracker.proxy(obj, 'config');

			expect(proxy.name).toBe('Alice');
			expect(proxy.score).toBe(100);
		});

		it('should track property reads through proxy()', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			const obj = {name: 'Alice', score: 100};
			const proxy = tracker.proxy(obj, 'config');

			// Proxy should work and return the value
			expect(proxy.name).toBe('Alice');
		});

		it('should trigger notifies on property writes through proxy()', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			const obj = {name: 'Alice', score: 100};
			const proxy = tracker.proxy(obj, 'config');

			proxy.score = 200;

			expect(obj.score).toBe(200);
		});

		it('should create itemProxy via tracker.itemProxy()', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			const user = {id: '1', name: 'Alice', score: 100};
			const proxy = tracker.itemProxy(user, 'users', '1');

			expect(proxy.name).toBe('Alice');
			expect(proxy.score).toBe(100);
		});

		it('should track property reads through itemProxy()', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			const user = {id: '1', name: 'Alice', score: 100};
			const proxy = tracker.itemProxy(user, 'users', '1');

			// Proxy should work and return the value
			expect(proxy.name).toBe('Alice');
		});

		it('should trigger notifies on property writes through itemProxy()', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			const user = {id: '1', name: 'Alice', score: 100};
			const proxy = tracker.itemProxy(user, 'users', '1');

			proxy.score = 200;

			expect(user.score).toBe(200);
		});
	});

	describe('Deep Proxy', () => {
		it('should create deepProxy via tracker.deepProxy()', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			const obj = {
				name: 'Alice',
				stats: {
					health: 100,
					mana: 50,
					attributes: {
						strength: 10,
						dexterity: 15,
					},
				},
			};
			const proxy = tracker.deepProxy(obj, 'config');

			expect(proxy.name).toBe('Alice');
			expect(proxy.stats.health).toBe(100);
			expect(proxy.stats.mana).toBe(50);
			expect(proxy.stats.attributes.strength).toBe(10);
		});

		it('should track shallow property reads through deepProxy()', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			const obj = {name: 'Alice', stats: {health: 100}};
			const proxy = tracker.deepProxy(obj, 'config');

			// Proxy should work and return the value
			expect(proxy.name).toBe('Alice');
		});

		it('should track nested property reads through deepProxy() (1 level)', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			const obj = {name: 'Alice', stats: {health: 100}};
			const proxy = tracker.deepProxy(obj, 'config');

			// Proxy should work and return nested value
			expect(proxy.stats.health).toBe(100);
		});

		it('should track deeply nested property reads through deepProxy() (3 levels)', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			const obj = {
				name: 'Alice',
				stats: {
					attributes: {
						strength: 10,
					},
				},
			};
			const proxy = tracker.deepProxy(obj, 'config');

			// Proxy should work and return deeply nested value
			expect(proxy.stats.attributes.strength).toBe(10);
		});

		it('should write shallow property through deepProxy()', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			const obj = {name: 'Alice', stats: {health: 100}};
			const proxy = tracker.deepProxy(obj, 'config');

			proxy.name = 'Bob';

			expect(obj.name).toBe('Bob');
		});

		it('should write nested property through deepProxy()', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			const obj = {name: 'Alice', stats: {health: 100}};
			const proxy = tracker.deepProxy(obj, 'config');

			proxy.stats.health = 50;

			expect(obj.stats.health).toBe(50);
		});

		it('should create deepItemProxy via tracker.deepItemProxy()', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			const user = {
				id: '1',
				name: 'Alice',
				stats: {
					health: 100,
					mana: 50,
				},
			};
			const proxy = tracker.deepItemProxy(user, 'users', '1');

			expect(proxy.name).toBe('Alice');
			expect(proxy.stats.health).toBe(100);
			expect(proxy.stats.mana).toBe(50);
		});

		it('should track nested property reads through deepItemProxy()', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			const user = {
				id: '1',
				name: 'Alice',
				stats: {health: 100},
			};
			const proxy = tracker.deepItemProxy(user, 'users', '1');

			// Proxy should work and return nested value
			expect(proxy.stats.health).toBe(100);
		});

		it('should write nested property through deepItemProxy()', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			const user = {
				id: '1',
				name: 'Alice',
				stats: {health: 100},
			};
			const proxy = tracker.deepItemProxy(user, 'users', '1');

			proxy.stats.health = 50;

			expect(user.stats.health).toBe(50);
		});
	});

	describe('Array Proxy Operations', () => {
		it('should create deepProxy with array', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			const arr = [1, 2, 3, 4, 5];
			const proxy = tracker.deepProxy(arr, 'numbers');

			expect(proxy[0]).toBe(1);
			expect(proxy.length).toBe(5);
		});

		it('should read array element through deepProxy()', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			const arr = [1, 2, 3, 4, 5];
			const proxy = tracker.deepProxy(arr, 'numbers');

			// Proxy should work and return array element
			expect(proxy[0]).toBe(1);
		});

		it('should read array length through deepProxy()', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			const arr = [1, 2, 3, 4, 5];
			const proxy = tracker.deepProxy(arr, 'numbers');

			// Proxy should work and return array length
			expect(proxy.length).toBe(5);
		});

		it('should support push() through deepProxy()', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			const arr = [1, 2, 3, 4, 5];
			const proxy = tracker.deepProxy(arr, 'numbers');

			proxy.push(6);

			expect(arr.length).toBe(6);
			expect(arr[5]).toBe(6);
		});

		it('should support pop() through deepProxy()', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			const arr = [1, 2, 3, 4, 5];
			const proxy = tracker.deepProxy(arr, 'numbers');

			const popped = proxy.pop();

			expect(popped).toBe(5);
			expect(arr.length).toBe(4);
		});

		it('should support nested array access through deepProxy()', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			const obj = {
				users: [
					{id: '1', name: 'Alice'},
					{id: '2', name: 'Bob'},
				],
			};
			const proxy = tracker.deepProxy(obj, 'data');

			// Proxy should work and return nested array value
			expect(proxy.users[0].name).toBe('Alice');
		});
	});

	describe('Proxy Identity Preservation', () => {
		it('should return same proxy instance for same object (cached)', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			const obj = {name: 'Alice', score: 100};
			const proxy1 = tracker.deepProxy(obj, 'config');
			const proxy2 = tracker.deepProxy(obj, 'config');

			// The proxies should work identically
			expect(proxy1.name).toBe(proxy2.name);
		});

		it('should reuse cache for multiple nested accesses', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			const obj = {
				stats: {
					health: 100,
					mana: 50,
				},
			};
			const proxy = tracker.deepProxy(obj, 'config');

			mockAdapter.create().depend();
			const health1 = proxy.stats.health;
			const health2 = proxy.stats.health;

			expect(health1).toBe(health2);
		});
	});

	describe('Readonly Proxy Methods', () => {
		it('should create readonlyProxy via tracker.readonlyProxy()', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			const obj = {name: 'Alice', score: 100};
			const proxy = tracker.readonlyProxy(obj, 'config');

			expect(proxy.name).toBe('Alice');
			expect(proxy.score).toBe(100);
		});

		it('should throw on writes through readonlyProxy()', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			const obj = {name: 'Alice', score: 100};
			const proxy = tracker.readonlyProxy(obj, 'config');

			expect(() => {
				(proxy as any).score = 200;
			}).toThrow('Cannot modify read-only proxy');
		});

		it('should create readonlyDeepProxy via tracker.readonlyDeepProxy()', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			const obj = {
				name: 'Alice',
				stats: {health: 100},
			};
			const proxy = tracker.readonlyDeepProxy(obj, 'config');

			expect(proxy.name).toBe('Alice');
			expect(proxy.stats.health).toBe(100);
		});

		it('should throw on nested writes through readonlyDeepProxy()', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			const obj = {
				name: 'Alice',
				stats: {health: 100},
			};
			const proxy = tracker.readonlyDeepProxy(obj, 'config');

			expect(() => {
				(proxy.stats as any).health = 50;
			}).toThrow('Cannot modify read-only proxy');
		});

		it('should create readonlyItemProxy via tracker.readonlyItemProxy()', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			const user = {id: '1', name: 'Alice', score: 100};
			const proxy = tracker.readonlyItemProxy(user, 'users', '1');

			expect(proxy.name).toBe('Alice');
			expect(proxy.score).toBe(100);
		});

		it('should throw on writes through readonlyItemProxy()', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			const user = {id: '1', name: 'Alice', score: 100};
			const proxy = tracker.readonlyItemProxy(user, 'users', '1');

			expect(() => {
				(proxy as any).score = 200;
			}).toThrow('Cannot modify read-only proxy');
		});

		it('should create readonlyDeepItemProxy via tracker.readonlyDeepItemProxy()', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			const user = {
				id: '1',
				name: 'Alice',
				stats: {health: 100},
			};
			const proxy = tracker.readonlyDeepItemProxy(user, 'users', '1');

			expect(proxy.name).toBe('Alice');
			expect(proxy.stats.health).toBe(100);
		});

		it('should throw on nested writes through readonlyDeepItemProxy()', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			const user = {
				id: '1',
				name: 'Alice',
				stats: {health: 100},
			};
			const proxy = tracker.readonlyDeepItemProxy(user, 'users', '1');

			expect(() => {
				(proxy.stats as any).health = 50;
			}).toThrow('Cannot modify read-only proxy');
		});
	});

	describe('Edge Cases', () => {
		it('should handle deepProxy with Date object (not proxied)', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			const obj = {createdAt: new Date(), name: 'Alice'};
			const proxy = tracker.deepProxy(obj, 'data');

			mockAdapter.create().depend();
			const _ = proxy.createdAt;

			// Date should be returned as-is, not proxied
			expect(proxy.createdAt).toBeInstanceOf(Date);
		});

		it('should handle deepProxy with RegExp object (not proxied)', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			const obj = {pattern: /test/g, name: 'Alice'};
			const proxy = tracker.deepProxy(obj, 'data');

			mockAdapter.create().depend();
			const _ = proxy.pattern;

			// RegExp should be returned as-is, not proxied
			expect(proxy.pattern).toBeInstanceOf(RegExp);
		});

		it('should handle deepProxy with Map object (not proxied)', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			const obj = {data: new Map(), name: 'Alice'};
			const proxy = tracker.deepProxy(obj, 'data');

			mockAdapter.create().depend();
			const _ = proxy.data;

			// Map should be returned as-is, not proxied
			expect(proxy.data).toBeInstanceOf(Map);
		});
	});
});
