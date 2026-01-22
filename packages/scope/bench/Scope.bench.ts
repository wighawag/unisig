import {describe, bench, beforeEach} from 'vitest';
import {Scope} from '../src/Scope.js';
import {createReactivityAdapter} from '../src/types.js';

// Simple mock adapter for benchmarking
const mockAdapter = createReactivityAdapter({
	create: () => ({
		depend: () => {},
		notify: () => {},
	}),
});

describe('Scope Performance Benchmarks', () => {
	describe('Tracking Operations', () => {
		bench('track() outside scope', () => {
			const scope = new Scope();
			scope.track('test');
		});

		bench('track() inside scope', () => {
			const scope = new Scope(mockAdapter);
			mockAdapter.create().depend();
			scope.track('test');
		});

		bench('track() 100 times', () => {
			const scope = new Scope(mockAdapter);
			for (let i = 0; i < 100; i++) {
				scope.track(`key_${i}`);
			}
		});

		bench('trackItem() single item', () => {
			const scope = new Scope(mockAdapter);
			mockAdapter.create().depend();
			scope.trackItem('users', 'user-1');
		});

		bench('trackItem() 100 different items', () => {
			const scope = new Scope(mockAdapter);
			for (let i = 0; i < 100; i++) {
				mockAdapter.create().depend();
				scope.trackItem('users', `user-${i}`);
			}
		});

		bench('trackProp() single property', () => {
			const scope = new Scope(mockAdapter);
			mockAdapter.create().depend();
			scope.trackProp('config', 'theme');
		});

		bench('trackProp() 100 different properties', () => {
			const scope = new Scope(mockAdapter);
			for (let i = 0; i < 100; i++) {
				mockAdapter.create().depend();
				scope.trackProp('config', `prop_${i}`);
			}
		});

		bench('trackItemProp() single item property', () => {
			const scope = new Scope(mockAdapter);
			mockAdapter.create().depend();
			scope.trackItemProp('users', 'user-1', 'name');
		});
	});

	describe('Triggering Operations', () => {
		bench('trigger() single key', () => {
			const scope = new Scope(mockAdapter);
			scope.trigger('test');
		});

		bench('trigger() 100 different keys', () => {
			const scope = new Scope(mockAdapter);
			for (let i = 0; i < 100; i++) {
				scope.trigger(`key_${i}`);
			}
		});

		bench('triggerItem() single item', () => {
			const scope = new Scope(mockAdapter);
			scope.triggerItem('users', 'user-1');
		});

		bench('triggerItem() 100 different items', () => {
			const scope = new Scope(mockAdapter);
			for (let i = 0; i < 100; i++) {
				scope.triggerItem('users', `user-${i}`);
			}
		});

		bench('triggerProp() single property', () => {
			const scope = new Scope(mockAdapter);
			scope.triggerProp('config', 'theme');
		});

		bench('triggerItemProp() single item property', () => {
			const scope = new Scope(mockAdapter);
			scope.triggerItemProp('users', 'user-1', 'name');
		});

		bench('triggerList() single collection', () => {
			const scope = new Scope(mockAdapter);
			scope.triggerList('users');
		});

		bench('triggerRemove() single item', () => {
			const scope = new Scope(mockAdapter);
			scope.triggerRemove('users', 'user-1');
		});
	});

	describe('Dependency Management', () => {
		bench('dep() get or create single dependency', () => {
			const scope = new Scope(mockAdapter);
			scope.dep('test');
		});

		bench('dep() get cached dependency', () => {
			const scope = new Scope(mockAdapter);
			scope.dep('test');
			scope.dep('test');
		});

		bench('itemDep() get or create 100 item dependencies', () => {
			const scope = new Scope(mockAdapter);
			for (let i = 0; i < 100; i++) {
				scope.itemDep('users', `user-${i}`);
			}
		});

		bench('propDep() get or create 100 property dependencies', () => {
			const scope = new Scope(mockAdapter);
			for (let i = 0; i < 100; i++) {
				scope.propDep('config', `prop_${i}`);
			}
		});

		bench('itemPropDep() get or create 100 item property dependencies', () => {
			const scope = new Scope(mockAdapter);
			for (let i = 0; i < 100; i++) {
				scope.itemPropDep('users', 'user-1', `prop_${i}`);
			}
		});

		bench('removeItemDep() single item', () => {
			const scope = new Scope(mockAdapter);
			scope.itemDep('users', 'user-1');
			scope.removeItemDep('users', 'user-1');
		});
	});

	describe('Adapter Management', () => {
		bench('getAdapter() get adapter', () => {
			const scope = new Scope(mockAdapter);
			scope.getAdapter();
		});

		bench('isInScope() with adapter', () => {
			const scope = new Scope(mockAdapter);
			scope.isInScope();
		});

		bench('isInScope() without adapter', () => {
			const scope = new Scope();
			scope.isInScope();
		});
	});

	describe('Cleanup Operations', () => {
		bench('clear() with many dependencies', () => {
			const scope = new Scope(mockAdapter);
			for (let i = 0; i < 100; i++) {
				scope.dep(`key_${i}`);
				scope.itemDep('users', `user-${i}`);
				scope.propDep('config', `prop_${i}`);
			}
			scope.clear();
		});
	});

	describe('Conditional Tracking', () => {
		bench('track() when not in scope (early return)', () => {
			const scope = new Scope();
			for (let i = 0; i < 1000; i++) {
				scope.track(`key_${i}`);
			}
		});

		bench('trackItem() when not in scope (early return)', () => {
			const scope = new Scope();
			for (let i = 0; i < 1000; i++) {
				scope.trackItem('users', `user-${i}`);
			}
		});
	});

	describe('Granular Tracking Patterns', () => {
		bench('collection-level tracking (coarse)', () => {
			const scope = new Scope(mockAdapter);
			mockAdapter.create().depend();
			scope.track('users');
		});

		bench('item-level tracking (fine-grained)', () => {
			const scope = new Scope(mockAdapter);
			mockAdapter.create().depend();
			scope.trackItem('users', 'user-1');
		});

		bench('property-level tracking (very fine-grained)', () => {
			const scope = new Scope(mockAdapter);
			mockAdapter.create().depend();
			scope.trackItemProp('users', 'user-1', 'name');
		});

		bench('nested tracking (item + collection + property)', () => {
			const scope = new Scope(mockAdapter);
			mockAdapter.create().depend();
			scope.trackItemProp('users', 'user-1', 'stats.health');
		});
	});
});
