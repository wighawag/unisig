import {describe, it, expect, beforeEach, vi} from 'vitest';
import {
	withAdapter,
	withAdapterRef,
	isRef,
	NoAdapterError,
	type Ref,
} from '../src/standalone.js';
import type {ReactivityAdapter, Dependency} from '../src/types.js';

// Simple mock adapter that tracks depend/notify calls
function createMockAdapter() {
	const deps: Array<{depend: () => void; notify: () => void}> = [];
	let inScope = true;

	const adapter: ReactivityAdapter & {
		deps: typeof deps;
		setInScope: (v: boolean) => void;
	} = {
		create(): Dependency {
			const dep = {
				depend: vi.fn(),
				notify: vi.fn(),
			};
			deps.push(dep);
			return dep;
		},
		isInScope() {
			return inScope;
		},
		deps,
		setInScope(v: boolean) {
			inScope = v;
		},
	};

	return adapter;
}

describe('NoAdapterError', () => {
	it('should be a proper Error subclass', () => {
		const error = new NoAdapterError();
		expect(error).toBeInstanceOf(Error);
		expect(error).toBeInstanceOf(NoAdapterError);
		expect(error.name).toBe('NoAdapterError');
	});

	it('should have a descriptive message', () => {
		const error = new NoAdapterError();
		expect(error.message).toContain('No adapter provided');
		expect(error.message).toContain('withAdapter');
	});
});

describe('withAdapter', () => {
	it('should return a function that creates reactive state', () => {
		const adapter = createMockAdapter();
		const state = withAdapter(adapter);

		expect(typeof state).toBe('function');
	});

	it('should create state with objects', () => {
		const adapter = createMockAdapter();
		const state = withAdapter(adapter);

		const obj = state({name: 'Alice', score: 0});

		// Access should trigger depend
		const _ = obj.name;
		expect(adapter.deps.length).toBeGreaterThan(0);
		expect(adapter.deps[0].depend).toHaveBeenCalled();
	});

	it('should create state with primitives', () => {
		const adapter = createMockAdapter();
		const state = withAdapter(adapter);

		const count = state(0);
		expect(count.value).toBe(0);

		// Access should trigger depend
		const _ = count.value;
		expect(adapter.deps.length).toBeGreaterThan(0);
		expect(adapter.deps[0].depend).toHaveBeenCalled();
	});

	it('should work with multiple state creations', () => {
		const adapter = createMockAdapter();
		const state = withAdapter(adapter);

		const count = state(0);
		const name = state('Alice');
		const player = state({score: 100});

		expect(count.value).toBe(0);
		expect(name.value).toBe('Alice');
		expect(player.score).toBe(100);
	});
});

describe('withAdapterRef', () => {
	it('should return a function that creates reactive refs', () => {
		const adapter = createMockAdapter();
		const ref = withAdapterRef(adapter);

		expect(typeof ref).toBe('function');
	});

	it('should create refs', () => {
		const adapter = createMockAdapter();
		const ref = withAdapterRef(adapter);

		const count = ref(0);
		expect(count.value).toBe(0);

		// Access should trigger depend
		const _ = count.value;
		expect(adapter.deps.length).toBeGreaterThan(0);
		expect(adapter.deps[0].depend).toHaveBeenCalled();
	});

	it('should work with different types', () => {
		const adapter = createMockAdapter();
		const ref = withAdapterRef(adapter);

		const str = ref('hello');
		const bool = ref(true);
		const arr = ref([1, 2, 3]);

		expect(str.value).toBe('hello');
		expect(bool.value).toBe(true);
		expect(arr.value).toEqual([1, 2, 3]);
	});

	it('should work with objects', () => {
		const adapter = createMockAdapter();
		const ref = withAdapterRef(adapter);

		const obj = ref({name: 'Alice', score: 100});
		expect(obj.value).toEqual({name: 'Alice', score: 100});
	});
});

