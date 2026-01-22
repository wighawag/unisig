import {describe, bench} from 'vitest';
import {Tracker} from '../src/Tracker.js';

// Simple mock adapter for benchmarking
const mockAdapter = {
	create: () => ({
		depend: () => {},
		notify: () => {},
	}),
};

describe('Tracker Performance Benchmarks', () => {
	describe('Instantiation', () => {
		bench('create Tracker without adapter', () => {
			new Tracker();
		});

		bench('create Tracker with adapter', () => {
			new Tracker({adapter: mockAdapter});
		});

		bench('create 100 Tracker instances', () => {
			for (let i = 0; i < 100; i++) {
				new Tracker({adapter: mockAdapter});
			}
		});
	});

	describe('Granular Tracking Operations', () => {
		bench('track() single key', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			mockAdapter.create().depend();
			tracker.track('users');
		});

		bench('track() 100 different keys', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			for (let i = 0; i < 100; i++) {
				mockAdapter.create().depend();
				tracker.track(`key_${i}`);
			}
		});

		bench('trackItem() single item', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			mockAdapter.create().depend();
			tracker.trackItem('users', 'user-1');
		});

		bench('trackItem() 100 different items', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			for (let i = 0; i < 100; i++) {
				mockAdapter.create().depend();
				tracker.trackItem('users', `user-${i}`);
			}
		});

		bench('trackProp() single property', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			mockAdapter.create().depend();
			tracker.trackProp('config', 'theme');
		});

		bench('trackItemProp() single item property', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			mockAdapter.create().depend();
			tracker.trackItemProp('users', 'user-1', 'name');
		});
	});

	describe('Triggering Operations', () => {
		bench('trigger() single key', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			tracker.trigger('users');
		});

		bench('trigger() 100 different keys', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			for (let i = 0; i < 100; i++) {
				tracker.trigger(`key_${i}`);
			}
		});

		bench('triggerItem() single item', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			tracker.triggerItem('users', 'user-1');
		});

		bench('triggerItem() 100 different items', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			for (let i = 0; i < 100; i++) {
				tracker.triggerItem('users', `user-${i}`);
			}
		});

		bench('triggerProp() single property', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			tracker.triggerProp('config', 'theme');
		});

		bench('triggerItemProp() single item property', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			tracker.triggerItemProp('users', 'user-1', 'name');
		});

		bench('triggerCollection() single collection', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			tracker.triggerCollection('users');
		});

		bench('triggerItemRemoved() single item', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			tracker.triggerItemRemoved('users', 'user-1');
		});

		bench('triggerItemAdded() single item', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			tracker.triggerItemAdded('users');
		});
	});

	describe('Dependency Access', () => {
		bench('dep() get or create dependency', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			tracker.dep('test');
		});

		bench('dep() get cached dependency', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			tracker.dep('test');
			tracker.dep('test');
		});

		bench('itemDep() get or create 100 item dependencies', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			for (let i = 0; i < 100; i++) {
				tracker.itemDep('users', `user-${i}`);
			}
		});

		bench('propDep() get or create 100 property dependencies', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			for (let i = 0; i < 100; i++) {
				tracker.propDep('config', `prop_${i}`);
			}
		});

		bench('itemPropDep() get or create 100 item property dependencies', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			for (let i = 0; i < 100; i++) {
				tracker.itemPropDep('users', 'user-1', `prop_${i}`);
			}
		});
	});

	describe('Adapter Management', () => {
		bench('getAdapter() get adapter', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			tracker.getAdapter();
		});

		bench('isInScope() check', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			tracker.isInScope();
		});
	});

	describe('Real-World Usage Patterns', () => {
		bench('simple read pattern (track)', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			const users = new Map<string, {id: string; name: string}>();

			for (let i = 0; i < 100; i++) {
				users.set(`user-${i}`, {id: `user-${i}`, name: `User ${i}`});
			}

			mockAdapter.create().depend();
			tracker.track('users');
			[...users.values()];
		});

		bench('item-level read pattern (trackItem)', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			const users = new Map<string, {id: string; name: string}>();

			for (let i = 0; i < 100; i++) {
				users.set(`user-${i}`, {id: `user-${i}`, name: `User ${i}`});
			}

			for (let i = 0; i < 100; i++) {
				mockAdapter.create().depend();
				tracker.trackItem('users', `user-${i}`);
				users.get(`user-${i}`);
			}
		});

		bench('add item pattern (triggerCollection)', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			const users = new Map<string, {id: string; name: string}>();

			for (let i = 0; i < 100; i++) {
				const user = {id: `user-${i}`, name: `User ${i}`};
				users.set(user.id, user);
				tracker.triggerCollection('users');
			}
		});

		bench('update item pattern (triggerItem)', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			const users = new Map<string, {id: string; name: string}>();

			for (let i = 0; i < 100; i++) {
				users.set(`user-${i}`, {id: `user-${i}`, name: `User ${i}`});
			}

			for (let i = 0; i < 100; i++) {
				const user = users.get(`user-${i}`)!;
				user.name = `Updated ${i}`;
				tracker.triggerItem('users', `user-${i}`);
			}
		});

		bench('remove item pattern (triggerItemRemoved)', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			const users = new Map<string, {id: string; name: string}>();

			for (let i = 0; i < 100; i++) {
				users.set(`user-${i}`, {id: `user-${i}`, name: `User ${i}`});
			}

			for (let i = 0; i < 100; i++) {
				users.delete(`user-${i}`);
				tracker.triggerItemRemoved('users', `user-${i}`);
			}
		});
	});

	describe('Cleanup Operations', () => {
		bench('clear() with many dependencies', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			for (let i = 0; i < 100; i++) {
				tracker.dep(`key_${i}`);
				tracker.itemDep('users', `user-${i}`);
				tracker.propDep('config', `prop_${i}`);
			}
			tracker.clear();
		});
	});

	describe('High-Frequency Operations', () => {
		bench('1000 track/trigger cycles', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			for (let i = 0; i < 1000; i++) {
				mockAdapter.create().depend();
				tracker.track('counter');
				tracker.trigger('counter');
			}
		});

		bench('1000 item track/trigger cycles', () => {
			const tracker = new Tracker({adapter: mockAdapter});
			for (let i = 0; i < 1000; i++) {
				mockAdapter.create().depend();
				tracker.trackItem('items', i);
				tracker.triggerItem('items', i);
			}
		});
	});
});
