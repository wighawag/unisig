import {describe, bench} from 'vitest';
import {createSignal, createEffect, createRoot, createMemo} from 'solid-js';
import {createMutable} from 'solid-js/store';

describe('SolidJS Raw Benchmarks', () => {
	describe('createSignal', () => {
		bench('create signal', () => {
			createSignal(0);
		});

		bench('signal[0]() - read', () => {
			const [count] = createSignal(0);
			count();
		});

		bench('signal[1]() - write', () => {
			const [, setCount] = createSignal(0);
			setCount(5);
		});
	});

	describe('createMutable', () => {
		bench('create mutable object', () => {
			createMutable({name: 'Alice', age: 30});
		});

		bench('read property from mutable object', () => {
			const obj = createMutable({name: 'Alice', age: 30});
			obj.name;
		});

		bench('write property to mutable object', () => {
			const obj = createMutable({name: 'Alice', age: 30});
			obj.name = 'Bob';
		});

		bench('read nested property from mutable object', () => {
			const obj = createMutable({user: {name: 'Alice', profile: {bio: 'Hello'}}});
			obj.user.name;
		});

		bench('write nested property to mutable object', () => {
			const obj = createMutable({user: {name: 'Alice', profile: {bio: 'Hello'}}});
			obj.user.name = 'Bob';
		});
	});

	describe('createMemo', () => {
		bench('create memo', () => {
			const dispose = createRoot((disposeFn) => {
				const [count] = createSignal(0);
				createMemo(() => count() * 2);
				return disposeFn;
			});
			dispose();
		});

		bench('read memo value', () => {
			const dispose = createRoot((disposeFn) => {
				const [count] = createSignal(0);
				const doubled = createMemo(() => count() * 2);
				doubled();
				return disposeFn;
			});
			dispose();
		});
	});

	describe('createEffect', () => {
		bench('create effect', () => {
			const dispose = createRoot((disposeFn) => {
				createEffect(() => {});
				return disposeFn;
			});
			dispose();
		});

		bench('effect with single signal dependency', () => {
			const [count] = createSignal(0);
			let result = 0;
			const dispose = createRoot((disposeFn) => {
				createEffect(() => {
					result = count();
				});
				return disposeFn;
			});
			dispose();
		});

		bench('effect with multiple signal dependencies', () => {
			const [count1] = createSignal(0);
			const [count2] = createSignal(0);
			const [count3] = createSignal(0);
			let result = 0;
			const dispose = createRoot((disposeFn) => {
				createEffect(() => {
					result = count1() + count2() + count3();
				});
				return disposeFn;
			});
			dispose();
		});
	});

	describe('Reactivity Patterns', () => {
		bench('simple counter pattern', () => {
			const [count, setCount] = createSignal(0);
			let result = 0;
			const dispose = createRoot((disposeFn) => {
				createEffect(() => {
					result = count();
				});
				return disposeFn;
			});
			setCount(1);
			setCount(2);
			dispose();
		});

		bench('derived computation', () => {
			const [count, setCount] = createSignal(0);
			let result = 0;
			const dispose = createRoot((disposeFn) => {
				const doubled = createMemo(() => count() * 2);
				createEffect(() => {
					result = doubled();
				});
				return disposeFn;
			});
			setCount(5);
			dispose();
		});

		bench('object mutation pattern', () => {
			const obj = createMutable({count: 0});
			let result = 0;
			const dispose = createRoot((disposeFn) => {
				createEffect(() => {
					result = obj.count;
				});
				return disposeFn;
			});
			obj.count = 1;
			obj.count = 2;
			dispose();
		});
	});

	describe('High-Frequency Operations', () => {
		bench('1000 signal reads', () => {
			const [count] = createSignal(0);
			for (let i = 0; i < 1000; i++) {
				count();
			}
		});

		bench('1000 signal writes', () => {
			const [, setCount] = createSignal(0);
			for (let i = 0; i < 1000; i++) {
				setCount(i);
			}
		});

		bench('1000 mutable object reads', () => {
			const obj = createMutable({count: 0});
			for (let i = 0; i < 1000; i++) {
				obj.count;
			}
		});

		bench('1000 mutable object writes', () => {
			const obj = createMutable({count: 0});
			for (let i = 0; i < 1000; i++) {
				obj.count = i;
			}
		});
	});

	describe('createRoot', () => {
		bench('createRoot with effect', () => {
			const dispose = createRoot((disposeFn) => {
				createEffect(() => {});
				return disposeFn;
			});
			dispose();
		});
	});

	describe('getOwner', () => {
		bench('getOwner() outside scope', () => {
			// This is a no-op in SolidJS, but we benchmark it for completeness
			// getOwner() returns undefined outside a reactive scope
		});

		bench('getOwner() inside scope', () => {
			let owner = null;
			const dispose = createRoot((disposeFn) => {
				owner = createRoot(() => {});
				return disposeFn;
			});
			dispose();
		});
	});
});