describe('state error handling', () => {
	it('should throw TypeError for unsupported types', () => {
		const adapter = createMockAdapter();
		const state = withAdapter(adapter);
		const unsupportedValue = () => {};

		expect(() => state(unsupportedValue as any)).toThrow(TypeError);
		expect(() => state(unsupportedValue as any)).toThrow(
			'Unsupported value type: function',
		);
	});

	it('should accept function objects when explicitly passed as objects', () => {
		const adapter = createMockAdapter();
		const state = withAdapter(adapter);
		const fn = () => {};
		// Functions are objects, so they should be accepted
		expect(() => state({fn})).not.toThrow();
	});
});

describe('state', () => {
	let adapter: ReturnType<typeof createMockAdapter>;
	let state: ReturnType<typeof withAdapter>;

	beforeEach(() => {
		adapter = createMockAdapter();
		state = withAdapter(adapter);
	});

	it('should return a deeply proxied object', () => {
		const obj = state({name: 'Alice', score: 0});

		// Access should trigger depend
		const _ = obj.name;
		expect(adapter.deps.length).toBeGreaterThan(0);
		expect(adapter.deps[0].depend).toHaveBeenCalled();
	});

	it('should track nested property access', () => {
		const obj = state({
			player: {
				stats: {
					health: 100,
				},
			},
		});

		// Access nested property
		const _ = obj.player.stats.health;

		// Should have created dependencies and called depend
		const dependCalls = adapter.deps.filter(
			(d) => (d.depend as any).mock.calls.length > 0,
		);
		expect(dependCalls.length).toBeGreaterThan(0);
	});

	it('should trigger notify on property write', () => {
		const obj = state({score: 0});

		// Read first to create dependency
		const _ = obj.score;

		// Write should trigger notify
		obj.score = 100;

		const notifyCalls = adapter.deps.filter(
			(d) => (d.notify as any).mock.calls.length > 0,
		);
		expect(notifyCalls.length).toBeGreaterThan(0);
	});

	it('should not track when out of scope', () => {
		adapter.setInScope(false);
		const obj = state({value: 1});

		const _ = obj.value;

		// No deps should have depend called
		const dependCalls = adapter.deps.filter(
			(d) => (d.depend as any).mock.calls.length > 0,
		);
		expect(dependCalls.length).toBe(0);
	});
});

describe('state with primitives', () => {
	let adapter: ReturnType<typeof createMockAdapter>;
	let state: ReturnType<typeof withAdapter>;

	beforeEach(() => {
		adapter = createMockAdapter();
		state = withAdapter(adapter);
	});

	it('should wrap number in a Ref', () => {
		const count = state(0);
		expect(count.value).toBe(0);
	});

	it('should wrap string in a Ref', () => {
		const name = state('Alice');
		expect(name.value).toBe('Alice');
	});

	it('should wrap boolean in a Ref', () => {
		const active = state(true);
		expect(active.value).toBe(true);
	});

	it('should wrap null in a Ref', () => {
		const nullable = state(null);
		expect(nullable.value).toBe(null);
	});

	it('should wrap undefined in a Ref', () => {
		const undef = state(undefined);
		expect(undef.value).toBe(undefined);
	});

	it('should wrap bigint in a Ref', () => {
		const big = state(BigInt(9007199254740991));
		expect(big.value).toBe(BigInt(9007199254740991));
	});

	it('should track primitive value access', () => {
		const count = state(0);
		const _ = count.value;

		expect(adapter.deps.length).toBeGreaterThan(0);
		expect(adapter.deps[0].depend).toHaveBeenCalled();
	});

	it('should trigger notify on primitive value change', () => {
		const count = state(0);
		const _ = count.value; // Read first

		count.value = 5 as any;

		const notifyCalls = adapter.deps.filter(
			(d) => (d.notify as any).mock.calls.length > 0,
		);
		expect(notifyCalls.length).toBeGreaterThan(0);
	});

	it('should support increment on number primitives', () => {
		const count = state(0);
		const _ = count.value; // Read first

		count.value++;

		expect(count.value).toBe(1);
		const notifyCalls = adapter.deps.filter(
			(d) => (d.notify as any).mock.calls.length > 0,
		);
		expect(notifyCalls.length).toBeGreaterThan(0);
	});

	it('should support string concatenation', () => {
		const name = state('Hello');
		name.value += ' World';
		expect(name.value).toBe('Hello World');
	});

	it('should support boolean toggle', () => {
		const active = state(true);
		active.value = !active.value as any;
		expect(active.value).toBe(false);
	});
});

