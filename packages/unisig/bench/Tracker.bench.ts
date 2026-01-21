import {describe, bench} from 'vitest';
import {Tracker} from '../src/Tracker';
import {createReactivityAdapter} from '../src/types';

type TestEvents = {
	'user:added': {id: string; name: string};
	'user:updated': {id: string; changes: Partial<{name: string}>};
	'user:removed': string;
	cleared: void;
};

// Simple mock adapter for benchmarking
const mockAdapter = createReactivityAdapter({
	create: () => ({
		depend: () => {},
		notify: () => {},
	}),
});

describe('Tracker Performance Benchmarks', () => {
	describe('Instantiation', () => {
		bench('create Tracker without adapter', () => {
			new Tracker<TestEvents>();
		});

		bench('create Tracker with adapter', () => {
			new Tracker<TestEvents>({adapter: mockAdapter});
		});

		bench('create Tracker with options (adapter + error handler)', () => {
			new Tracker<TestEvents>({
				adapter: mockAdapter,
				errorHandler: () => {},
			});
		});

		bench('create 100 Tracker instances', () => {
			for (let i = 0; i < 100; i++) {
				new Tracker<TestEvents>({adapter: mockAdapter});
			}
		});
	});

	describe('Event Operations', () => {
		bench('on() subscribe to event', () => {
			const tracker = new Tracker<TestEvents>();
			tracker.on('user:added', () => {});
		});

		bench('on() subscribe to 100 events', () => {
			const tracker = new Tracker<TestEvents>();
			for (let i = 0; i < 100; i++) {
				tracker.on('user:added', () => {});
			}
		});

		bench('emit() to 10 listeners', () => {
			const tracker = new Tracker<TestEvents>();
			for (let i = 0; i < 10; i++) {
				tracker.on('user:added', () => {});
			}
			tracker.emit('user:added', {id: '1', name: 'Alice'});
		});

		bench('once() subscription', () => {
			const tracker = new Tracker<TestEvents>();
			tracker.once('user:added', () => {});
		});

		bench('off() unsubscribe', () => {
			const tracker = new Tracker<TestEvents>();
			const listener = () => {};
			tracker.on('user:added', listener);
			tracker.off('user:added', listener);
		});
	});

	describe('Combined Operations (Signal + Event)', () => {
		bench('trigger() with event (signals + events)', () => {
			const tracker = new Tracker<TestEvents>({adapter: mockAdapter});
			tracker.on('user:added', () => {});
			tracker.trigger('users', 'user:added', {id: '1', name: 'Alice'});
		});

		bench('triggerItem() with event', () => {
			const tracker = new Tracker<TestEvents>({adapter: mockAdapter});
			tracker.on('user:updated', () => {});
			tracker.triggerItem('users', 'user-1', 'user:updated', {
				id: 'user-1',
				changes: {name: 'Bob'},
			});
		});

		bench('triggerCollection() with event', () => {
			const tracker = new Tracker<TestEvents>({adapter: mockAdapter});
			tracker.on('user:added', () => {});
			tracker.triggerCollection('users', 'user:added', {
				id: '1',
				name: 'Alice',
			});
		});

		bench('triggerItemRemoved() with event', () => {
			const tracker = new Tracker<TestEvents>({adapter: mockAdapter});
			tracker.on('user:removed', () => {});
			tracker.triggerItemRemoved('users', 'user-1', 'user:removed', 'user-1');
		});
	});

	describe('Granular Tracking Operations', () => {
		bench('track() single key', () => {
			const tracker = new Tracker<TestEvents>({adapter: mockAdapter});
			mockAdapter.create().depend();
			tracker.track('users');
		});

		bench('track() 100 different keys', () => {
			const tracker = new Tracker<TestEvents>({adapter: mockAdapter});
			for (let i = 0; i < 100; i++) {
				mockAdapter.create().depend();
				tracker.track(`key_${i}`);
			}
		});

		bench('trackItem() single item', () => {
			const tracker = new Tracker<TestEvents>({adapter: mockAdapter});
			mockAdapter.create().depend();
			tracker.trackItem('users', 'user-1');
		});

		bench('trackItem() 100 different items', () => {
			const tracker = new Tracker<TestEvents>({adapter: mockAdapter});
			for (let i = 0; i < 100; i++) {
				mockAdapter.create().depend();
				tracker.trackItem('users', `user-${i}`);
			}
		});

		bench('trackProp() single property', () => {
			const tracker = new Tracker<TestEvents>({adapter: mockAdapter});
			mockAdapter.create().depend();
			tracker.trackProp('config', 'theme');
		});

		bench('trackItemProp() single item property', () => {
			const tracker = new Tracker<TestEvents>({adapter: mockAdapter});
			mockAdapter.create().depend();
			tracker.trackItemProp('users', 'user-1', 'name');
		});
	});

	describe('Dependency Access', () => {
		bench('dep() get or create dependency', () => {
			const tracker = new Tracker<TestEvents>({adapter: mockAdapter});
			tracker.dep('test');
		});

		bench('dep() get cached dependency', () => {
			const tracker = new Tracker<TestEvents>({adapter: mockAdapter});
			tracker.dep('test');
			tracker.dep('test');
		});

		bench('itemDep() get or create 100 item dependencies', () => {
			const tracker = new Tracker<TestEvents>({adapter: mockAdapter});
			for (let i = 0; i < 100; i++) {
				tracker.itemDep('users', `user-${i}`);
			}
		});

		bench('propDep() get or create 100 property dependencies', () => {
			const tracker = new Tracker<TestEvents>({adapter: mockAdapter});
			for (let i = 0; i < 100; i++) {
				tracker.propDep('config', `prop_${i}`);
			}
		});

		bench('itemPropDep() get or create 100 item property dependencies', () => {
			const tracker = new Tracker<TestEvents>({adapter: mockAdapter});
			for (let i = 0; i < 100; i++) {
				tracker.itemPropDep('users', 'user-1', `prop_${i}`);
			}
		});
	});

	describe('Adapter Management', () => {
		bench('getAdapter() get adapter', () => {
			const tracker = new Tracker<TestEvents>({adapter: mockAdapter});
			tracker.getAdapter();
		});

		bench('isInScope() check', () => {
			const tracker = new Tracker<TestEvents>({adapter: mockAdapter});
			tracker.isInScope();
		});
	});

	describe('Real-World Usage Patterns', () => {
		bench('simple read pattern (track)', () => {
			const tracker = new Tracker<TestEvents>({adapter: mockAdapter});
			const users = new Map<string, {id: string; name: string}>();

			for (let i = 0; i < 100; i++) {
				users.set(`user-${i}`, {id: `user-${i}`, name: `User ${i}`});
			}

			mockAdapter.create().depend();
			tracker.track('users');
			[...users.values()];
		});

		bench('item-level read pattern (trackItem)', () => {
			const tracker = new Tracker<TestEvents>({adapter: mockAdapter});
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

		bench('add item pattern (triggerCollection + emit)', () => {
			const tracker = new Tracker<TestEvents>({adapter: mockAdapter});
			tracker.on('user:added', () => {});
			const users = new Map<string, {id: string; name: string}>();

			for (let i = 0; i < 100; i++) {
				const user = {id: `user-${i}`, name: `User ${i}`};
				users.set(user.id, user);
				tracker.triggerCollection('users', 'user:added', user);
			}
		});

		bench('update item pattern (triggerItem)', () => {
			const tracker = new Tracker<TestEvents>({adapter: mockAdapter});
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
			const tracker = new Tracker<TestEvents>({adapter: mockAdapter});
			tracker.on('user:removed', () => {});
			const users = new Map<string, {id: string; name: string}>();

			for (let i = 0; i < 100; i++) {
				users.set(`user-${i}`, {id: `user-${i}`, name: `User ${i}`});
			}

			for (let i = 0; i < 100; i++) {
				users.delete(`user-${i}`);
				tracker.triggerItemRemoved(
					'users',
					`user-${i}`,
					'user:removed',
					`user-${i}`,
				);
			}
		});
	});

	describe('Cleanup Operations', () => {
		bench('clear() with many dependencies', () => {
			const tracker = new Tracker<TestEvents>({adapter: mockAdapter});
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
			const tracker = new Tracker<TestEvents>({adapter: mockAdapter});
			for (let i = 0; i < 1000; i++) {
				mockAdapter.create().depend();
				tracker.track('counter');
				tracker.trigger('counter');
			}
		});

		bench('1000 item track/trigger cycles', () => {
			const tracker = new Tracker<TestEvents>({adapter: mockAdapter});
			for (let i = 0; i < 1000; i++) {
				mockAdapter.create().depend();
				tracker.trackItem('items', i);
				tracker.triggerItem('items', i);
			}
		});
	});
});
