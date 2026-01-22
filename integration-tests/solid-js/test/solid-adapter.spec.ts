import {describe, it, expect, vi} from 'vitest';
import {createRoot} from 'solid-js';
import solidAdapter from '@unisig/solid-js';
import unisig from 'unisig';

describe('SolidJS Integration Tests', () => {
	describe('effect()', () => {
		it('should run effect immediately', () => {
			const fn = vi.fn();
			const cleanup = solidAdapter.effect(fn);
			expect(fn).toHaveBeenCalledTimes(1);
			cleanup();
		});

		it('should return cleanup function', () => {
			const cleanup = solidAdapter.effect(() => {});
			expect(typeof cleanup).toBe('function');
			cleanup();
		});

		it('should call user cleanup when disposed', () => {
			const userCleanup = vi.fn();
			const cleanup = solidAdapter.effect(() => userCleanup);
			cleanup();
			expect(userCleanup).toHaveBeenCalledTimes(1);
		});
	});

	describe('reactive() - objects', () => {
		it('should create reactive state for objects', () => {
			const {reactive} = unisig(solidAdapter);
			const obj = reactive({name: 'Alice', age: 30});

			expect(obj.name).toBe('Alice');
			expect(obj.age).toBe(30);
		});

		it('should trigger reactivity when properties change', () => {
			const {reactive, effect} = unisig(solidAdapter);
			const obj = reactive({count: 0});
			const values: number[] = [];

			const cleanup = effect(() => {
				values.push(obj.count);
			});

			expect(values).toEqual([0]);

			obj.count = 1;
			// Solid's reactivity is synchronous
			expect(values).toEqual([0, 1]);

			obj.count = 2;
			expect(values).toEqual([0, 1, 2]);

			cleanup();
		});

		it('should support nested objects', () => {
			const {reactive, effect} = unisig(solidAdapter);
			const obj = reactive({user: {name: 'Alice', profile: {bio: 'Hello'}}});
			const names: string[] = [];

			const cleanup = effect(() => {
				names.push(obj.user.name);
			});

			expect(names).toEqual(['Alice']);

			obj.user.name = 'Bob';
			expect(names).toEqual(['Alice', 'Bob']);

			cleanup();
		});
	});

	describe('reactive() - primitives', () => {
		it('should wrap primitives in { value: T }', () => {
			const {reactive} = unisig(solidAdapter);
			const count = reactive(5);

			// Primitives should be boxed
			expect(count.value).toBe(5);
		});

		it('should allow setting primitive values via .value', () => {
			const {reactive} = unisig(solidAdapter);
			const count = reactive(5);

			count.value = 10;
			expect(count.value).toBe(10);
		});

		it('should trigger reactivity when primitive value changes', () => {
			const {reactive, effect} = unisig(solidAdapter);
			const count = reactive(0);
			const values: number[] = [];

			const cleanup = effect(() => {
				values.push(count.value);
			});

			expect(values).toEqual([0]);

			count.value = 1;
			expect(values).toEqual([0, 1]);

			count.value = 2;
			expect(values).toEqual([0, 1, 2]);

			cleanup();
		});

		it('should work with string primitives', () => {
			const {reactive, effect} = unisig(solidAdapter);
			const name = reactive('Alice');
			const names: string[] = [];

			const cleanup = effect(() => {
				names.push(name.value);
			});

			expect(names).toEqual(['Alice']);

			name.value = 'Bob';
			expect(names).toEqual(['Alice', 'Bob']);

			cleanup();
		});
	});

	describe('signal()', () => {
		it('should create signal with get/set interface', () => {
			const {signal} = unisig(solidAdapter);
			const count = signal(0);

			expect(count.get()).toBe(0);
			count.set(5);
			expect(count.get()).toBe(5);
		});

		it('should trigger reactivity when signal changes', () => {
			const {signal, effect} = unisig(solidAdapter);
			const count = signal(0);
			const values: number[] = [];

			const cleanup = effect(() => {
				values.push(count.get());
			});

			expect(values).toEqual([0]);

			count.set(1);
			expect(values).toEqual([0, 1]);

			count.set(2);
			expect(values).toEqual([0, 1, 2]);

			cleanup();
		});
	});

	describe('isInScope()', () => {
		it('should return true inside createRoot', () => {
			let inScope = false;
			createRoot(() => {
				inScope = solidAdapter.isInScope?.() ?? false;
			});
			expect(inScope).toBe(true);
		});

		it('should return false outside reactive scope', () => {
			expect(solidAdapter.isInScope?.()).toBe(false);
		});
	});

	describe('create() - dependency tracking', () => {
		it('should create depend/notify pair', () => {
			const dep = solidAdapter.create();
			expect(typeof dep.depend).toBe('function');
			expect(typeof dep.notify).toBe('function');
		});

		it('should track dependencies in reactive context', () => {
			const dep = solidAdapter.create();
			const values: number[] = [];
			let count = 0;

			// Use the adapter's effect function instead of raw createEffect
			const cleanup = solidAdapter.effect(() => {
				dep.depend();
				values.push(count);
			});

			expect(values).toEqual([0]);

			count = 1;
			dep.notify();
			// Effects run synchronously
			expect(values).toEqual([0, 1]);

			cleanup();
		});
	});

	describe('Combined usage', () => {
		it('should work with multiple reactive sources', () => {
			const {reactive, signal, effect} = unisig(solidAdapter);

			const user = reactive({name: 'Alice'});
			const count = signal(0);
			const primitive = reactive(100);

			const results: string[] = [];

			const cleanup = effect(() => {
				results.push(`${user.name}-${count.get()}-${primitive.value}`);
			});

			expect(results).toEqual(['Alice-0-100']);

			user.name = 'Bob';
			expect(results).toEqual(['Alice-0-100', 'Bob-0-100']);

			count.set(1);
			expect(results).toEqual(['Alice-0-100', 'Bob-0-100', 'Bob-1-100']);

			primitive.value = 200;
			expect(results).toEqual(['Alice-0-100', 'Bob-0-100', 'Bob-1-100', 'Bob-1-200']);

			cleanup();
		});
	});
});
