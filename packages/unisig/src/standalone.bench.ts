import {describe, bench} from 'vitest';
import {withAdapter, withAdapterRef, isRef} from './standalone';
import {createReactivityAdapter} from './types';

// Simple mock adapter for benchmarking
const mockAdapter = createReactivityAdapter({
	create: () => ({
		depend: () => {},
		notify: () => {},
	}),
});

describe('Standalone State Performance Benchmarks', () => {
	describe('withAdapter() Factory', () => {
		bench('create withAdapter factory', () => {
			withAdapter(mockAdapter);
		});

		bench('create 100 withAdapter factories', () => {
			for (let i = 0; i < 100; i++) {
				withAdapter(mockAdapter);
			}
		});
	});

	describe('Primitive State (Ref)', () => {
		bench('create number state', () => {
			const state = withAdapter(mockAdapter);
			state(0);
		});

		bench('create string state', () => {
			const state = withAdapter(mockAdapter);
			state('hello');
		});

		bench('create boolean state', () => {
			const state = withAdapter(mockAdapter);
			state(true);
		});

		bench('read number state value', () => {
			const state = withAdapter(mockAdapter);
			const count = state(0);
			mockAdapter.create().depend();
			count.value;
		});

		bench('write number state value', () => {
			const state = withAdapter(mockAdapter);
			const count = state(0);
			count.value = 100;
		});

		bench('increment number state 100 times', () => {
			const state = withAdapter(mockAdapter);
			const count = state(0);
			for (let i = 0; i < 100; i++) {
				count.value++;
			}
		});

		bench('toggle boolean state 100 times', () => {
			const state = withAdapter(mockAdapter);
			const flag = state(true);
			for (let i = 0; i < 100; i++) {
				flag.value = !flag.value;
			}
		});
	});

	describe('Object State', () => {
		bench('create simple object state', () => {
			const state = withAdapter(mockAdapter);
			state({name: 'Alice', score: 100});
		});

		bench('create nested object state', () => {
			const state = withAdapter(mockAdapter);
			state({
				name: 'Alice',
				stats: {
					health: 100,
					mana: 50,
					attributes: {
						strength: 10,
						dexterity: 15,
					},
				},
			});
		});

		bench('read shallow property from object state', () => {
			const state = withAdapter(mockAdapter);
			const user = state({name: 'Alice', score: 100});
			mockAdapter.create().depend();
			user.name;
		});

		bench('read nested property from object state', () => {
			const state = withAdapter(mockAdapter);
			const user = state({
				name: 'Alice',
				stats: {health: 100},
			});
			mockAdapter.create().depend();
			user.stats.health;
		});

		bench('write shallow property to object state', () => {
			const state = withAdapter(mockAdapter);
			const user = state({name: 'Alice', score: 100});
			user.score = 200;
		});

		bench('write nested property to object state', () => {
			const state = withAdapter(mockAdapter);
			const user = state({
				name: 'Alice',
				stats: {health: 100},
			});
			user.stats.health = 50;
		});

		bench('modify 100 properties on object state', () => {
			const state = withAdapter(mockAdapter);
			const obj = state(Object.fromEntries(
				Array.from({length: 100}, (_, i) => [`prop${i}`, i])
			));
			for (let i = 0; i < 100; i++) {
				obj[`prop${i}`] = i * 2;
			}
		});
	});

	describe('Array State', () => {
		bench('create array state', () => {
			const state = withAdapter(mockAdapter);
			state([1, 2, 3, 4, 5]);
		});

		bench('create array state with 100 elements', () => {
			const state = withAdapter(mockAdapter);
			state(Array.from({length: 100}, (_, i) => i));
		});

		bench('read array element', () => {
			const state = withAdapter(mockAdapter);
			const numbers = state([1, 2, 3, 4, 5]);
			mockAdapter.create().depend();
			numbers[0];
		});

		bench('push to array state', () => {
			const state = withAdapter(mockAdapter);
			const numbers = state([1, 2, 3]);
			numbers.push(4);
		});

		bench('push 100 elements to array state', () => {
			const state = withAdapter(mockAdapter);
			const numbers = state<number[]>([]);
			for (let i = 0; i < 100; i++) {
				numbers.push(i);
			}
		});

		bench('pop from array state', () => {
			const state = withAdapter(mockAdapter);
			const numbers = state([1, 2, 3, 4, 5]);
			numbers.pop();
		});

		bench('map array state', () => {
			const state = withAdapter(mockAdapter);
			const numbers = state([1, 2, 3, 4, 5]);
			mockAdapter.create().depend();
			numbers.map((x: number) => x * 2);
		});

		bench('forEach array state', () => {
			const state = withAdapter(mockAdapter);
			const numbers = state([1, 2, 3, 4, 5]);
			mockAdapter.create().depend();
			numbers.forEach((x: number) => x);
		});
	});

	describe('withAdapterRef() Factory', () => {
		bench('create withAdapterRef factory', () => {
			withAdapterRef(mockAdapter);
		});

		bench('create 100 withAdapterRef factories', () => {
			for (let i = 0; i < 100; i++) {
				withAdapterRef(mockAdapter);
			}
		});
	});

	describe('Ref Operations', () => {
		bench('create ref with number', () => {
			const ref = withAdapterRef(mockAdapter);
			ref(0);
		});

		bench('create ref with string', () => {
			const ref = withAdapterRef(mockAdapter);
			ref('hello');
		});

		bench('create ref with object', () => {
			const ref = withAdapterRef(mockAdapter);
			ref({name: 'Alice', score: 100});
		});

		bench('read ref value', () => {
			const ref = withAdapterRef(mockAdapter);
			const count = ref(0);
			mockAdapter.create().depend();
			count.value;
		});

		bench('write ref value', () => {
			const ref = withAdapterRef(mockAdapter);
			const count = ref(0);
			count.value = 100;
		});

		bench('read and write ref value 100 times', () => {
			const ref = withAdapterRef(mockAdapter);
			const count = ref(0);
			for (let i = 0; i < 100; i++) {
				mockAdapter.create().depend();
				count.value;
				count.value = i;
			}
		});
	});

	describe('isRef() Utility', () => {
		bench('isRef() on actual ref', () => {
			const state = withAdapter(mockAdapter);
			const count = state(0);
			isRef(count);
		});

		bench('isRef() on non-ref object', () => {
			const obj = {value: 1, other: 2};
			isRef(obj);
		});

		bench('isRef() on primitive', () => {
			isRef(42);
		});

		bench('isRef() on null', () => {
			isRef(null);
		});

		bench('isRef() 100 times on refs', () => {
			const state = withAdapter(mockAdapter);
			const refs = Array.from({length: 100}, (_, i) => state(i));
			for (const ref of refs) {
				isRef(ref);
			}
		});
	});

	describe('Real-World Usage Patterns', () => {
		bench('counter state pattern', () => {
			const state = withAdapter(mockAdapter);
			const count = state(0);
			for (let i = 0; i < 100; i++) {
				mockAdapter.create().depend();
				count.value;
				count.value++;
			}
		});

		bench('todo list state pattern', () => {
			const state = withAdapter(mockAdapter);
			const todos = state<
				Array<{id: string; text: string; done: boolean}>
			>([]);
			
			// Add todos
			for (let i = 0; i < 10; i++) {
				todos.push({id: `${i}`, text: `Todo ${i}`, done: false});
			}
			
			// Toggle todos
			for (let i = 0; i < 10; i++) {
				todos[i]!.done = !todos[i]!.done;
			}
		});

		bench('user profile state pattern', () => {
			const state = withAdapter(mockAdapter);
			const user = state({
				name: 'Alice',
				email: 'alice@example.com',
				settings: {
					theme: 'dark',
					notifications: true,
					language: 'en',
				},
			});
			
			// Read nested properties
			mockAdapter.create().depend();
			user.name;
			user.email;
			user.settings.theme;
			
			// Modify settings
			user.settings.notifications = false;
			user.settings.language = 'fr';
		});

		bench('shopping cart state pattern', () => {
			const state = withAdapter(mockAdapter);
			const cart = state({
				items: Array.from({length: 10}, (_, i) => ({
					id: `item-${i}`,
					name: `Product ${i}`,
					price: i * 10,
					quantity: 1,
				})),
				total: 0,
			});
			
			// Calculate total (read pattern)
			mockAdapter.create().depend();
			let total = 0;
			for (const item of cart.items) {
				total += item.price * item.quantity;
			}
			
			// Update quantity (write pattern)
			cart.items[0]!.quantity = 2;
			cart.items[1]!.quantity = 3;
		});
	});

	describe('Performance: State Creation', () => {
		bench('create 100 primitive states', () => {
			const state = withAdapter(mockAdapter);
			for (let i = 0; i < 100; i++) {
				state(i);
			}
		});

		bench('create 100 object states', () => {
			const state = withAdapter(mockAdapter);
			for (let i = 0; i < 100; i++) {
				state({id: i, name: `Item ${i}`});
			}
		});

		bench('create 100 refs', () => {
			const ref = withAdapterRef(mockAdapter);
			for (let i = 0; i < 100; i++) {
				ref(i);
			}
		});
	});

	describe('Complex State Scenarios', () => {
		bench('nested array of objects', () => {
			const state = withAdapter(mockAdapter);
			const data = state({
				users: Array.from({length: 10}, (_, i) => ({
					id: `${i}`,
					name: `User ${i}`,
					posts: Array.from({length: 5}, (_, j) => ({
						id: `${i}-${j}`,
						title: `Post ${j}`,
					})),
				})),
			});
			
			// Read deeply nested
			mockAdapter.create().depend();
			data.users[0]!.posts[0]!.title;
			
			// Write deeply nested
			data.users[0]!.name = 'Updated';
			data.users[0]!.posts[0]!.title = 'Updated';
		});

		bench('large object state with many properties', () => {
			const state = withAdapter(mockAdapter);
			const config = state(Object.fromEntries(
				Array.from({length: 100}, (_, i) => [`setting${i}`, `value${i}`])
			));
			
			// Read many properties
			for (let i = 0; i < 100; i++) {
				mockAdapter.create().depend();
				config[`setting${i}`];
			}
			
			// Write many properties
			for (let i = 0; i < 100; i++) {
				config[`setting${i}`] = `updated${i}`;
			}
		});
	});

	describe('Memory and Reuse Patterns', () => {
		bench('reuse same state instance', () => {
			const state = withAdapter(mockAdapter);
			const count = state(0);
			for (let i = 0; i < 1000; i++) {
				mockAdapter.create().depend();
				count.value;
				count.value = i;
			}
		});

		bench('create many separate states', () => {
			const state = withAdapter(mockAdapter);
			const states = Array.from({length: 100}, (_, i) => state(i));
			for (const s of states) {
				mockAdapter.create().depend();
				s.value;
			}
		});
	});
});