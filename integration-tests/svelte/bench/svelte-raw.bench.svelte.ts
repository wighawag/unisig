import {describe, bench} from 'vitest';
import {tick} from 'svelte';

describe('Svelte Raw Benchmarks', () => {
	describe('$state - Objects', () => {
		bench('create $state object', () => {
			$state({name: 'Alice', age: 30});
		});

		bench('read property from $state object', () => {
			const obj = $state({name: 'Alice', age: 30});
			obj.name;
		});

		bench('write property to $state object', () => {
			const obj = $state({name: 'Alice', age: 30});
			obj.name = 'Bob';
		});

		bench('read nested property from $state object', () => {
			const obj = $state({user: {name: 'Alice', profile: {bio: 'Hello'}}});
			obj.user.name;
		});

		bench('write nested property to $state object', () => {
			const obj = $state({user: {name: 'Alice', profile: {bio: 'Hello'}}});
			obj.user.name = 'Bob';
		});
	});

	describe('$state - Primitives', () => {
		bench('create $state primitive', () => {
			$state(5);
		});

		bench('read primitive value from $state', () => {
			let count = $state(5);
			count;
		});

		bench('write primitive value to $state', () => {
			let count = $state(5);
			count = 10;
		});
	});

	describe('$state.raw - Shallow Reactivity', () => {
		bench('create $state.raw object', () => {
			$state.raw({name: 'Alice', age: 30});
		});

		bench('read property from $state.raw object', () => {
			const obj = $state.raw({name: 'Alice', age: 30});
			obj.name;
		});

		bench('write property to $state.raw object', () => {
			const obj = $state.raw({name: 'Alice', age: 30});
			obj.name = 'Bob';
		});
	});

	describe('$derived', () => {
		bench('create $derived', () => {
			const count = $state(0);
			$derived(count * 2);
		});

		bench('read $derived value', () => {
			const count = $state(0);
			const doubled = $derived(count * 2);
			doubled;
		});
	});

	describe('$effect', () => {
		bench('create $effect', () => {
			const cleanup = $effect.root(() => {
				$effect(() => {});
			});
			cleanup();
		});

		bench('$effect with single $state dependency', async () => {
			const count = $state(0);
			let result = 0;
			const cleanup = $effect.root(() => {
				$effect(() => {
					result = count;
				});
			});
			await tick();
			cleanup();
		});

		bench('$effect with multiple $state dependencies', async () => {
			const count1 = $state(0);
			const count2 = $state(0);
			const count3 = $state(0);
			let result = 0;
			const cleanup = $effect.root(() => {
				$effect(() => {
					result = count1 + count2 + count3;
				});
			});
			await tick();
			cleanup();
		});
	});

	describe('Reactivity Patterns', () => {
		bench('simple counter pattern', async () => {
			let count = $state(0);
			let result = 0;
			const cleanup = $effect.root(() => {
				$effect(() => {
					result = count;
				});
			});
			await tick();
			count = 1;
			await tick();
			count = 2;
			await tick();
			cleanup();
		});

		bench('derived computation', async () => {
			let count = $state(0);
			const doubled = $derived(count * 2);
			let result = 0;
			const cleanup = $effect.root(() => {
				$effect(() => {
					result = doubled;
				});
			});
			await tick();
			count = 5;
			await tick();
			cleanup();
		});

		bench('object mutation pattern', async () => {
			const obj = $state({count: 0});
			let result = 0;
			const cleanup = $effect.root(() => {
				$effect(() => {
					result = obj.count;
				});
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
		bench('1000 $state reads', () => {
			const count = $state(0);
			for (let i = 0; i < 1000; i++) {
				count;
			}
		});

		bench('1000 $state writes', () => {
			let count = $state(0);
			for (let i = 0; i < 1000; i++) {
				count = i;
			}
		});

		bench('1000 $state object reads', () => {
			const obj = $state({count: 0});
			for (let i = 0; i < 1000; i++) {
				obj.count;
			}
		});

		bench('1000 $state object writes', () => {
			const obj = $state({count: 0});
			for (let i = 0; i < 1000; i++) {
				obj.count = i;
			}
		});
	});

	describe('$effect.tracking()', () => {
		bench('$effect.tracking() outside scope', () => {
			$effect.tracking();
		});

		bench('$effect.tracking() inside scope', () => {
			const cleanup = $effect.root(() => {
				$effect(() => {
					$effect.tracking();
				});
			});
			cleanup();
		});
	});
});
