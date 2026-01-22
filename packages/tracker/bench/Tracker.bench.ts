import {describe, bench} from 'vitest';
import {createTrackerFactory, type Tracker} from '../src/Tracker.js';
import {ReactivityAdapter} from '../src/types.js';

// Simple mock adapter for benchmarking
const mockAdapter = {
	create: () => ({
		depend: () => {},
		notify: () => {},
	}),
} as ReactivityAdapter;

const createTracker = createTrackerFactory(mockAdapter);

describe('Tracker Performance Benchmarks', () => {
	describe('Instantiation', () => {
		bench('create Tracker with adapter', () => {
			createTracker();
		});

		bench('create 100 Tracker instances', () => {
			for (let i = 0; i < 100; i++) {
				createTracker();
			}
		});
	});

	describe('Targeted Tracking Operations', () => {
		bench('track() single key', () => {
			const tracker = createTracker();
			mockAdapter.create().depend();
			tracker.track('users');
		});

		bench('track() 100 different keys', () => {
			const tracker = createTracker();
			for (let i = 0; i < 100; i++) {
				mockAdapter.create().depend();
				tracker.track(`key_${i}`);
			}
		});

		bench('trackItem() single item', () => {
			const tracker = createTracker();
			mockAdapter.create().depend();
			tracker.trackItem('users', 'user-1');
		});

		bench('trackItem() 100 different items', () => {
			const tracker = createTracker();
			for (let i = 0; i < 100; i++) {
				mockAdapter.create().depend();
				tracker.trackItem('users', `user-${i}`);
			}
		});

		bench('trackProp() single property', () => {
			const tracker = createTracker();
			mockAdapter.create().depend();
			tracker.trackProp('config', 'theme');
		});

		bench('trackItemProp() single item property', () => {
			const tracker = createTracker();
			mockAdapter.create().depend();
			tracker.trackItemProp('users', 'user-1', 'name');
		});
	});

	describe('Triggering Operations', () => {
		bench('trigger() single key', () => {
			const tracker = createTracker();
			tracker.trigger('users');
		});

		bench('trigger() 100 different keys', () => {
			const tracker = createTracker();
			for (let i = 0; i < 100; i++) {
				tracker.trigger(`key_${i}`);
			}
		});

		bench('triggerItem() single item', () => {
			const tracker = createTracker();
			tracker.triggerItem('users', 'user-1');
		});

		bench('triggerItem() 100 different items', () => {
			const tracker = createTracker();
			for (let i = 0; i < 100; i++) {
				tracker.triggerItem('users', `user-${i}`);
			}
		});

		bench('triggerProp() single property', () => {
			const tracker = createTracker();
			tracker.triggerProp('config', 'theme');
		});

		bench('triggerItemProp() single item property', () => {
			const tracker = createTracker();
			tracker.triggerItemProp('users', 'user-1', 'name');
		});

		bench('triggerCollection() single collection', () => {
			const tracker = createTracker();
			tracker.triggerCollection('users');
		});

		bench('triggerItemRemoved() single item', () => {
			const tracker = createTracker();
			tracker.triggerItemRemoved('users', 'user-1');
		});

		bench('triggerItemAdded() single item', () => {
			const tracker = createTracker();
			tracker.triggerItemAdded('users');
		});
	});

	describe('Dependency Access', () => {
		bench('dep() get or create dependency', () => {
			const tracker = createTracker();
			tracker.dep('test');
		});

		bench('dep() get cached dependency', () => {
			const tracker = createTracker();
			tracker.dep('test');
			tracker.dep('test');
		});

		bench('itemDep() get or create 100 item dependencies', () => {
			const tracker = createTracker();
			for (let i = 0; i < 100; i++) {
				tracker.itemDep('users', `user-${i}`);
			}
		});

		bench('propDep() get or create 100 property dependencies', () => {
			const tracker = createTracker();
			for (let i = 0; i < 100; i++) {
				tracker.propDep('config', `prop_${i}`);
			}
		});

		bench('itemPropDep() get or create 100 item property dependencies', () => {
			const tracker = createTracker();
			for (let i = 0; i < 100; i++) {
				tracker.itemPropDep('users', 'user-1', `prop_${i}`);
			}
		});
	});

	describe('Adapter Management', () => {
		bench('getAdapter() get adapter', () => {
			const tracker = createTracker();
			tracker.getAdapter();
		});

		bench('isInScope() check', () => {
			const tracker = createTracker();
			tracker.isInScope();
		});
	});

	describe('Real-World Usage Patterns', () => {
		bench('simple read pattern (track)', () => {
			const tracker = createTracker();
			const users = new Map<string, {id: string; name: string}>();

			for (let i = 0; i < 100; i++) {
				users.set(`user-${i}`, {id: `user-${i}`, name: `User ${i}`});
			}

			mockAdapter.create().depend();
			tracker.track('users');
			[...users.values()];
		});

		bench('item-level read pattern (trackItem)', () => {
			const tracker = createTracker();
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
			const tracker = createTracker();
			const users = new Map<string, {id: string; name: string}>();

			for (let i = 0; i < 100; i++) {
				const user = {id: `user-${i}`, name: `User ${i}`};
				users.set(user.id, user);
				tracker.triggerCollection('users');
			}
		});

		bench('update item pattern (triggerItem)', () => {
			const tracker = createTracker();
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
			const tracker = createTracker();
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
			const tracker = createTracker();
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
			const tracker = createTracker();
			for (let i = 0; i < 1000; i++) {
				mockAdapter.create().depend();
				tracker.track('counter');
				tracker.trigger('counter');
			}
		});

		bench('1000 item track/trigger cycles', () => {
			const tracker = createTracker();
			for (let i = 0; i < 1000; i++) {
				mockAdapter.create().depend();
				tracker.trackItem('items', i);
				tracker.triggerItem('items', i);
			}
		});
	});
});
