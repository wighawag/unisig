import {describe, bench} from 'vitest';
import {Emitter} from '../src/Emitter';

type TestEvents = {
	'item:added': {id: string; value: number};
	'item:updated': {id: string; value: number};
	cleared: void;
};

describe('Emitter Performance Benchmarks', () => {
	describe('Event Subscription', () => {
		bench('subscribe to event', () => {
			const emitter = new Emitter<TestEvents>();
			emitter.on('item:added', () => {});
		});

		bench('subscribe to 100 events', () => {
			const emitter = new Emitter<TestEvents>();
			for (let i = 0; i < 100; i++) {
				emitter.on('item:added', () => {});
			}
		});

		bench('subscribe to 1000 events', () => {
			const emitter = new Emitter<TestEvents>();
			for (let i = 0; i < 1000; i++) {
				emitter.on('item:added', () => {});
			}
		});
	});

	describe('Event Emission', () => {
		bench('emit to 1 listener', () => {
			const emitter = new Emitter<TestEvents>();
			emitter.on('item:added', () => {});
			emitter.emit('item:added', {id: '1', value: 42});
		});

		bench('emit to 10 listeners', () => {
			const emitter = new Emitter<TestEvents>();
			for (let i = 0; i < 10; i++) {
				emitter.on('item:added', () => {});
			}
			emitter.emit('item:added', {id: '1', value: 42});
		});

		bench('emit to 100 listeners', () => {
			const emitter = new Emitter<TestEvents>();
			for (let i = 0; i < 100; i++) {
				emitter.on('item:added', () => {});
			}
			emitter.emit('item:added', {id: '1', value: 42});
		});

		bench('emit to 1000 listeners', () => {
			const emitter = new Emitter<TestEvents>();
			for (let i = 0; i < 1000; i++) {
				emitter.on('item:added', () => {});
			}
			emitter.emit('item:added', {id: '1', value: 42});
		});

		bench('emit to no listeners (early return)', () => {
			const emitter = new Emitter<TestEvents>();
			emitter.emit('item:added', {id: '1', value: 42});
		});

		bench('emit to event with no listeners', () => {
			const emitter = new Emitter<TestEvents>();
			emitter.on('item:added', () => {});
			emitter.emit('item:updated', {id: '1', value: 42});
		});
	});

	describe('Event Unsubscription', () => {
		bench('unsubscribe from event', () => {
			const emitter = new Emitter<TestEvents>();
			const unsub = emitter.on('item:added', () => {});
			unsub();
		});

		bench('unsubscribe from 100 events', () => {
			const emitter = new Emitter<TestEvents>();
			const unsubs: Array<() => void> = [];
			for (let i = 0; i < 100; i++) {
				unsubs.push(emitter.on('item:added', () => {}));
			}
			for (const unsub of unsubs) {
				unsub();
			}
		});

		bench('off() method unsubscribe', () => {
			const emitter = new Emitter<TestEvents>();
			const listener = () => {};
			emitter.on('item:added', listener);
			emitter.off('item:added', listener);
		});
	});

	describe('once() Performance', () => {
		bench('subscribe with once()', () => {
			const emitter = new Emitter<TestEvents>();
			emitter.once('item:added', () => {});
		});

		bench('emit to once listener (auto-unsubscribe)', () => {
			const emitter = new Emitter<TestEvents>();
			emitter.once('item:added', () => {});
			emitter.emit('item:added', {id: '1', value: 42});
		});
	});

	describe('hasListeners() and listenerCount()', () => {
		bench('hasListeners() with listeners', () => {
			const emitter = new Emitter<TestEvents>();
			emitter.on('item:added', () => {});
			emitter.hasListeners('item:added');
		});

		bench('hasListeners() without listeners', () => {
			const emitter = new Emitter<TestEvents>();
			emitter.hasListeners('item:added');
		});

		bench('listenerCount() with 100 listeners', () => {
			const emitter = new Emitter<TestEvents>();
			for (let i = 0; i < 100; i++) {
				emitter.on('item:added', () => {});
			}
			emitter.listenerCount('item:added');
		});
	});

	describe('removeAllListeners()', () => {
		bench('remove all listeners from single event', () => {
			const emitter = new Emitter<TestEvents>();
			for (let i = 0; i < 100; i++) {
				emitter.on('item:added', () => {});
			}
			emitter.removeAllListeners('item:added');
		});

		bench('remove all listeners from all events', () => {
			const emitter = new Emitter<TestEvents>();
			for (let i = 0; i < 50; i++) {
				emitter.on('item:added', () => {});
				emitter.on('item:updated', () => {});
			}
			emitter.removeAllListeners();
		});
	});

	describe('Error Handling Performance', () => {
		bench('emit with error handler (no errors)', () => {
			const emitter = new Emitter<TestEvents>({
				errorHandler: () => {},
			});
			for (let i = 0; i < 10; i++) {
				emitter.on('item:added', () => {});
			}
			emitter.emit('item:added', {id: '1', value: 42});
		});

		bench('emit without error handler (fast path)', () => {
			const emitter = new Emitter<TestEvents>();
			for (let i = 0; i < 10; i++) {
				emitter.on('item:added', () => {});
			}
			emitter.emit('item:added', {id: '1', value: 42});
		});
	});
});