import {describe, expect, it, vi} from 'vitest';
import {Scope} from '../src/Scope.js';

describe('Scope Readonly Proxies', () => {
	describe('readonlyProxy', () => {
		it('should track property reads', () => {
			const scope = new Scope();
			const mockDep = {depend: vi.fn(), notify: vi.fn()};
			scope.setAdapter({
				create: () => mockDep,
				isInScope: () => true,
			});

			const obj = {name: 'test', value: 123};
			const proxy = scope.readonlyProxy(obj, 'testKey');

			// Read properties
			expect(proxy.name).toBe('test');
			expect(mockDep.depend).toHaveBeenCalled();

			expect(proxy.value).toBe(123);
			expect(mockDep.depend).toHaveBeenCalled();
		});

		it('should throw on property writes', () => {
			const scope = new Scope();
			const mockDep = {depend: vi.fn(), notify: vi.fn()};
			scope.setAdapter({
				create: () => mockDep,
				isInScope: () => true,
			});

			const obj = {name: 'test'};
			const proxy = scope.readonlyProxy(obj, 'testKey');

			expect(() => {
				(proxy as any).name = 'new';
			}).toThrow(
				"Cannot modify read-only proxy. Attempted to set property 'name' on key 'testKey'",
			);
		});

		it('should throw on property delete', () => {
			const scope = new Scope();
			const mockDep = {depend: vi.fn(), notify: vi.fn()};
			scope.setAdapter({
				create: () => mockDep,
				isInScope: () => true,
			});

			const obj = {name: 'test'};
			const proxy = scope.readonlyProxy(obj, 'testKey');

			expect(() => {
				delete (proxy as any).name;
			}).toThrow(
				"Cannot modify read-only proxy. Attempted to delete property 'name' on key 'testKey'",
			);
		});

		it('should not track outside reactive scope', () => {
			const scope = new Scope();
			const mockDep = {depend: vi.fn(), notify: vi.fn()};
			scope.setAdapter({
				create: () => mockDep,
				isInScope: () => false,
			});

			const obj = {name: 'test'};
			const proxy = scope.readonlyProxy(obj, 'testKey');

			// Read property - should not track
			expect(proxy.name).toBe('test');
			expect(mockDep.depend).not.toHaveBeenCalled();
		});
	});

	describe('readonlyItemProxy', () => {
		it('should track property reads for item', () => {
			const scope = new Scope();
			const mockDep = {depend: vi.fn(), notify: vi.fn()};
			scope.setAdapter({
				create: () => mockDep,
				isInScope: () => true,
			});

			const obj = {name: 'test', value: 123};
			const proxy = scope.readonlyItemProxy(obj, 'users', 'user1');

			// Read properties
			expect(proxy.name).toBe('test');
			expect(mockDep.depend).toHaveBeenCalled();

			expect(proxy.value).toBe(123);
			expect(mockDep.depend).toHaveBeenCalled();
		});

		it('should throw on property writes for item', () => {
			const scope = new Scope();
			const mockDep = {depend: vi.fn(), notify: vi.fn()};
			scope.setAdapter({
				create: () => mockDep,
				isInScope: () => true,
			});

			const obj = {name: 'test'};
			const proxy = scope.readonlyItemProxy(obj, 'users', 'user1');

			expect(() => {
				(proxy as any).name = 'new';
			}).toThrow(
				"Cannot modify read-only proxy. Attempted to set property 'name' on item 'user1' in collection 'users'",
			);
		});

		it('should throw on property delete for item', () => {
			const scope = new Scope();
			const mockDep = {depend: vi.fn(), notify: vi.fn()};
			scope.setAdapter({
				create: () => mockDep,
				isInScope: () => true,
			});

			const obj = {name: 'test'};
			const proxy = scope.readonlyItemProxy(obj, 'users', 'user1');

			expect(() => {
				delete (proxy as any).name;
			}).toThrow(
				"Cannot modify read-only proxy. Attempted to delete property 'name' on item 'user1' in collection 'users'",
			);
		});
	});

	describe('readonlyDeepProxy', () => {
		it('should track nested property reads with dot notation', () => {
			const scope = new Scope();
			const mockDep = {depend: vi.fn(), notify: vi.fn()};
			scope.setAdapter({
				create: () => mockDep,
				isInScope: () => true,
			});

			const obj = {
				theme: {
					colors: {
						primary: '#fff',
						secondary: '#000',
					},
				},
			};
			const proxy = scope.readonlyDeepProxy(obj, 'config');

			// Read nested properties
			expect(proxy.theme.colors.primary).toBe('#fff');
			expect(mockDep.depend).toHaveBeenCalled();

			expect(proxy.theme.colors.secondary).toBe('#000');
			expect(mockDep.depend).toHaveBeenCalled();
		});

		it('should throw on nested property writes', () => {
			const scope = new Scope();
			const mockDep = {depend: vi.fn(), notify: vi.fn()};
			scope.setAdapter({
				create: () => mockDep,
				isInScope: () => true,
			});

			const obj = {
				theme: {
					colors: {
						primary: '#fff',
					},
				},
			};
			const proxy = scope.readonlyDeepProxy(obj, 'config');

			expect(() => {
				(proxy as any).theme.colors.primary = '#000';
			}).toThrow(
				"Cannot modify read-only proxy. Attempted to set property 'primary' on key 'config'",
			);
		});

		it('should track array accesses', () => {
			const scope = new Scope();
			const mockDep = {depend: vi.fn(), notify: vi.fn()};
			scope.setAdapter({
				create: () => mockDep,
				isInScope: () => true,
			});

			const obj = {
				tags: ['tag1', 'tag2', 'tag3'],
			};
			const proxy = scope.readonlyDeepProxy(obj, 'post');

			// Read array elements
			expect(proxy.tags[0]).toBe('tag1');
			expect(mockDep.depend).toHaveBeenCalled();

			expect(proxy.tags[1]).toBe('tag2');
			expect(mockDep.depend).toHaveBeenCalled();
		});

		it('should throw on array mutation methods', () => {
			const scope = new Scope();
			const mockDep = {depend: vi.fn(), notify: vi.fn()};
			scope.setAdapter({
				create: () => mockDep,
				isInScope: () => true,
			});

			const obj = {
				tags: ['tag1', 'tag2'],
			};
			const proxy = scope.readonlyDeepProxy(obj, 'post');

			expect(() => {
				(proxy as any).tags.push('tag3');
			}).toThrow(/Cannot modify read-only proxy/);

			expect(() => {
				(proxy as any).tags.pop();
			}).toThrow(/Cannot modify read-only proxy/);
		});

		it('should throw on array index writes', () => {
			const scope = new Scope();
			const mockDep = {depend: vi.fn(), notify: vi.fn()};
			scope.setAdapter({
				create: () => mockDep,
				isInScope: () => true,
			});

			const obj = {
				tags: ['tag1', 'tag2'],
			};
			const proxy = scope.readonlyDeepProxy(obj, 'post');

			expect(() => {
				(proxy as any).tags[0] = 'new';
			}).toThrow(/Cannot modify read-only proxy/);
		});
	});

	describe('readonlyDeepItemProxy', () => {
		it('should track nested property reads for item with dot notation', () => {
			const scope = new Scope();
			const mockDep = {depend: vi.fn(), notify: vi.fn()};
			scope.setAdapter({
				create: () => mockDep,
				isInScope: () => true,
			});

			const obj = {
				stats: {
					health: 100,
					mana: 50,
				},
			};
			const proxy = scope.readonlyDeepItemProxy(obj, 'users', 'user1');

			// Read nested properties
			expect(proxy.stats.health).toBe(100);
			expect(mockDep.depend).toHaveBeenCalled();

			expect(proxy.stats.mana).toBe(50);
			expect(mockDep.depend).toHaveBeenCalled();
		});

		it('should throw on nested property writes for item', () => {
			const scope = new Scope();
			const mockDep = {depend: vi.fn(), notify: vi.fn()};
			scope.setAdapter({
				create: () => mockDep,
				isInScope: () => true,
			});

			const obj = {
				stats: {
					health: 100,
				},
			};
			const proxy = scope.readonlyDeepItemProxy(obj, 'users', 'user1');

			expect(() => {
				(proxy as any).stats.health = 50;
			}).toThrow(
				"Cannot modify read-only proxy. Attempted to set property 'health' on item 'user1' in collection 'users'",
			);
		});

		it('should track array accesses for item', () => {
			const scope = new Scope();
			const mockDep = {depend: vi.fn(), notify: vi.fn()};
			scope.setAdapter({
				create: () => mockDep,
				isInScope: () => true,
			});

			const obj = {
				items: [1, 2, 3],
			};
			const proxy = scope.readonlyDeepItemProxy(obj, 'users', 'user1');

			// Read array elements
			expect(proxy.items[0]).toBe(1);
			expect(mockDep.depend).toHaveBeenCalled();

			expect(proxy.items[1]).toBe(2);
			expect(mockDep.depend).toHaveBeenCalled();
		});
	});

	describe('proxy identity preservation', () => {
		it('should return same nested proxy instance for same object within same proxy', () => {
			const scope = new Scope();
			const mockDep = {depend: vi.fn(), notify: vi.fn()};
			scope.setAdapter({
				create: () => mockDep,
				isInScope: () => true,
			});

			const nestedObj = {value: 123};
			const obj = {nested: nestedObj};
			const proxy = scope.readonlyDeepProxy(obj, 'key');
			
			// Access nested object multiple times through same proxy
			const nested1 = proxy.nested;
			const nested2 = proxy.nested;

			// Nested objects should be same instance due to caching within same proxy
			expect(nested1).toBe(nested2);
		});
	});

	describe('skip proxy types', () => {
		it('should not proxy Date objects', () => {
			const scope = new Scope();
			const mockDep = {depend: vi.fn(), notify: vi.fn()};
			scope.setAdapter({
				create: () => mockDep,
				isInScope: () => true,
			});

			const obj = {date: new Date('2024-01-01')};
			const proxy = scope.readonlyDeepProxy(obj, 'key');

			expect(proxy.date).toBeInstanceOf(Date);
		});

		it('should not proxy RegExp objects', () => {
			const scope = new Scope();
			const mockDep = {depend: vi.fn(), notify: vi.fn()};
			scope.setAdapter({
				create: () => mockDep,
				isInScope: () => true,
			});

			const obj = {regex: /test/};
			const proxy = scope.readonlyDeepProxy(obj, 'key');

			expect(proxy.regex).toBeInstanceOf(RegExp);
		});

		it('should not proxy Map objects', () => {
			const scope = new Scope();
			const mockDep = {depend: vi.fn(), notify: vi.fn()};
			scope.setAdapter({
				create: () => mockDep,
				isInScope: () => true,
			});

			const obj = {map: new Map([['key', 'value']])};
			const proxy = scope.readonlyDeepProxy(obj, 'key');

			expect(proxy.map).toBeInstanceOf(Map);
		});

		it('should not proxy Set objects', () => {
			const scope = new Scope();
			const mockDep = {depend: vi.fn(), notify: vi.fn()};
			scope.setAdapter({
				create: () => mockDep,
				isInScope: () => true,
			});

			const obj = {set: new Set([1, 2, 3])};
			const proxy = scope.readonlyDeepProxy(obj, 'key');

			expect(proxy.set).toBeInstanceOf(Set);
		});
	});
});