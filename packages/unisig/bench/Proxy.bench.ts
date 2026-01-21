import {describe, bench} from 'vitest';
import {Scope, Tracker} from '../src/index';
import {createReactivityAdapter} from '../src/types';

// Simple mock adapter for benchmarking
const mockAdapter = createReactivityAdapter({
	create: () => ({
		depend: () => {},
		notify: () => {},
	}),
});

describe('Proxy Performance Benchmarks', () => {
	describe('Simple Proxy (Shallow)', () => {
		bench('create proxy()', () => {
			const scope = new Scope(mockAdapter);
			const obj = {name: 'Alice', score: 100};
			scope.proxy(obj, 'config');
		});

		bench('read property through proxy()', () => {
			const scope = new Scope(mockAdapter);
			const obj = {name: 'Alice', score: 100};
			const proxy = scope.proxy(obj, 'config');
			mockAdapter.create().depend();
			proxy.name;
		});

		bench('write property through proxy()', () => {
			const scope = new Scope(mockAdapter);
			const obj = {name: 'Alice', score: 100};
			const proxy = scope.proxy(obj, 'config');
			proxy.score = 200;
		});

		bench('create itemProxy()', () => {
			const scope = new Scope(mockAdapter);
			const user = {id: '1', name: 'Alice', score: 100};
			scope.itemProxy(user, 'users', '1');
		});

		bench('read property through itemProxy()', () => {
			const scope = new Scope(mockAdapter);
			const user = {id: '1', name: 'Alice', score: 100};
			const proxy = scope.itemProxy(user, 'users', '1');
			mockAdapter.create().depend();
			proxy.name;
		});

		bench('write property through itemProxy()', () => {
			const scope = new Scope(mockAdapter);
			const user = {id: '1', name: 'Alice', score: 100};
			const proxy = scope.itemProxy(user, 'users', '1');
			proxy.score = 200;
		});
	});

	describe('Deep Proxy', () => {
		bench('create deepProxy() with nested object', () => {
			const scope = new Scope(mockAdapter);
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
			scope.deepProxy(obj, 'config');
		});

		bench('read shallow property through deepProxy()', () => {
			const scope = new Scope(mockAdapter);
			const obj = {name: 'Alice', stats: {health: 100}};
			const proxy = scope.deepProxy(obj, 'config');
			mockAdapter.create().depend();
			proxy.name;
		});

		bench('read nested property through deepProxy() (1 level)', () => {
			const scope = new Scope(mockAdapter);
			const obj = {name: 'Alice', stats: {health: 100}};
			const proxy = scope.deepProxy(obj, 'config');
			mockAdapter.create().depend();
			proxy.stats.health;
		});

		bench('read deeply nested property through deepProxy() (3 levels)', () => {
			const scope = new Scope(mockAdapter);
			const obj = {
				name: 'Alice',
				stats: {
					attributes: {
						strength: 10,
					},
				},
			};
			const proxy = scope.deepProxy(obj, 'config');
			mockAdapter.create().depend();
			proxy.stats.attributes.strength;
		});

		bench('write shallow property through deepProxy()', () => {
			const scope = new Scope(mockAdapter);
			const obj = {name: 'Alice', stats: {health: 100}};
			const proxy = scope.deepProxy(obj, 'config');
			proxy.name = 'Bob';
		});

		bench('write nested property through deepProxy()', () => {
			const scope = new Scope(mockAdapter);
			const obj = {name: 'Alice', stats: {health: 100}};
			const proxy = scope.deepProxy(obj, 'config');
			proxy.stats.health = 50;
		});

		bench('create deepItemProxy()', () => {
			const scope = new Scope(mockAdapter);
			const user = {
				id: '1',
				name: 'Alice',
				stats: {
					health: 100,
					mana: 50,
				},
			};
			scope.deepItemProxy(user, 'users', '1');
		});

		bench('read nested property through deepItemProxy()', () => {
			const scope = new Scope(mockAdapter);
			const user = {
				id: '1',
				name: 'Alice',
				stats: {health: 100},
			};
			const proxy = scope.deepItemProxy(user, 'users', '1');
			mockAdapter.create().depend();
			proxy.stats.health;
		});

		bench('write nested property through deepItemProxy()', () => {
			const scope = new Scope(mockAdapter);
			const user = {
				id: '1',
				name: 'Alice',
				stats: {health: 100},
			};
			const proxy = scope.deepItemProxy(user, 'users', '1');
			proxy.stats.health = 50;
		});
	});

	describe('Array Proxy Operations', () => {
		bench('create deepProxy() with array', () => {
			const scope = new Scope(mockAdapter);
			const arr = [1, 2, 3, 4, 5];
			scope.deepProxy(arr, 'numbers');
		});

		bench('read array element through deepProxy()', () => {
			const scope = new Scope(mockAdapter);
			const arr = [1, 2, 3, 4, 5];
			const proxy = scope.deepProxy(arr, 'numbers');
			mockAdapter.create().depend();
			proxy[0];
		});

		bench('read array length through deepProxy()', () => {
			const scope = new Scope(mockAdapter);
			const arr = [1, 2, 3, 4, 5];
			const proxy = scope.deepProxy(arr, 'numbers');
			mockAdapter.create().depend();
			proxy.length;
		});

		bench('push() through deepProxy()', () => {
			const scope = new Scope(mockAdapter);
			const arr = [1, 2, 3, 4, 5];
			const proxy = scope.deepProxy(arr, 'numbers');
			proxy.push(6);
		});

		bench('pop() through deepProxy()', () => {
			const scope = new Scope(mockAdapter);
			const arr = [1, 2, 3, 4, 5];
			const proxy = scope.deepProxy(arr, 'numbers');
			proxy.pop();
		});

		bench('map() through deepProxy()', () => {
			const scope = new Scope(mockAdapter);
			const arr = [1, 2, 3, 4, 5];
			const proxy = scope.deepProxy(arr, 'numbers');
			mockAdapter.create().depend();
			proxy.map((x: number) => x * 2);
		});

		bench('forEach() through deepProxy()', () => {
			const scope = new Scope(mockAdapter);
			const arr = [1, 2, 3, 4, 5];
			const proxy = scope.deepProxy(arr, 'numbers');
			mockAdapter.create().depend();
			proxy.forEach((x: number) => x);
		});

		bench('nested array access through deepProxy()', () => {
			const scope = new Scope(mockAdapter);
			const obj = {
				users: [
					{id: '1', name: 'Alice'},
					{id: '2', name: 'Bob'},
				],
			};
			const proxy = scope.deepProxy(obj, 'data');
			mockAdapter.create().depend();
			proxy.users[0].name;
		});
	});

	describe('Proxy Identity Preservation (WeakMap Cache)', () => {
		bench('get same proxy instance (cached)', () => {
			const scope = new Scope(mockAdapter);
			const obj = {name: 'Alice', score: 100};
			const proxy1 = scope.deepProxy(obj, 'config');
			const proxy2 = scope.deepProxy(obj, 'config');
			proxy1.name;
			proxy2.name;
		});

		bench('multiple nested accesses (cache reuse)', () => {
			const scope = new Scope(mockAdapter);
			const obj = {
				stats: {
					health: 100,
					mana: 50,
				},
			};
			const proxy = scope.deepProxy(obj, 'config');
			mockAdapter.create().depend();
			proxy.stats.health;
			proxy.stats.mana;
		});
	});

	describe('Tracker Proxy Methods', () => {
		bench('Tracker.proxy()', () => {
			const tracker = new Tracker(mockAdapter);
			const obj = {name: 'Alice', score: 100};
			tracker.proxy(obj, 'config');
		});

		bench('Tracker.itemProxy()', () => {
			const tracker = new Tracker(mockAdapter);
			const user = {id: '1', name: 'Alice', score: 100};
			tracker.itemProxy(user, 'users', '1');
		});

		bench('Tracker.deepProxy()', () => {
			const tracker = new Tracker(mockAdapter);
			const obj = {
				name: 'Alice',
				stats: {health: 100},
			};
			tracker.deepProxy(obj, 'config');
		});

		bench('Tracker.deepItemProxy()', () => {
			const tracker = new Tracker(mockAdapter);
			const user = {
				id: '1',
				name: 'Alice',
				stats: {health: 100},
			};
			tracker.deepItemProxy(user, 'users', '1');
		});
	});

	describe('Proxy with Complex Objects', () => {
		bench('deepProxy() with object containing array of objects', () => {
			const scope = new Scope(mockAdapter);
			const obj = {
				users: Array.from({length: 10}, (_, i) => ({
					id: `${i}`,
					name: `User ${i}`,
					score: i * 10,
				})),
			};
			scope.deepProxy(obj, 'data');
		});

		bench('access deeply nested in array of objects', () => {
			const scope = new Scope(mockAdapter);
			const obj = {
				users: Array.from({length: 10}, (_, i) => ({
					id: `${i}`,
					name: `User ${i}`,
					stats: {health: 100, mana: 50},
				})),
			};
			const proxy = scope.deepProxy(obj, 'data');
			mockAdapter.create().depend();
			proxy.users[0].stats.health;
		});

		bench('modify array element through deepProxy()', () => {
			const scope = new Scope(mockAdapter);
			const obj = {
				users: Array.from({length: 10}, (_, i) => ({
					id: `${i}`,
					name: `User ${i}`,
				})),
			};
			const proxy = scope.deepProxy(obj, 'data');
			proxy.users[0].name = 'Modified';
		});
	});

	describe('Performance Comparison: Direct vs Proxy', () => {
		bench('direct property access (baseline)', () => {
			const obj = {name: 'Alice', score: 100};
			for (let i = 0; i < 100; i++) {
				const name = obj.name;
				const score = obj.score;
			}
		});

		bench('proxy() property access', () => {
			const scope = new Scope(mockAdapter);
			const obj = {name: 'Alice', score: 100};
			const proxy = scope.proxy(obj, 'config');
			for (let i = 0; i < 100; i++) {
				mockAdapter.create().depend();
				const name = proxy.name;
				const score = proxy.score;
			}
		});

		bench('deepProxy() property access', () => {
			const scope = new Scope(mockAdapter);
			const obj = {name: 'Alice', score: 100};
			const proxy = scope.deepProxy(obj, 'config');
			for (let i = 0; i < 100; i++) {
				mockAdapter.create().depend();
				const name = proxy.name;
				const score = proxy.score;
			}
		});
	});

	describe('Edge Cases', () => {
		bench('deepProxy() with Date object (not proxied)', () => {
			const scope = new Scope(mockAdapter);
			const obj = {createdAt: new Date(), name: 'Alice'};
			const proxy = scope.deepProxy(obj, 'data');
			mockAdapter.create().depend();
			proxy.createdAt;
		});

		bench('deepProxy() with RegExp object (not proxied)', () => {
			const scope = new Scope(mockAdapter);
			const obj = {pattern: /test/g, name: 'Alice'};
			const proxy = scope.deepProxy(obj, 'data');
			mockAdapter.create().depend();
			proxy.pattern;
		});

		bench('deepProxy() with Map object (not proxied)', () => {
			const scope = new Scope(mockAdapter);
			const obj = {data: new Map(), name: 'Alice'};
			const proxy = scope.deepProxy(obj, 'data');
			mockAdapter.create().depend();
			proxy.data;
		});
	});
});
