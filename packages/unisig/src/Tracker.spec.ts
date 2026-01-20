import {describe, it, expect, vi, beforeEach} from 'vitest';
import {Tracker, tracker} from './Tracker';
import type {ReactivityAdapter} from './types';

// Mock adapter
function createMockAdapter() {
	const deps: Array<{
		depend: ReturnType<typeof vi.fn>;
		notify: ReturnType<typeof vi.fn>;
	}> = [];

	const adapter: ReactivityAdapter & {deps: typeof deps; inScope: boolean} = {
		deps,
		inScope: true,
		create() {
			const dep = {
				depend: vi.fn(),
				notify: vi.fn(),
			};
			deps.push(dep);
			return dep;
		},
		isInScope() {
			return this.inScope;
		},
	};

	return adapter;
}

type TestEvents = {
	'item:added': {id: string; value: number};
	'item:removed': string;
	'list:cleared': void;
};

describe('Tracker', () => {
	describe('constructor and tracker()', () => {
		it('should create without adapter', () => {
			const r = new Tracker<TestEvents>();
			expect(r.getAdapter()).toBeUndefined();
		});

		it('should create with adapter', () => {
			const adapter = createMockAdapter();
			const r = new Tracker<TestEvents>(adapter);
			expect(r.getAdapter()).toBe(adapter);
		});

		it('tracker() should be equivalent to new Tracker()', () => {
			const r = tracker<TestEvents>();
			expect(r).toBeInstanceOf(Tracker);
		});
	});

	describe('setAdapter()', () => {
		it('should set the adapter', () => {
			const r = new Tracker<TestEvents>();
			const adapter = createMockAdapter();

			r.setAdapter(adapter);
			expect(r.getAdapter()).toBe(adapter);
		});
	});

	describe('Event methods', () => {
		it('on() should subscribe to events', () => {
			const r = new Tracker<TestEvents>();
			const listener = vi.fn();

			r.on('item:added', listener);
			r.emit('item:added', {id: '1', value: 42});

			expect(listener).toHaveBeenCalledWith({id: '1', value: 42});
		});

		it('on() should return unsubscribe function', () => {
			const r = new Tracker<TestEvents>();
			const listener = vi.fn();

			const unsub = r.on('item:added', listener);
			unsub();
			r.emit('item:added', {id: '1', value: 42});

			expect(listener).not.toHaveBeenCalled();
		});

		it('off() should unsubscribe', () => {
			const r = new Tracker<TestEvents>();
			const listener = vi.fn();

			r.on('item:added', listener);
			r.off('item:added', listener);
			r.emit('item:added', {id: '1', value: 42});

			expect(listener).not.toHaveBeenCalled();
		});

		it('once() should only fire once', () => {
			const r = new Tracker<TestEvents>();
			const listener = vi.fn();

			r.once('item:added', listener);
			r.emit('item:added', {id: '1', value: 42});
			r.emit('item:added', {id: '2', value: 43});

			expect(listener).toHaveBeenCalledTimes(1);
		});
	});

	describe('Tracking methods', () => {
		it('track() should call depend when in scope', () => {
			const adapter = createMockAdapter();
			const r = new Tracker<TestEvents>(adapter);

			r.track('items');

			expect(adapter.deps).toHaveLength(1);
			expect(adapter.deps[0].depend).toHaveBeenCalledTimes(1);
		});

		it('track() should not track when not in scope', () => {
			const adapter = createMockAdapter();
			adapter.inScope = false;
			const r = new Tracker<TestEvents>(adapter);

			r.track('items');

			expect(adapter.deps).toHaveLength(0);
		});

		it('trackItem() should track both item and collection', () => {
			const adapter = createMockAdapter();
			const r = new Tracker<TestEvents>(adapter);

			r.trackItem('items', '1');

			expect(adapter.deps).toHaveLength(2);
		});
	});

	describe('Trigger methods', () => {
		describe('trigger()', () => {
			it('should notify signal', () => {
				const adapter = createMockAdapter();
				const r = new Tracker<TestEvents>(adapter);

				r.dep('items'); // Create dep
				r.trigger('items');

				expect(adapter.deps[0].notify).toHaveBeenCalledTimes(1);
			});

			it('should emit event if provided', () => {
				const adapter = createMockAdapter();
				const r = new Tracker<TestEvents>(adapter);
				const listener = vi.fn();

				r.on('item:added', listener);
				r.trigger('items', 'item:added', {id: '1', value: 42});

				expect(listener).toHaveBeenCalledWith({id: '1', value: 42});
			});

			it('should work without event', () => {
				const adapter = createMockAdapter();
				const r = new Tracker<TestEvents>(adapter);
				const listener = vi.fn();

				r.on('item:added', listener);
				r.trigger('items');

				expect(listener).not.toHaveBeenCalled();
			});
		});

		describe('triggerItem()', () => {
			it('should notify item signal', () => {
				const adapter = createMockAdapter();
				const r = new Tracker<TestEvents>(adapter);

				r.itemDep('items', '1');
				r.triggerItem('items', '1');

				expect(adapter.deps[0].notify).toHaveBeenCalledTimes(1);
			});

			it('should emit event if provided', () => {
				const adapter = createMockAdapter();
				const r = new Tracker<TestEvents>(adapter);
				const listener = vi.fn();

				r.on('item:added', listener);
				r.triggerItem('items', '1', 'item:added', {id: '1', value: 42});

				expect(listener).toHaveBeenCalledWith({id: '1', value: 42});
			});
		});

		describe('triggerList()', () => {
			it('should notify list signal', () => {
				const adapter = createMockAdapter();
				const r = new Tracker<TestEvents>(adapter);
	
				r.dep('items');
				r.triggerList('items');
	
				expect(adapter.deps[0].notify).toHaveBeenCalledTimes(1);
			});
	
			it('should emit event if provided', () => {
				const adapter = createMockAdapter();
				const r = new Tracker<TestEvents>(adapter);
				const listener = vi.fn();
	
				r.on('list:cleared', listener);
				r.triggerList('items', 'list:cleared', undefined as void);
	
				expect(listener).toHaveBeenCalledTimes(1);
			});
		});

		describe('triggerRemove()', () => {
			it('should notify item and list signals', () => {
				const adapter = createMockAdapter();
				const r = new Tracker<TestEvents>(adapter);

				r.itemDep('items', '1');
				r.dep('items');
				r.triggerRemove('items', '1');

				expect(adapter.deps[0].notify).toHaveBeenCalledTimes(1); // item
				expect(adapter.deps[1].notify).toHaveBeenCalledTimes(1); // list
			});

			it('should emit event if provided', () => {
				const adapter = createMockAdapter();
				const r = new Tracker<TestEvents>(adapter);
				const listener = vi.fn();

				r.on('item:removed', listener);
				r.triggerRemove('items', '1', 'item:removed', '1');

				expect(listener).toHaveBeenCalledWith('1');
			});
		});

		describe('triggerAdd()', () => {
			it('should notify list signal', () => {
				const adapter = createMockAdapter();
				const r = new Tracker<TestEvents>(adapter);

				r.dep('items');
				r.triggerAdd('items');

				expect(adapter.deps[0].notify).toHaveBeenCalledTimes(1);
			});

			it('should emit event if provided', () => {
				const adapter = createMockAdapter();
				const r = new Tracker<TestEvents>(adapter);
				const listener = vi.fn();

				r.on('item:added', listener);
				r.triggerAdd('items', 'item:added', {id: '1', value: 42});

				expect(listener).toHaveBeenCalledWith({id: '1', value: 42});
			});
		});
	});

	describe('emit()', () => {
		it('should emit event without triggering signals', () => {
			const adapter = createMockAdapter();
			const r = new Tracker<TestEvents>(adapter);
			const listener = vi.fn();

			r.dep('items'); // Create a dep
			r.on('item:added', listener);
			r.emit('item:added', {id: '1', value: 42});

			expect(listener).toHaveBeenCalledWith({id: '1', value: 42});
			expect(adapter.deps[0].notify).not.toHaveBeenCalled();
		});
	});

	describe('clear()', () => {
		it('should clear dependencies but not events', () => {
			const adapter = createMockAdapter();
			const r = new Tracker<TestEvents>(adapter);
			const listener = vi.fn();

			r.dep('items');
			r.on('item:added', listener);
			r.clear();

			// Events should still work
			r.emit('item:added', {id: '1', value: 42});
			expect(listener).toHaveBeenCalled();
		});
	});

	describe('Integration: Real usage pattern', () => {
		it('should work as expected in a store class', () => {
			type StoreEvents = {
				'user:added': {id: string; name: string};
				'user:updated': {id: string; changes: Record<string, unknown>};
				'user:removed': string;
			};

			class UserStore {
				private $ = new Tracker<StoreEvents>();
				private users = new Map<
					string,
					{id: string; name: string; score: number}
				>();

				setAdapter(adapter: ReactivityAdapter) {
					this.$.setAdapter(adapter);
				}

				on: typeof this.$.on = (e, l) => this.$.on(e, l);

				getAll() {
					this.$.track('users');
					return [...this.users.values()];
				}

				get(id: string) {
					this.$.trackItem('users', id);
					return this.users.get(id);
				}

				add(user: {id: string; name: string; score: number}) {
					this.users.set(user.id, user);
					this.$.triggerAdd('users', 'user:added', {
						id: user.id,
						name: user.name,
					});
				}

				update(id: string, changes: Partial<{name: string; score: number}>) {
					const user = this.users.get(id);
					if (!user) return;
					Object.assign(user, changes);
					this.$.triggerItem('users', id, 'user:updated', {id, changes});
				}

				remove(id: string) {
					if (!this.users.has(id)) return;
					this.users.delete(id);
					this.$.triggerRemove('users', id, 'user:removed', id);
				}
			}

			const adapter = createMockAdapter();
			const store = new UserStore();
			store.setAdapter(adapter);

			const addedListener = vi.fn();
			const updatedListener = vi.fn();
			const removedListener = vi.fn();

			store.on('user:added', addedListener);
			store.on('user:updated', updatedListener);
			store.on('user:removed', removedListener);

			// Get all - should track
			store.getAll();
			expect(adapter.deps).toHaveLength(1);
			expect(adapter.deps[0].depend).toHaveBeenCalledTimes(1);

			// Get one - should track item + list (but list dep already exists)
			store.get('1');
			expect(adapter.deps).toHaveLength(2); // existing list + new item dep
			expect(adapter.deps[0].depend).toHaveBeenCalledTimes(2); // list tracked again
			expect(adapter.deps[1].depend).toHaveBeenCalledTimes(1); // item tracked

			// Add
			store.add({id: '1', name: 'Alice', score: 0});
			expect(addedListener).toHaveBeenCalledWith({id: '1', name: 'Alice'});
			expect(adapter.deps[0].notify).toHaveBeenCalled(); // list dep notified

			// Update
			store.update('1', {score: 100});
			expect(updatedListener).toHaveBeenCalledWith({
				id: '1',
				changes: {score: 100},
			});

			// Remove
			store.remove('1');
			expect(removedListener).toHaveBeenCalledWith('1');
		});
	});

	describe('Property tracking', () => {
		describe('trackProp()', () => {
			it('should track property and key', () => {
				const adapter = createMockAdapter();
				const r = new Tracker<TestEvents>(adapter);

				r.trackProp('config', 'theme');

				expect(adapter.deps).toHaveLength(2);
				expect(adapter.deps[0].depend).toHaveBeenCalledTimes(1);
				expect(adapter.deps[1].depend).toHaveBeenCalledTimes(1);
			});
		});

		describe('trackItemProp()', () => {
			it('should track property, item, and collection', () => {
				const adapter = createMockAdapter();
				const r = new Tracker<TestEvents>(adapter);

				r.trackItemProp('items', '1', 'value');

				expect(adapter.deps).toHaveLength(3);
			});
		});

		describe('triggerProp()', () => {
			it('should notify property signal', () => {
				const adapter = createMockAdapter();
				const r = new Tracker<TestEvents>(adapter);

				r.propDep('config', 'theme');
				r.triggerProp('config', 'theme');

				expect(adapter.deps[0].notify).toHaveBeenCalledTimes(1);
			});

			it('should emit event if provided', () => {
				const adapter = createMockAdapter();
				const r = new Tracker<TestEvents>(adapter);
				const listener = vi.fn();

				r.on('item:added', listener);
				r.triggerProp('config', 'theme', 'item:added', {id: '1', value: 42});

				expect(listener).toHaveBeenCalledWith({id: '1', value: 42});
			});
		});

		describe('triggerItemProp()', () => {
			it('should notify property signal', () => {
				const adapter = createMockAdapter();
				const r = new Tracker<TestEvents>(adapter);

				r.itemPropDep('items', '1', 'value');
				r.triggerItemProp('items', '1', 'value');

				expect(adapter.deps[0].notify).toHaveBeenCalledTimes(1);
			});

			it('should emit event if provided', () => {
				const adapter = createMockAdapter();
				const r = new Tracker<TestEvents>(adapter);
				const listener = vi.fn();

				r.on('item:added', listener);
				r.triggerItemProp('items', '1', 'value', 'item:added', {
					id: '1',
					value: 42,
				});

				expect(listener).toHaveBeenCalledWith({id: '1', value: 42});
			});
		});
	});

	describe('Auto-tracking proxies', () => {
		describe('proxy()', () => {
			it('should auto-track property reads', () => {
				const adapter = createMockAdapter();
				const r = new Tracker<TestEvents>(adapter);

				const obj = {theme: 'dark'};
				const proxied = r.proxy(obj, 'config');

				void proxied.theme;

				expect(adapter.deps.length).toBeGreaterThan(0);
				expect(adapter.deps[0].depend).toHaveBeenCalled();
			});

			it('should auto-trigger property writes', () => {
				const adapter = createMockAdapter();
				const r = new Tracker<TestEvents>(adapter);

				const obj = {theme: 'dark'};
				const proxied = r.proxy(obj, 'config');

				r.propDep('config', 'theme');
				proxied.theme = 'light';

				expect(adapter.deps[0].notify).toHaveBeenCalled();
			});
		});

		describe('itemProxy()', () => {
			it('should auto-track property reads', () => {
				const adapter = createMockAdapter();
				const r = new Tracker<TestEvents>(adapter);

				const item = {id: '1', value: 42};
				const proxied = r.itemProxy(item, 'items', '1');

				void proxied.value;

				expect(adapter.deps.length).toBeGreaterThan(0);
			});

			it('should auto-trigger property writes', () => {
				const adapter = createMockAdapter();
				const r = new Tracker<TestEvents>(adapter);

				const item = {id: '1', value: 42};
				const proxied = r.itemProxy(item, 'items', '1');

				r.itemPropDep('items', '1', 'value');
				proxied.value = 100;

				expect(adapter.deps[0].notify).toHaveBeenCalled();
			});
		});
	});

	describe('Integration: Store with property-level reactivity', () => {
		it('should support granular property updates', () => {
			type PlayerEvents = {
				'player:scored': {id: string; score: number};
				'player:renamed': {id: string; name: string};
			};

			class PlayerStore {
				private $ = new Tracker<PlayerEvents>();
				private players = new Map<
					string,
					{id: string; name: string; score: number}
				>();

				setAdapter(adapter: ReactivityAdapter) {
					this.$.setAdapter(adapter);
				}

				on: typeof this.$.on = (e, l) => this.$.on(e, l);

				// Get player with auto-tracking proxy
				get(id: string) {
					this.$.trackItem('players', id);
					const player = this.players.get(id);
					return player ? this.$.itemProxy(player, 'players', id) : undefined;
				}

				// Get only the score (granular tracking)
				getScore(id: string) {
					this.$.trackItemProp('players', id, 'score');
					return this.players.get(id)?.score;
				}

				add(player: {id: string; name: string; score: number}) {
					this.players.set(player.id, player);
					this.$.triggerList('players');
				}

				// Update only score - triggers only score watchers
				updateScore(id: string, score: number) {
					const player = this.players.get(id);
					if (!player) return;
					player.score = score;
					this.$.triggerItemProp('players', id, 'score', 'player:scored', {
						id,
						score,
					});
				}

				// Update only name - triggers only name watchers
				updateName(id: string, name: string) {
					const player = this.players.get(id);
					if (!player) return;
					player.name = name;
					this.$.triggerItemProp('players', id, 'name', 'player:renamed', {
						id,
						name,
					});
				}
			}

			const adapter = createMockAdapter();
			const store = new PlayerStore();
			store.setAdapter(adapter);

			const scoreListener = vi.fn();
			const nameListener = vi.fn();

			store.on('player:scored', scoreListener);
			store.on('player:renamed', nameListener);

			// Add a player
			store.add({id: '1', name: 'Alice', score: 0});

			// Track only score
			store.getScore('1');
			const scoreDep = adapter.deps[0]; // First dep created for score prop

			// Track full player (creates more deps)
			store.get('1');

			// Update score - should trigger score dep
			store.updateScore('1', 100);
			expect(scoreListener).toHaveBeenCalledWith({id: '1', score: 100});
			expect(scoreDep.notify).toHaveBeenCalled();

			// Update name - should NOT trigger score dep again
			const scoreNotifyCount = scoreDep.notify.mock.calls.length;
			store.updateName('1', 'Bob');
			expect(nameListener).toHaveBeenCalledWith({id: '1', name: 'Bob'});
			expect(scoreDep.notify.mock.calls.length).toBe(scoreNotifyCount); // No new calls
		});
	});

	describe('Error handling with error handler', () => {
		it('should handle errors in event listeners with error handler', () => {
			type Events = {
				'user:error': {error: Error};
			};

			const errorHandler = vi.fn();
			const r = new Tracker<Events>({errorHandler});
			const testError = new Error('Test error');

			r.on('user:error', (data) => {
				throw testError;
			});

			r.emit('user:error', {error: testError});

			expect(errorHandler).toHaveBeenCalledWith(
				'user:error',
				testError,
				expect.any(Function),
			);
		});

		it('should integrate error handler with store pattern', () => {
			type StoreEvents = {
				'user:added': {id: string; name: string};
				'listener:error': {event: string; error: Error};
			};

			const errorHandler = vi.fn((event, error) => {
				// In production, you might log this or send to error tracking
				console.error(`Error in ${String(event)}:`, error);
			});

			class UserStore {
				private $ = new Tracker<StoreEvents>({errorHandler});
				private users = new Map<string, {id: string; name: string}>();

				on: typeof this.$.on = (e, l) => this.$.on(e, l);

				getAll() {
					this.$.track('users');
					return [...this.users.values()];
				}

				add(user: {id: string; name: string}) {
					this.users.set(user.id, user);
					this.$.trigger('users', 'user:added', user);
				}
			}

			const store = new UserStore();
			const errorListener = vi.fn(() => {
				throw new Error('Listener crashed');
			});

			store.on('user:added', errorListener);
			store.add({id: '1', name: 'Alice'});

			expect(errorHandler).toHaveBeenCalled();
			expect(errorHandler).toHaveBeenCalledWith(
				'user:added',
				expect.any(Error),
				expect.any(Function),
			);
		});

		it('should work with tracker() factory function and error handler', () => {
			const errorHandler = vi.fn();
			const r = tracker<TestEvents>({errorHandler});
			const error = new Error('Factory error');

			r.on('item:added', () => {
				throw error;
			});

			r.emit('item:added', {id: '1', value: 42});

			expect(errorHandler).toHaveBeenCalledWith(
				'item:added',
				error,
				expect.any(Function),
			);
		});
	});
});
