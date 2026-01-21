/**
 * This file demonstrates the type safety improvements made to trigger methods.
 * It will fail TypeScript compilation if the types are incorrect.
 */

import {Tracker} from '../src/index.js';

// Define events
type TestEvents = {
	'user:added': {id: string; name: string};
	'user:removed': string;
	'user:updated': {id: string; changes: Partial<{name: string; age: number}>};
	cleared: void;
};

const tracker = new Tracker<TestEvents>();

// These should all work fine (no TypeScript errors):
tracker.trigger('config');
tracker.trigger('config', 'user:added', {id: '1', name: 'John'});

tracker.triggerItem('users', '123');
tracker.triggerItem('users', '123', 'user:added', {id: '123', name: 'Jane'});

tracker.triggerProp('config', 'theme');
tracker.triggerProp('config', 'theme', 'user:updated', {
	id: '1',
	changes: {name: 'Bob'},
});

tracker.triggerItemProp('users', '123', 'name');
tracker.triggerItemProp('users', '123', 'name', 'user:added', {
	id: '123',
	name: 'Alice',
});

tracker.triggerCollection('users');
tracker.triggerCollection('users', 'user:added', {id: '123', name: 'Charlie'});

tracker.triggerItemRemoved('users', '123');
tracker.triggerItemRemoved('users', '123', 'user:removed', '123');

tracker.triggerItemAdded('users');
tracker.triggerItemAdded('users', 'user:added', {id: '456', name: 'Diana'});

// These should produce TypeScript errors (commented out to allow compilation):

// @ts-expect-error - event provided but data is missing
tracker.trigger('config', 'user:added');

// @ts-expect-error - event provided but data is missing
tracker.triggerItem('users', '123', 'user:added');

// @ts-expect-error - event provided but data is missing
tracker.triggerProp('config', 'theme', 'user:updated');

// @ts-expect-error - event provided but data is missing
tracker.triggerItemProp('users', '123', 'name', 'user:added');

// @ts-expect-error - event provided but data is missing
tracker.triggerCollection('users', 'user:added');

// @ts-expect-error - event provided but data is missing
tracker.triggerItemRemoved('users', '123', 'user:removed');

// @ts-expect-error - event provided but data is missing
tracker.triggerItemAdded('users', 'user:added');