describe('ref', () => {
	let adapter: ReturnType<typeof createMockAdapter>;
	let ref: ReturnType<typeof withAdapterRef>;

	beforeEach(() => {
		adapter = createMockAdapter();
		ref = withAdapterRef(adapter);
	});

	it('should create a ref with value property', () => {
		const count = ref(0);
		expect(count.value).toBe(0);
	});

	it('should track value access', () => {
		const count = ref(0);
		const _ = count.value;

		expect(adapter.deps.length).toBeGreaterThan(0);
		expect(adapter.deps[0].depend).toHaveBeenCalled();
	});

	it('should trigger notify on value change', () => {
		const count = ref(0);
		const _ = count.value; // Read first

		count.value = 5;

		const notifyCalls = adapter.deps.filter(
			(d) => (d.notify as any).mock.calls.length > 0,
		);
		expect(notifyCalls.length).toBeGreaterThan(0);
	});
});

describe('isRef', () => {
	it('should return true for ref objects', () => {
		const adapter = createMockAdapter();
		const state = withAdapter(adapter);

		const count = state(0);
		expect(isRef(count)).toBe(true);
	});

	it('should return false for regular objects', () => {
		expect(isRef({name: 'Alice'})).toBe(false);
		expect(isRef({value: 1, other: 2})).toBe(false);
	});

	it('should return false for primitives', () => {
		expect(isRef(null)).toBe(false);
		expect(isRef(undefined)).toBe(false);
		expect(isRef(42)).toBe(false);
		expect(isRef('string')).toBe(false);
	});

	it('should return true for manual ref-like objects', () => {
		expect(isRef({value: 'anything'})).toBe(true);
	});

	it('should work with type narrowing', () => {
		const adapter = createMockAdapter();
		const state = withAdapter(adapter);

		const count = state(0);
		if (isRef(count)) {
			// TypeScript should know count.value is a number
			expect(typeof count.value).toBe('number');
		}
	});
});

describe('state with complex objects', () => {
	let adapter: ReturnType<typeof createMockAdapter>;
	let state: ReturnType<typeof withAdapter>;

	beforeEach(() => {
		adapter = createMockAdapter();
		state = withAdapter(adapter);
	});

	it('should handle arrays', () => {
		const obj = state({items: [1, 2, 3]});

		// Access array
		const _ = obj.items.length;

		expect(adapter.deps.length).toBeGreaterThan(0);
	});

	it('should handle mutations to nested objects', () => {
		const obj = state({
			player: {
				name: 'Alice',
				score: 0,
			},
		});

		// Read
		const _ = obj.player.score;

		// Mutate nested property
		obj.player.score = 100;

		// Should have triggered notify
		const notifyCalls = adapter.deps.filter(
			(d) => (d.notify as any).mock.calls.length > 0,
		);
		expect(notifyCalls.length).toBeGreaterThan(0);
	});

	it('should maintain object identity for same nested access', () => {
		const obj = state({
			player: {name: 'Alice'},
		});

		const player1 = obj.player;
		const player2 = obj.player;

		// Both accesses should return proxied versions
		expect(player1.name).toBe('Alice');
		expect(player2.name).toBe('Alice');
	});

	it('should handle deeply nested objects', () => {
		const obj = state({
			level1: {
				level2: {
					level3: {
						value: 42,
					},
				},
			},
		});

		// Access deeply nested value
		const value = obj.level1.level2.level3.value;
		expect(value).toBe(42);

		// Mutate deeply nested value
		obj.level1.level2.level3.value = 100;
		expect(obj.level1.level2.level3.value).toBe(100);
	});
});
