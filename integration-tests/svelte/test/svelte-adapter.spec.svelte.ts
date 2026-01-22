import {describe, it, expect, vi} from 'vitest';
import {tick} from 'svelte';
import svelteAdapter from '@unisig/svelte';
import unisig from 'unisig';

describe('Svelte Integration Tests', () => {
	describe('effect()', () => {
		it('should run effect immediately', async () => {
			const fn = vi.fn();
			const cleanup = svelteAdapter.effect(fn);
			await tick();
			expect(fn).toHaveBeenCalledTimes(1);
			cleanup();
		});

		it('should return cleanup function', () => {
			const cleanup = svelteAdapter.effect(() => {});
			expect(typeof cleanup).toBe('function');
			cleanup();
		});

		it('should call user cleanup when disposed', async () => {
			const userCleanup = vi.fn();
			const cleanup = svelteAdapter.effect(() => userCleanup);
			await tick();
			cleanup();
			expect(userCleanup).toHaveBeenCalledTimes(1);
		});
	});

	describe('reactive() - objects', () => {
		it('should create reactive state for objects', () => {
			const {reactive} = unisig(svelteAdapter);
			const obj = reactive({name: 'Alice', age: 30});

			expect(obj.name).toBe('Alice');
			expect(obj.age).toBe(30);
		});

		it('should trigger reactivity when properties change', async () => {
			const {reactive, effect} = unisig(svelteAdapter);
			const obj = reactive({count: 0});
			const values: number[] = [];

			const cleanup = effect(() => {
				values.push(obj.count);
			});

			await tick();
			expect(values).toEqual([0]);

			obj.count = 1;
			await tick();
			expect(values).toEqual([0, 1]);

			obj.count = 2;
			await tick();
			expect(values).toEqual([0, 1, 2]);

			cleanup();
		});

		it('should support nested objects', async () => {
			const {reactive, effect} = unisig(svelteAdapter);
			const obj = reactive({user: {name: 'Alice', profile: {bio: 'Hello'}}});
			const names: string[] = [];

			const cleanup = effect(() => {
				names.push(obj.user.name);
			});

			await tick();
			expect(names).toEqual(['Alice']);

			obj.user.name = 'Bob';
			await tick();
			expect(names).toEqual(['Alice', 'Bob']);

			cleanup();
		});
	});

	describe('reactive() - primitives', () => {
		it('should wrap primitives in { value: T }', () => {
			const {reactive} = unisig(svelteAdapter);
			const count = reactive(5);

			// Primitives should be boxed
			expect(count.value).toBe(5);
		});

		it('should allow setting primitive values via .value', () => {
			const {reactive} = unisig(svelteAdapter);
			const count = reactive(5);

			count.value = 10;
			expect(count.value).toBe(10);
		});

		it('should trigger reactivity when primitive value changes', async () => {
			const {reactive, effect} = unisig(svelteAdapter);
			const count = reactive(0);
			const values: number[] = [];

			const cleanup = effect(() => {
				values.push(count.value);
			});

			await tick();
			expect(values).toEqual([0]);

			count.value = 1;
			await tick();
			expect(values).toEqual([0, 1]);

			count.value = 2;
			await tick();
			expect(values).toEqual([0, 1, 2]);

			cleanup();
		});

		it('should work with string primitives', async () => {
			const {reactive, effect} = unisig(svelteAdapter);
			const name = reactive('Alice');
			const names: string[] = [];

			const cleanup = effect(() => {
				names.push(name.value);
			});

			await tick();
			expect(names).toEqual(['Alice']);

			name.value = 'Bob';
			await tick();
			expect(names).toEqual(['Alice', 'Bob']);

			cleanup();
		});
	});

	describe('signal()', () => {
		it('should create signal with get/set interface', () => {
			const {signal} = unisig(svelteAdapter);
			const count = signal(0);

			expect(count.get()).toBe(0);
			count.set(5);
			expect(count.get()).toBe(5);
		});

		it('should trigger reactivity when signal changes', async () => {
			const {signal, effect} = unisig(svelteAdapter);
			const count = signal(0);
			const values: number[] = [];

			const cleanup = effect(() => {
				values.push(count.get());
			});

			await tick();
			expect(values).toEqual([0]);

			count.set(1);
			await tick();
			expect(values).toEqual([0, 1]);

			count.set(2);
			await tick();
			expect(values).toEqual([0, 1, 2]);

			cleanup();
		});
	});

	describe('isInScope()', () => {
		it('should return true inside $effect', async () => {
			let inScope = false;
			const cleanup = $effect.root(() => {
				$effect(() => {
					inScope = svelteAdapter.isInScope?.() ?? false;
				});
			});
			await tick();
			expect(inScope).toBe(true);
			cleanup();
		});

		it('should return false outside reactive scope', () => {
			expect(svelteAdapter.isInScope?.()).toBe(false);
		});
	});

	describe('create() - dependency tracking', () => {
		it('should create depend/notify pair', () => {
			const dep = svelteAdapter.create();
			expect(typeof dep.depend).toBe('function');
			expect(typeof dep.notify).toBe('function');
		});

		it('should track dependencies in reactive context', async () => {
			const dep = svelteAdapter.create();
			const values: number[] = [];
			let count = 0;

			const cleanup = svelteAdapter.effect(() => {
				dep.depend();
				values.push(count);
			});

			await tick();
			expect(values).toEqual([0]);

			count = 1;
			dep.notify();
			await tick();
			expect(values).toEqual([0, 1]);

			cleanup();
		});
	});

	describe('Combined usage', () => {
		it('should work with multiple reactive sources', async () => {
			const {reactive, signal, effect} = unisig(svelteAdapter);

			const user = reactive({name: 'Alice'});
			const count = signal(0);
			const primitive = reactive(100);

			const results: string[] = [];

			const cleanup = effect(() => {
				results.push(`${user.name}-${count.get()}-${primitive.value}`);
			});

			await tick();
			expect(results).toEqual(['Alice-0-100']);

			user.name = 'Bob';
			await tick();
			expect(results).toEqual(['Alice-0-100', 'Bob-0-100']);

			count.set(1);
			await tick();
			expect(results).toEqual(['Alice-0-100', 'Bob-0-100', 'Bob-1-100']);

			primitive.value = 200;
			await tick();
			expect(results).toEqual(['Alice-0-100', 'Bob-0-100', 'Bob-1-100', 'Bob-1-200']);

			cleanup();
		});
	});
});
