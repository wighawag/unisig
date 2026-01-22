import {describe, it, expect, vi} from 'vitest';
import {unisig, type BasicReactivityAdapter, type Signal, type StateResult} from '../src/index.js';

// Helper to check if a value is a primitive
function isPrimitive(value: unknown): boolean {
	return value === null || (typeof value !== 'object' && typeof value !== 'function');
}

// Mock adapter for testing
function createMockAdapter(): BasicReactivityAdapter & {
	effects: Array<{fn: () => void | (() => void); cleanup?: () => void}>;
	states: unknown[];
	signals: Array<Signal<unknown>>;
	triggerEffects: () => void;
} {
	const effects: Array<{fn: () => void | (() => void); cleanup?: () => void}> =
		[];
	const states: unknown[] = [];
	const signals: Array<Signal<unknown>> = [];

	return {
		effects,
		states,
		signals,
		effect(fn) {
			const effectEntry = {fn, cleanup: undefined as (() => void) | undefined};
			effects.push(effectEntry);

			// Run the effect immediately
			const result = fn();
			if (typeof result === 'function') {
				effectEntry.cleanup = result;
			}

			// Return cleanup function
			return () => {
				effectEntry.cleanup?.();
				const idx = effects.indexOf(effectEntry);
				if (idx !== -1) effects.splice(idx, 1);
			};
		},
		state<T>(initial: T): StateResult<T> {
			// For primitives, return { value: T }
			// For objects, return T directly
			if (isPrimitive(initial)) {
				const boxed = { value: initial };
				states.push(boxed);
				return boxed as StateResult<T>;
			}
			const state = {...initial as object};
			states.push(state);
			return state as StateResult<T>;
		},
		signal<T>(initial: T): Signal<T> {
			let value = initial;
			const sig: Signal<T> = {
				get: () => value,
				set: (v: T) => {
					value = v;
				},
			};
			signals.push(sig as Signal<unknown>);
			return sig;
		},
		triggerEffects() {
			for (const effect of effects) {
				effect.cleanup?.();
				const result = effect.fn();
				effect.cleanup = typeof result === 'function' ? result : undefined;
			}
		},
	};
}

describe('unisig', () => {
	describe('unisig()', () => {
		it('should return a bundle with state, signal, effect, and adapter', () => {
			const adapter = createMockAdapter();
			const bundle = unisig(adapter);

			expect(typeof bundle.state).toBe('function');
			expect(typeof bundle.signal).toBe('function');
			expect(typeof bundle.effect).toBe('function');
			expect(bundle.adapter).toBe(adapter);
		});
	});

	describe('state()', () => {
		it('should create reactive state for objects', () => {
			const adapter = createMockAdapter();
			const {state} = unisig(adapter);

			const obj = state({name: 'Alice', age: 30});

			expect(obj.name).toBe('Alice');
			expect(obj.age).toBe(30);
			expect(adapter.states).toHaveLength(1);
		});

		it('should create reactive state for primitives with .value wrapper', () => {
			const adapter = createMockAdapter();
			const {state} = unisig(adapter);

			const num = state(42);
			const str = state('hello');

			// Primitives are wrapped in { value: T }
			expect(num.value).toBe(42);
			expect(str.value).toBe('hello');
			expect(adapter.states).toHaveLength(2);
		});

		it('should allow setting primitive values via .value', () => {
			const adapter = createMockAdapter();
			const {state} = unisig(adapter);

			const num = state(42);
			num.value = 100;

			expect(num.value).toBe(100);
		});
	});

	describe('signal()', () => {
		it('should create a signal with get/set interface', () => {
			const adapter = createMockAdapter();
			const {signal} = unisig(adapter);

			const count = signal(0);

			expect(count.get()).toBe(0);
			count.set(5);
			expect(count.get()).toBe(5);
			expect(adapter.signals).toHaveLength(1);
		});

		it('should work with different types', () => {
			const adapter = createMockAdapter();
			const {signal} = unisig(adapter);

			const str = signal('hello');
			const bool = signal(true);
			const obj = signal({value: 42});

			expect(str.get()).toBe('hello');
			expect(bool.get()).toBe(true);
			expect(obj.get()).toEqual({value: 42});
		});
	});

	describe('effect()', () => {
		it('should run immediately', () => {
			const adapter = createMockAdapter();
			const {effect} = unisig(adapter);
			const fn = vi.fn();

			effect(fn);

			expect(fn).toHaveBeenCalledTimes(1);
		});

		it('should return a cleanup function', () => {
			const adapter = createMockAdapter();
			const {effect} = unisig(adapter);

			const cleanup = effect(() => {});

			expect(typeof cleanup).toBe('function');
		});

		it('should call user cleanup when disposed', () => {
			const adapter = createMockAdapter();
			const {effect} = unisig(adapter);
			const userCleanup = vi.fn();

			const cleanup = effect(() => userCleanup);
			cleanup();

			expect(userCleanup).toHaveBeenCalledTimes(1);
		});

		it('should call user cleanup before re-run', () => {
			const adapter = createMockAdapter();
			const {effect} = unisig(adapter);
			const userCleanup = vi.fn();
			let runCount = 0;

			effect(() => {
				runCount++;
				return userCleanup;
			});

			expect(runCount).toBe(1);
			expect(userCleanup).toHaveBeenCalledTimes(0);

			// Simulate dependency change
			adapter.triggerEffects();

			expect(runCount).toBe(2);
			expect(userCleanup).toHaveBeenCalledTimes(1);
		});

		it('should remove effect from list when disposed', () => {
			const adapter = createMockAdapter();
			const {effect} = unisig(adapter);

			expect(adapter.effects.length).toBe(0);

			const cleanup1 = effect(() => {});
			const cleanup2 = effect(() => {});

			expect(adapter.effects.length).toBe(2);

			cleanup1();
			expect(adapter.effects.length).toBe(1);

			cleanup2();
			expect(adapter.effects.length).toBe(0);
		});
	});
});

describe('BasicReactivityAdapter interface', () => {
	it('should have correct structure', () => {
		const adapter: BasicReactivityAdapter = {
			effect: vi.fn(() => () => {}),
			state: <T>(initial: T): StateResult<T> => {
				if (initial === null || (typeof initial !== 'object' && typeof initial !== 'function')) {
					return { value: initial } as StateResult<T>;
				}
				return initial as StateResult<T>;
			},
			signal: <T>(initial: T) => ({get: () => initial, set: vi.fn()}),
		};

		expect(typeof adapter.effect).toBe('function');
		expect(typeof adapter.state).toBe('function');
		expect(typeof adapter.signal).toBe('function');
	});
});

describe('Signal interface', () => {
	it('should have get and set methods', () => {
		let value = 0;
		const signal: Signal<number> = {
			get: () => value,
			set: (v) => {
				value = v;
			},
		};

		expect(signal.get()).toBe(0);
		signal.set(10);
		expect(signal.get()).toBe(10);
	});
});