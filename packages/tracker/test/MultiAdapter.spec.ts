import {describe, it, expect, vi} from 'vitest';
import {MultiAdapter, CompositeDependency, createMultiAdapter} from '@unisig/tracker';
import type {Dependency, ReactivityAdapter} from 'unisig';
import {Tracker} from '@unisig/tracker';

describe('CompositeDependency', () => {
	it('should call depend on all underlying dependencies', () => {
		const dep1: Dependency = {
			depend: vi.fn(),
			notify: vi.fn(),
		};
		const dep2: Dependency = {
			depend: vi.fn(),
			notify: vi.fn(),
		};
		const dep3: Dependency = {
			depend: vi.fn(),
			notify: vi.fn(),
		};

		const composite = new CompositeDependency([dep1, dep2, dep3]);
		composite.depend();

		expect(dep1.depend).toHaveBeenCalledTimes(1);
		expect(dep2.depend).toHaveBeenCalledTimes(1);
		expect(dep3.depend).toHaveBeenCalledTimes(1);
	});

	it('should call notify on all underlying dependencies', () => {
		const dep1: Dependency = {
			depend: vi.fn(),
			notify: vi.fn(),
		};
		const dep2: Dependency = {
			depend: vi.fn(),
			notify: vi.fn(),
		};

		const composite = new CompositeDependency([dep1, dep2]);
		composite.notify();

		expect(dep1.notify).toHaveBeenCalledTimes(1);
		expect(dep2.notify).toHaveBeenCalledTimes(1);
	});

	it('should return underlying dependencies via getDependencies', () => {
		const dep1: Dependency = {
			depend: vi.fn(),
			notify: vi.fn(),
		};
		const dep2: Dependency = {
			depend: vi.fn(),
			notify: vi.fn(),
		};

		const composite = new CompositeDependency([dep1, dep2]);
		const deps = composite.getDependencies();

		expect(deps).toHaveLength(2);
		expect(deps[0]).toBe(dep1);
		expect(deps[1]).toBe(dep2);
	});

	it('should handle empty dependency array', () => {
		const composite = new CompositeDependency([]);
		expect(() => composite.depend()).not.toThrow();
		expect(() => composite.notify()).not.toThrow();
		expect(composite.getDependencies()).toHaveLength(0);
	});
});

