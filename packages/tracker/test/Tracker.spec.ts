import {describe, it, expect, vi} from 'vitest';
import {ScopeAdapter} from '../src/types';
import {createTrackerFactory, Tracker} from '../src/Tracker';
import {ReactiveResult} from 'unisig';

// Mock adapter
function createMockAdapter() {
	const deps: Array<{
		depend: ReturnType<typeof vi.fn>;
		notify: ReturnType<typeof vi.fn>;
	}> = [];

	const adapter: ScopeAdapter & {deps: typeof deps; inScope: boolean} = {
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
		reactive: undefined as any,
	};

	return adapter;
}

const createTracker = createTrackerFactory(createMockAdapter());

describe('Tracker', () => {
	describe('constructor and tracker()', () => {
		it('should create with adapter', () => {
			const adapter = createMockAdapter();
			const r = createTrackerFactory(adapter)();
			expect(r.getAdapter()).toBe(adapter);
		});

		it('tracker() should be equivalent to createTracker()', () => {
			const r = createTracker();
			expect(r).toBeInstanceOf(Tracker);
		});
	});

	describe('Tracking methods', () => {
		it('track() should call depend when in scope', () => {
			const adapter = createMockAdapter();
			const r = createTrackerFactory(adapter)();

			r.track('items');

			expect(adapter.deps).toHaveLength(1);
			expect(adapter.deps[0].depend).toHaveBeenCalledTimes(1);
		});

		it('track() should not track when not in scope', () => {
			const adapter = createMockAdapter();
			adapter.inScope = false;
			const r = createTrackerFactory(adapter)();

			r.track('items');

			expect(adapter.deps).toHaveLength(0);
		});

		it('trackItem() should track both item and collection', () => {
			const adapter = createMockAdapter();
			const r = createTrackerFactory(adapter)();

			r.trackItem('items', '1');

			expect(adapter.deps).toHaveLength(2);
		});
	});

	describe('Trigger methods', () => {
		describe('trigger()', () => {
			it('should notify signal', () => {
				const adapter = createMockAdapter();
				const r = createTrackerFactory(adapter)();

				r.dep('items'); // Create dep
				r.trigger('items');

				expect(adapter.deps[0].notify).toHaveBeenCalledTimes(1);
			});
		});

		describe('triggerItem()', () => {
			it('should notify item signal', () => {
				const adapter = createMockAdapter();
				const r = createTrackerFactory(adapter)();

				r.itemDep('items', '1');
				r.triggerItem('items', '1');

				expect(adapter.deps[0].notify).toHaveBeenCalledTimes(1);
			});
		});

		describe('triggerCollection()', () => {
			it('should notify collection signal', () => {
				const adapter = createMockAdapter();
				const r = createTrackerFactory(adapter)();

				r.dep('items');
				r.triggerCollection('items');

				expect(adapter.deps[0].notify).toHaveBeenCalledTimes(1);
			});
		});

		describe('triggerItemRemoved()', () => {
			it('should notify item and collection signals', () => {
				const adapter = createMockAdapter();
				const r = createTrackerFactory(adapter)();

				r.itemDep('items', '1');
				r.dep('items');
				r.triggerItemRemoved('items', '1');

				expect(adapter.deps[0].notify).toHaveBeenCalledTimes(1); // item
				expect(adapter.deps[1].notify).toHaveBeenCalledTimes(1); // collection
			});
		});

		describe('triggerItemAdded()', () => {
			it('should notify collection signal', () => {
				const adapter = createMockAdapter();
				const r = createTrackerFactory(adapter)();

				r.dep('items');
				r.triggerItemAdded('items');

				expect(adapter.deps[0].notify).toHaveBeenCalledTimes(1);
			});
		});
	});

	describe('clear()', () => {
		it('should clear dependencies', () => {
			const adapter = createMockAdapter();
			const r = createTrackerFactory(adapter)();

			r.dep('items');
			r.clear();

			// Dependencies should be cleared
			expect(adapter.deps).toHaveLength(1);
		});
	});

	describe('Integration: Real usage pattern', () => {
		it('should work as expected in a store class', () => {
			class UserStore {
				private $: Tracker;
				private users = new Map<string, {id: string; name: string; score: number}>();

				constructor(adapter: ScopeAdapter) {
					this.$ = createTrackerFactory(adapter)();
				}

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
					this.$.triggerItemAdded('users');
				}

				update(id: string, changes: Partial<{name: string; score: number}>) {
					const user = this.users.get(id);
					if (!user) return;
					Object.assign(user, changes);
					this.$.triggerItem('users', id);
				}

				remove(id: string) {
					if (!this.users.has(id)) return;
					this.users.delete(id);
					this.$.triggerItemRemoved('users', id);
				}
			}

			const adapter = createMockAdapter();
			const store = new UserStore(adapter);

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
			expect(adapter.deps[0].notify).toHaveBeenCalled(); // list dep notified

			// Update
			store.update('1', {score: 100});

			// Remove
			store.remove('1');
		});
	});

	describe('Property tracking', () => {
		describe('trackProp()', () => {
			it('should track property and key', () => {
				const adapter = createMockAdapter();
				const r = createTrackerFactory(adapter)();

				r.trackProp('config', 'theme');

				expect(adapter.deps).toHaveLength(2);
				expect(adapter.deps[0].depend).toHaveBeenCalledTimes(1);
				expect(adapter.deps[1].depend).toHaveBeenCalledTimes(1);
			});
		});

		describe('trackItemProp()', () => {
			it('should track property, item, and collection', () => {
				const adapter = createMockAdapter();
				const r = createTrackerFactory(adapter)();

				r.trackItemProp('items', '1', 'value');

				expect(adapter.deps).toHaveLength(3);
			});
		});

		describe('triggerProp()', () => {
			it('should notify property signal', () => {
				const adapter = createMockAdapter();
				const r = createTrackerFactory(adapter)();

				r.propDep('config', 'theme');
				r.triggerProp('config', 'theme');

				expect(adapter.deps[0].notify).toHaveBeenCalledTimes(1);
			});
		});

		describe('triggerItemProp()', () => {
			it('should notify property signal', () => {
				const adapter = createMockAdapter();
				const r = createTrackerFactory(adapter)();

				r.itemPropDep('items', '1', 'value');
				r.triggerItemProp('items', '1', 'value');

				expect(adapter.deps[0].notify).toHaveBeenCalledTimes(1);
			});
		});
	});

	describe('Auto-tracking proxies', () => {
		describe('proxy()', () => {
			it('should auto-track property reads', () => {
				const adapter = createMockAdapter();
				const r = createTrackerFactory(adapter)();

				const obj = {theme: 'dark'};
				const proxied = r.proxy(obj, 'config');

				void proxied.theme;

				expect(adapter.deps.length).toBeGreaterThan(0);
				expect(adapter.deps[0].depend).toHaveBeenCalled();
			});

			it('should auto-trigger property writes', () => {
				const adapter = createMockAdapter();
				const r = createTrackerFactory(adapter)();

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
				const r = createTrackerFactory(adapter)();

				const item = {id: '1', value: 42};
				const proxied = r.itemProxy(item, 'items', '1');

				void proxied.value;

				expect(adapter.deps.length).toBeGreaterThan(0);
			});

			it('should auto-trigger property writes', () => {
				const adapter = createMockAdapter();
				const r = createTrackerFactory(adapter)();

				const item = {id: '1', value: 42};
				const proxied = r.itemProxy(item, 'items', '1');

				r.itemPropDep('items', '1', 'value');
				proxied.value = 100;

				expect(adapter.deps[0].notify).toHaveBeenCalled();
			});
		});
	});

	describe('Integration: Store with property-level reactivity', () => {
		it('should support targeted property updates', () => {
			class PlayerStore {
				private $: Tracker;
				private players = new Map<string, {id: string; name: string; score: number}>();

				constructor(adapter: ScopeAdapter) {
					this.$ = createTrackerFactory(adapter)();
				}

				// Get player with auto-tracking proxy
				get(id: string) {
					this.$.trackItem('players', id);
					const player = this.players.get(id);
					return player ? this.$.itemProxy(player, 'players', id) : undefined;
				}

				// Get only score (targeted tracking)
				getScore(id: string) {
					this.$.trackItemProp('players', id, 'score');
					return this.players.get(id)?.score;
				}

				add(player: {id: string; name: string; score: number}) {
					this.players.set(player.id, player);
					this.$.triggerCollection('players');
				}

				// Update only score - triggers only score watchers
				updateScore(id: string, score: number) {
					const player = this.players.get(id);
					if (!player) return;
					player.score = score;
					this.$.triggerItemProp('players', id, 'score');
				}

				// Update only name - triggers only name watchers
				updateName(id: string, name: string) {
					const player = this.players.get(id);
					if (!player) return;
					player.name = name;
					this.$.triggerItemProp('players', id, 'name');
				}
			}

			const adapter = createMockAdapter();
			const store = new PlayerStore(adapter);

			// Add a player
			store.add({id: '1', name: 'Alice', score: 0});

			// Track only score
			store.getScore('1');
			const scoreDep = adapter.deps[0]; // First dep created for score prop

			// Track full player (creates more deps)
			store.get('1');

			// Update score - should trigger score dep
			store.updateScore('1', 100);
			expect(scoreDep.notify).toHaveBeenCalled();

			// Update name - should NOT trigger score dep again
			const scoreNotifyCount = scoreDep.notify.mock.calls.length;
			store.updateName('1', 'Bob');
			expect(scoreDep.notify.mock.calls.length).toBe(scoreNotifyCount); // No new calls
		});
	});

	describe('createTrackerFactory()', () => {
		it('should create a factory that returns Tracker instances with configured adapter', () => {
			const adapter = createMockAdapter();
			const createTracker = createTrackerFactory(adapter);

			const tracker = createTracker();

			expect(tracker).toBeInstanceOf(Tracker);
			expect(tracker.getAdapter()).toBe(adapter);
		});

		it('should create multiple Trackers with same adapter', () => {
			const adapter = createMockAdapter();
			const createTracker = createTrackerFactory(adapter);

			const tracker1 = createTracker();
			const tracker2 = createTracker();

			expect(tracker1.getAdapter()).toBe(adapter);
			expect(tracker2.getAdapter()).toBe(adapter);
			expect(tracker1).not.toBe(tracker2); // Different instances
		});

		it('should work with signal tracking', () => {
			const adapter = createMockAdapter();
			const createTracker = createTrackerFactory(adapter);

			const tracker = createTracker();
			tracker.track('items');

			expect(adapter.deps).toHaveLength(1);
			expect(adapter.deps[0].depend).toHaveBeenCalledTimes(1);
		});
	});
});
