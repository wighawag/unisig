import {describe, bench} from 'vitest';
import {tick} from 'svelte';
import svelteAdapter from '@unisig/svelte';
import {unisig} from 'unisig';

describe('Svelte Adapter Benchmarks', () => {
	describe('reactive() - Objects', () => {
		bench('create reactive object', () => {
			const {reactive} = unisig(svelteAdapter);
			reactive({name: 'Alice', age: 30});
		});

		bench('read property from reactive object', () => {
			const {reactive} = unisig(svelteAdapter);
			const obj = reactive({name: 'Alice', age: 30});
			obj.name;
		});

		bench('write property to reactive object', () => {
			const {reactive} = unisig(svelteAdapter);
			const obj = reactive({name: 'Alice', age: 30});
			obj.name = 'Bob';
		});

		bench('read nested property from reactive object', () => {
			const {reactive} = unisig(svelteAdapter);
			const obj = reactive({user: {name: 'Alice', profile: {bio: 'Hello'}}});
			obj.user.name;
		});

		bench('write nested property to reactive object', () => {
			const {reactive} = unisig(svelteAdapter);
			const obj = reactive({user: {name: 'Alice', profile: {bio: 'Hello'}}});
			obj.user.name = 'Bob';
		});
	});

	describe('reactive() - Primitives', () => {
		bench('create reactive primitive', () => {
			const {reactive} = unisig(svelteAdapter);
			reactive(5);
		});

		bench('read primitive value', () => {
			const {reactive} = unisig(svelteAdapter);
			const count = reactive(5);
			count.value;
		});

		bench('write primitive value', () => {
			const {reactive} = unisig(svelteAdapter);
			const count = reactive(5);
			count.value = 10;
		});
	});

	describe('signal()', () => {
		bench('create signal', () => {
			const {signal} = unisig(svelteAdapter);
			signal(0);
		});

		bench('signal.get()', () => {
			const {signal} = unisig(svelteAdapter);
			const count = signal(0);
			count.get();
		});

		bench('signal.set()', () => {
			const {signal} = unisig(svelteAdapter);
			const count = signal(0);
			count.set(5);
		});
	});

	describe('effect()', () => {
		bench('create effect', () => {
			const {effect} = unisig(svelteAdapter);
			const cleanup = effect(() => {});
			cleanup();
		});

		bench('effect with single dependency', async () => {
			const {signal, effect} = unisig(svelteAdapter);
			const count = signal(0);
			const cleanup = effect(() => {
				count.get();
			});
			await tick();
			cleanup();
		});

		bench('effect with multiple dependencies', async () => {
			const {signal, effect} = unisig(svelteAdapter);
			const count1 = signal(0);
			const count2 = signal(0);
			const count3 = signal(0);
			const cleanup = effect(() => {
				count1.get();
				count2.get();
				count3.get();
			});
			await tick();
			cleanup();
		});
	});

	describe('Reactivity Patterns', () => {
		bench('simple counter pattern', async () => {
			const {signal, effect} = unisig(svelteAdapter);
			const count = signal(0);
			let result = 0;
			const cleanup = effect(() => {
				result = count.get();
			});
			await tick();
			count.set(1);
			await tick();
			count.set(2);
			await tick();
			cleanup();
		});

		bench('derived computation', async () => {
			const {signal, effect} = unisig(svelteAdapter);
			const count = signal(0);
			let doubled = 0;
			const cleanup = effect(() => {
				doubled = count.get() * 2;
			});
			await tick();
			count.set(5);
			await tick();
			cleanup();
		});

		bench('object mutation pattern', async () => {
			const {reactive, effect} = unisig(svelteAdapter);
			const obj = reactive({count: 0});
			let result = 0;
			const cleanup = effect(() => {
				result = obj.count;
			});
			await tick();
			obj.count = 1;
			await tick();
			obj.count = 2;
			await tick();
			cleanup();
		});
	});

	describe('High-Frequency Operations', () => {
		bench('1000 signal reads', () => {
			const {signal} = unisig(svelteAdapter);
			const count = signal(0);
			for (let i = 0; i < 1000; i++) {
				count.get();
			}
		});

		bench('1000 signal writes', () => {
			const {signal} = unisig(svelteAdapter);
			const count = signal(0);
			for (let i = 0; i < 1000; i++) {
				count.set(i);
			}
		});

		bench('1000 reactive object reads', () => {
			const {reactive} = unisig(svelteAdapter);
			const obj = reactive({count: 0});
			for (let i = 0; i < 1000; i++) {
				obj.count;
			}
		});

		bench('1000 reactive object writes', () => {
			const {reactive} = unisig(svelteAdapter);
			const obj = reactive({count: 0});
			for (let i = 0; i < 1000; i++) {
				obj.count = i;
			}
		});
	});

	describe('create() - Dependency Tracking', () => {
		bench('create dependency', () => {
			svelteAdapter.create();
		});

		bench('depend() call', () => {
			const dep = svelteAdapter.create();
			dep.depend();
		});

		bench('notify() call', () => {
			const dep = svelteAdapter.create();
			dep.notify();
		});

		bench('1000 depend/notify cycles', () => {
			const dep = svelteAdapter.create();
			for (let i = 0; i < 1000; i++) {
				dep.depend();
				dep.notify();
			}
		});
	});

	describe('isInScope()', () => {
		bench('isInScope() outside scope', () => {
			svelteAdapter.isInScope?.();
		});

		bench('isInScope() inside scope', () => {
			const cleanup = $effect.root(() => {
				$effect(() => {
					svelteAdapter.isInScope?.();
				});
			});
			cleanup();
		});
	});
});