describe('MultiAdapter', () => {
	it('should create a composite dependency with all adapters', () => {
		const adapter1: ReactivityAdapter = {
			create: vi.fn(() => ({depend: vi.fn(), notify: vi.fn()})),
		};
		const adapter2: ReactivityAdapter = {
			create: vi.fn(() => ({depend: vi.fn(), notify: vi.fn()})),
		};

		const multi = new MultiAdapter([adapter1, adapter2]);
		const dep = multi.create();

		expect(dep).toBeInstanceOf(CompositeDependency);
		expect(adapter1.create).toHaveBeenCalledTimes(1);
		expect(adapter2.create).toHaveBeenCalledTimes(1);
	});

	it('should throw if no adapters are provided', () => {
		expect(() => new MultiAdapter([])).toThrow('MultiAdapter requires at least one adapter');
	});

	it('should throw if adapters is not an array', () => {
		expect(() => new MultiAdapter(null as any)).toThrow(
			'MultiAdapter requires an array of adapters',
		);
		expect(() => new MultiAdapter({} as any)).toThrow('MultiAdapter requires an array of adapters');
	});

	it('should return true to isInScope if any adapter is in scope', () => {
		const adapter1: ReactivityAdapter = {
			create: vi.fn(() => ({depend: vi.fn(), notify: vi.fn()})),
			isInScope: vi.fn(() => false),
		};
		const adapter2: ReactivityAdapter = {
			create: vi.fn(() => ({depend: vi.fn(), notify: vi.fn()})),
			isInScope: vi.fn(() => true),
		};

		const multi = new MultiAdapter([adapter1, adapter2]);
		expect(multi.isInScope()).toBe(true);

		expect(adapter1.isInScope).toHaveBeenCalledTimes(1);
		expect(adapter2.isInScope).toHaveBeenCalledTimes(1);
	});

	it('should return false to isInScope if no adapter is in scope', () => {
		const adapter1: ReactivityAdapter = {
			create: vi.fn(() => ({depend: vi.fn(), notify: vi.fn()})),
			isInScope: vi.fn(() => false),
		};
		const adapter2: ReactivityAdapter = {
			create: vi.fn(() => ({depend: vi.fn(), notify: vi.fn()})),
			isInScope: vi.fn(() => false),
		};

		const multi = new MultiAdapter([adapter1, adapter2]);
		expect(multi.isInScope()).toBe(false);
	});

	it('should return true to isInScope if adapter has no isInScope method', () => {
		const adapter: ReactivityAdapter = {
			create: vi.fn(() => ({depend: vi.fn(), notify: vi.fn()})),
		};

		const multi = new MultiAdapter([adapter]);
		expect(multi.isInScope()).toBe(true);
	});

	it('should call onDispose on all adapters that support it', () => {
		const callback = vi.fn();
		const subDep1: Dependency = {depend: vi.fn(), notify: vi.fn()};
		const subDep2: Dependency = {depend: vi.fn(), notify: vi.fn()};
		const subDep3: Dependency = {depend: vi.fn(), notify: vi.fn()};

		const adapter1: ReactivityAdapter = {
			create: vi.fn(() => subDep1),
			onDispose: vi.fn(),
		};
		const adapter2: ReactivityAdapter = {
			create: vi.fn(() => subDep2),
			onDispose: vi.fn(),
		};
		const adapter3: ReactivityAdapter = {
			create: vi.fn(() => subDep3),
			// No onDispose
		};

		const multi = new MultiAdapter([adapter1, adapter2, adapter3]);
		const dep = multi.create() as CompositeDependency;

		multi.onDispose(callback, dep);

		expect(adapter1.onDispose).toHaveBeenCalledWith(callback, subDep1);
		expect(adapter2.onDispose).toHaveBeenCalledWith(callback, subDep2);
		expect(adapter3.onDispose).toBeUndefined();
	});

	it('should not call onDispose if dependency is not CompositeDependency', () => {
		const adapter: ReactivityAdapter = {
			create: vi.fn(() => ({depend: vi.fn(), notify: vi.fn()})),
			onDispose: vi.fn(),
		};

		const multi = new MultiAdapter([adapter]);
		const dep = {depend: vi.fn(), notify: vi.fn()};

		expect(() => multi.onDispose(vi.fn(), dep)).not.toThrow();
		expect(adapter.onDispose).not.toHaveBeenCalled();
	});

	it('should return underlying adapters via getAdapters', () => {
		const adapter1: ReactivityAdapter = {
			create: vi.fn(() => ({depend: vi.fn(), notify: vi.fn()})),
		};
		const adapter2: ReactivityAdapter = {
			create: vi.fn(() => ({depend: vi.fn(), notify: vi.fn()})),
		};

		const multi = new MultiAdapter([adapter1, adapter2]);
		const adapters = multi.getAdapters();

		expect(adapters).toHaveLength(2);
		expect(adapters[0]).toBe(adapter1);
		expect(adapters[1]).toBe(adapter2);
	});

	it('should work with three or more adapters', () => {
		const adapters: ReactivityAdapter[] = [
			{create: vi.fn(() => ({depend: vi.fn(), notify: vi.fn()}))},
			{create: vi.fn(() => ({depend: vi.fn(), notify: vi.fn()}))},
			{create: vi.fn(() => ({depend: vi.fn(), notify: vi.fn()}))},
			{create: vi.fn(() => ({depend: vi.fn(), notify: vi.fn()}))},
		];

		const multi = new MultiAdapter(adapters);
		const dep = multi.create() as CompositeDependency;

		expect(dep.getDependencies()).toHaveLength(4);
		adapters.forEach((adapter) => {
			expect(adapter.create).toHaveBeenCalledTimes(1);
		});
	});
});

