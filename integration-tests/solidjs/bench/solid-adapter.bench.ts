import {describe, bench} from 'vitest';
import solidAdapter from '@unisig/solid';
import {unisig} from 'unisig';

describe('SolidJS Adapter Benchmarks', () => {
	describe('reactive() - Objects', () => {
		bench('create reactive object', () => {
			const {reactive} = unisig(solidAdapter);
			reactive({name: 'Alice', age: 30});
		});

		bench('read property from reactive object', () => {
			const {reactive} = unisig(solidAdapter);
			const obj = reactive({name: 'Alice', age: 30});
			obj.name;
		});

		bench('write property to reactive object', () => {
			const {reactive} = unisig(solidAdapter);
			const obj = reactive({name: 'Alice', age: 30});
			obj.name = 'Bob';
		});

		bench('read nested property from reactive object', () => {
			const {reactive} = unisig(solidAdapter);
			const obj = reactive({user: {name: 'Alice', profile: {bio: 'Hello'}}});
			obj.user.name;
		});

		bench('write nested property to reactive object', () => {
			const {reactive} = unisig(solidAdapter);
			const obj = reactive({user: {name: 'Alice', profile: {bio: 'Hello'}}});
			obj.user.name = 'Bob';
		});
	});

	describe('reactive() - Primitives', () => {
		bench('create reactive primitive', () => {
			const {reactive} = unisig(solidAdapter);
			reactive(5);
		});

		bench('read primitive value', () => {
			const {reactive} = unisig(solidAdapter);
			const count = reactive(5);
			count.value;
		});

		bench('write primitive value', () => {
			const {reactive} = unisig(solidAdapter);
			const count = reactive(5);
			count.value = 10;
		});
	});

	describe('signal()', () => {
		bench('create signal', () => {
			const {signal} = unisig(solidAdapter);
			signal(0);
		});

		bench('signal.get()', () => {
			const {signal} = unisig(solidAdapter);
			const count = signal(0);
			count.get();
		});

		bench('signal.set()', () => {
			const {signal} = unisig(solidAdapter);
			const count = signal(0);
			count.set(5);
		});
	});

	describe('effect()', () => {
		bench('create effect', () => {
			const {effect} = unisig(solidAdapter);
			const cleanup = effect(() => {});
			cleanup();
		});

		bench('effect with single dependency', () => {
			const {signal, effect} = unisig(solidAdapter);
			const count = signal(0);
			const cleanup = effect(() => {
				count.get();
			});
			cleanup();
		});

		bench('effect with multiple dependencies', () => {
			const {signal, effect} = unisig(solidAdapter);
			const count1 = signal(0);
			const count2 = signal(0);
			const count3 = signal(0);
			const cleanup = effect(() => {
				count1.get();
				count2.get();
				count3.get();
			});
			cleanup();
		});
	});

	describe('Reactivity Patterns', () => {
		bench('simple counter pattern', () => {
			const {signal, effect} = unisig(solidAdapter);
			const count = signal(0);
			let result = 0;
			const cleanup = effect(() => {
				result = count.get();
			});
			count.set(1);
			count.set(2);
			cleanup();
		});

		bench('derived computation', () => {
			const {signal, effect} = unisig(solidAdapter);
			const count = signal(0);
			let doubled = 0;
			const cleanup = effect(() => {
				doubled = count.get() * 2;
			});
			count.set(5);
			cleanup();
		});

		bench('object mutation pattern', () => {
			const {reactive, effect} = unisig(solidAdapter);
			const obj = reactive({count: 0});
			let result = 0;
			const cleanup = effect(() => {
				result = obj.count;
			});
			obj.count = 1;
			obj.count = 2;
			cleanup();
		});
	});

	describe('High-Frequency Operations', () => {
		bench('1000 signal reads', () => {
			const {signal} = unisig(solidAdapter);
			const count = signal(0);
			for (let i = 0; i < 1000; i++) {
				count.get();
			}
		});

		bench('1000 signal writes', () => {
			const {signal} = unisig(solidAdapter);
			const count = signal(0);
			for (let i = 0; i < 1000; i++) {
				count.set(i);
			}
		});

		bench('1000 reactive object reads', () => {
			const {reactive} = unisig(solidAdapter);
			const obj = reactive({count: 0});
			for (let i = 0; i < 1000; i++) {
				obj.count;
			}
		});

		bench('1000 reactive object writes', () => {
			const {reactive} = unisig(solidAdapter);
			const obj = reactive({count: 0});
			for (let i = 0; i < 1000; i++) {
				obj.count = i;
			}
		});
	});

	describe('create() - Dependency Tracking', () => {
		bench('create dependency', () => {
			solidAdapter.create();
		});

		bench('depend() call', () => {
			const dep = solidAdapter.create();
			dep.depend();
		});

		bench('notify() call', () => {
			const dep = solidAdapter.create();
			dep.notify();
		});

		bench('1000 depend/notify cycles', () => {
			const dep = solidAdapter.create();
			for (let i = 0; i < 1000; i++) {
				dep.depend();
				dep.notify();
			}
		});
	});

	describe('isInScope()', () => {
		bench('isInScope() outside scope', () => {
			solidAdapter.isInScope?.();
		});

		bench('isInScope() inside scope', () => {
			let inScope = false;
			const cleanup = solidAdapter.effect(() => {
				inScope = solidAdapter.isInScope?.() ?? false;
			});
			cleanup();
		});
	});
});
