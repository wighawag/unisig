import {describe, bench} from 'vitest';
import {tick} from 'svelte';

// Wrapper classes that use $state as class fields
class StateObjectWrapper {
	value = $state({name: 'Alice', age: 30});
}

class StatePrimitiveWrapper {
	value = $state(5);
}

class StateRawObjectWrapper {
	value = $state.raw({name: 'Alice', age: 30});
}

class NestedStateObjectWrapper {
	value = $state({user: {name: 'Alice', profile: {bio: 'Hello'}}});
}

class DerivedWrapper {
	count = $state(0);
	doubled = $derived(this.count * 2);
}

class EffectWrapper {
	count = $state(0);
	result = 0;
	cleanup = $effect.root(() => {
		$effect(() => {
			this.result = this.count;
		});
	});
}

class MultipleEffectsWrapper {
	count1 = $state(0);
	count2 = $state(0);
	count3 = $state(0);
	result = 0;
	cleanup = $effect.root(() => {
		$effect(() => {
			this.result = this.count1 + this.count2 + this.count3;
		});
	});
}

class CounterPatternWrapper {
	count = $state(0);
	result = 0;
	cleanup = $effect.root(() => {
		$effect(() => {
			this.result = this.count;
		});
	});
}

class DerivedComputationWrapper {
	count = $state(0);
	doubled = $derived(this.count * 2);
	result = 0;
	cleanup = $effect.root(() => {
		$effect(() => {
			this.result = this.doubled;
		});
	});
}

class ObjectMutationWrapper {
	obj = $state({count: 0});
	result = 0;
	cleanup = $effect.root(() => {
		$effect(() => {
			this.result = this.obj.count;
		});
	});
}

class HighFrequencyReadStateWrapper {
	count = $state(0);
}

class HighFrequencyWriteStateWrapper {
	count = $state(0);
}

class HighFrequencyReadStateObjectWrapper {
	obj = $state({count: 0});
}

class HighFrequencyWriteStateObjectWrapper {
	obj = $state({count: 0});
}

class EffectTrackingInsideScopeWrapper {
	cleanup = $effect.root(() => {
		$effect(() => {
			$effect.tracking();
		});
	});
}

describe('Svelte Raw Benchmarks', () => {
	describe('$state - Objects', () => {
		bench('create $state object', () => {
			new StateObjectWrapper();
		});

		bench('read property from $state object', () => {
			const wrapper = new StateObjectWrapper();
			wrapper.value.name;
		});

		bench('write property to $state object', () => {
			const wrapper = new StateObjectWrapper();
			wrapper.value.name = 'Bob';
		});

		bench('read nested property from $state object', () => {
			const wrapper = new NestedStateObjectWrapper();
			wrapper.value.user.name;
		});

		bench('write nested property to $state object', () => {
			const wrapper = new NestedStateObjectWrapper();
			wrapper.value.user.name = 'Bob';
		});
	});

	describe('$state - Primitives', () => {
		bench('create $state primitive', () => {
			new StatePrimitiveWrapper();
		});

		bench('read primitive value from $state', () => {
			const wrapper = new StatePrimitiveWrapper();
			wrapper.value;
		});

		bench('write primitive value to $state', () => {
			const wrapper = new StatePrimitiveWrapper();
			wrapper.value = 10;
		});
	});

	describe('$state.raw - Shallow Reactivity', () => {
		bench('create $state.raw object', () => {
			new StateRawObjectWrapper();
		});

		bench('read property from $state.raw object', () => {
			const wrapper = new StateRawObjectWrapper();
			wrapper.value.name;
		});

		bench('write property to $state.raw object', () => {
			const wrapper = new StateRawObjectWrapper();
			wrapper.value.name = 'Bob';
		});
	});

	describe('$derived', () => {
		bench('create $derived', () => {
			new DerivedWrapper();
		});

		bench('read $derived value', () => {
			const wrapper = new DerivedWrapper();
			wrapper.doubled;
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
			const wrapper = new EffectWrapper();
			await tick();
			wrapper.cleanup();
		});

		bench('$effect with multiple $state dependencies', async () => {
			const wrapper = new MultipleEffectsWrapper();
			await tick();
			wrapper.cleanup();
		});
	});

	describe('Reactivity Patterns', () => {
		bench('simple counter pattern', async () => {
			const wrapper = new CounterPatternWrapper();
			await tick();
			wrapper.count = 1;
			await tick();
			wrapper.count = 2;
			await tick();
			wrapper.cleanup();
		});

		bench('derived computation', async () => {
			const wrapper = new DerivedComputationWrapper();
			await tick();
			wrapper.count = 5;
			await tick();
			wrapper.cleanup();
		});

		bench('object mutation pattern', async () => {
			const wrapper = new ObjectMutationWrapper();
			await tick();
			wrapper.obj.count = 1;
			await tick();
			wrapper.obj.count = 2;
			await tick();
			wrapper.cleanup();
		});
	});

	describe('High-Frequency Operations', () => {
		bench('1000 $state reads', () => {
			const wrapper = new HighFrequencyReadStateWrapper();
			for (let i = 0; i < 1000; i++) {
				wrapper.count;
			}
		});

		bench('1000 $state writes', () => {
			const wrapper = new HighFrequencyWriteStateWrapper();
			for (let i = 0; i < 1000; i++) {
				wrapper.count = i;
			}
		});

		bench('1000 $state object reads', () => {
			const wrapper = new HighFrequencyReadStateObjectWrapper();
			for (let i = 0; i < 1000; i++) {
				wrapper.obj.count;
			}
		});

		bench('1000 $state object writes', () => {
			const wrapper = new HighFrequencyWriteStateObjectWrapper();
			for (let i = 0; i < 1000; i++) {
				wrapper.obj.count = i;
			}
		});
	});

	describe('$effect.tracking()', () => {
		bench('$effect.tracking() outside scope', () => {
			$effect.tracking();
		});

		bench('$effect.tracking() inside scope', () => {
			const wrapper = new EffectTrackingInsideScopeWrapper();
			wrapper.cleanup();
		});
	});
});