describe('createMultiAdapter', () => {
	it('should create a MultiAdapter from spread arguments', () => {
		const adapter1: ReactivityAdapter = {
			create: vi.fn(() => ({depend: vi.fn(), notify: vi.fn()})),
		};
		const adapter2: ReactivityAdapter = {
			create: vi.fn(() => ({depend: vi.fn(), notify: vi.fn()})),
		};

		const multi = createMultiAdapter(adapter1, adapter2);

		expect(multi).toBeInstanceOf(MultiAdapter);
		expect(multi.getAdapters()).toHaveLength(2);
	});

	it('should work with a single adapter', () => {
		const adapter: ReactivityAdapter = {
			create: vi.fn(() => ({depend: vi.fn(), notify: vi.fn()})),
		};

		const multi = createMultiAdapter(adapter);

		expect(multi).toBeInstanceOf(MultiAdapter);
		expect(multi.getAdapters()).toHaveLength(1);
	});

	it('should work with three adapters', () => {
		const adapters: ReactivityAdapter[] = [
			{create: vi.fn(() => ({depend: vi.fn(), notify: vi.fn()}))},
			{create: vi.fn(() => ({depend: vi.fn(), notify: vi.fn()}))},
			{create: vi.fn(() => ({depend: vi.fn(), notify: vi.fn()}))},
		];

		const multi = createMultiAdapter(...adapters);

		expect(multi).toBeInstanceOf(MultiAdapter);
		expect(multi.getAdapters()).toHaveLength(3);
	});
});

describe('Integration with Tracker', () => {
	it('should work with Tracker to track multiple signal runtimes', () => {
		let trackCount1 = 0;
		let trackCount2 = 0;
		let notifyCount1 = 0;
		let notifyCount2 = 0;

		const adapter1: ReactivityAdapter = {
			create: () => ({
				depend: () => trackCount1++,
				notify: () => notifyCount1++,
			}),
			isInScope: () => true,
		};

		const adapter2: ReactivityAdapter = {
			create: () => ({
				depend: () => trackCount2++,
				notify: () => notifyCount2++,
			}),
			isInScope: () => true,
		};

		const tracker = new Tracker({
			adapter: new MultiAdapter([adapter1, adapter2]),
		});

		// Track should register with both adapters
		tracker.track('test');
		expect(trackCount1).toBe(1);
		expect(trackCount2).toBe(1);

		// Trigger should notify both adapters
		tracker.trigger('test');
		expect(notifyCount1).toBe(1);
		expect(notifyCount2).toBe(1);
	});

	it('should work with granular tracking (item level)', () => {
		let notifyCount1 = 0;
		let notifyCount2 = 0;

		const adapter1: ReactivityAdapter = {
			create: () => ({
				depend: vi.fn(),
				notify: () => notifyCount1++,
			}),
			isInScope: () => true,
		};

		const adapter2: ReactivityAdapter = {
			create: () => ({
				depend: vi.fn(),
				notify: () => notifyCount2++,
			}),
			isInScope: () => true,
		};

		const tracker = new Tracker({
			adapter: new MultiAdapter([adapter1, adapter2]),
		});

		// Track item
		tracker.trackItem('users', '123');

		// Trigger item
		tracker.triggerItem('users', '123');

		// Both adapters should have been notified
		expect(notifyCount1).toBeGreaterThan(0);
		expect(notifyCount2).toBeGreaterThan(0);
	});

	it('should work with property-level tracking', () => {
		let notifyCount1 = 0;
		let notifyCount2 = 0;

		const adapter1: ReactivityAdapter = {
			create: () => ({
				depend: vi.fn(),
				notify: () => notifyCount1++,
			}),
			isInScope: () => true,
		};

		const adapter2: ReactivityAdapter = {
			create: () => ({
				depend: vi.fn(),
				notify: () => notifyCount2++,
			}),
			isInScope: () => true,
		};

		const tracker = new Tracker({
			adapter: new MultiAdapter([adapter1, adapter2]),
		});

		// Track property
		tracker.trackProp('user', 'name');

		// Trigger property
		tracker.triggerProp('user', 'name');

		// Both adapters should have been notified
		expect(notifyCount1).toBeGreaterThan(0);
		expect(notifyCount2).toBeGreaterThan(0);
	});
});
