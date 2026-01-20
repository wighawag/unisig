import {describe, it, expect, vi} from 'vitest';
import {Emitter} from '../src/Emitter.js';

type TestEvents = {
	'item:added': {id: string; name: string};
	'item:removed': string;
	'count:changed': number;
	cleared: void;
};

describe('Emitter', () => {
	describe('on()', () => {
		it('should subscribe to events', () => {
			const emitter = new Emitter<TestEvents>();
			const listener = vi.fn();

			emitter.on('item:added', listener);
			emitter.emit('item:added', {id: '1', name: 'Test'});

			expect(listener).toHaveBeenCalledTimes(1);
			expect(listener).toHaveBeenCalledWith({id: '1', name: 'Test'});
		});

		it('should return an unsubscribe function', () => {
			const emitter = new Emitter<TestEvents>();
			const listener = vi.fn();

			const unsub = emitter.on('item:added', listener);
			unsub();
			emitter.emit('item:added', {id: '1', name: 'Test'});

			expect(listener).not.toHaveBeenCalled();
		});

		it('should allow multiple listeners for the same event', () => {
			const emitter = new Emitter<TestEvents>();
			const listener1 = vi.fn();
			const listener2 = vi.fn();

			emitter.on('item:added', listener1);
			emitter.on('item:added', listener2);
			emitter.emit('item:added', {id: '1', name: 'Test'});

			expect(listener1).toHaveBeenCalledTimes(1);
			expect(listener2).toHaveBeenCalledTimes(1);
		});

		it('should handle events with different types', () => {
			const emitter = new Emitter<TestEvents>();
			const stringListener = vi.fn();
			const numberListener = vi.fn();

			emitter.on('item:removed', stringListener);
			emitter.on('count:changed', numberListener);

			emitter.emit('item:removed', 'id-123');
			emitter.emit('count:changed', 42);

			expect(stringListener).toHaveBeenCalledWith('id-123');
			expect(numberListener).toHaveBeenCalledWith(42);
		});

		it('should handle void events', () => {
			const emitter = new Emitter<TestEvents>();
			const listener = vi.fn();

			emitter.on('cleared', listener);
			emitter.emit('cleared', undefined as void);

			expect(listener).toHaveBeenCalledTimes(1);
		});
	});

	describe('off()', () => {
		it('should unsubscribe a specific listener', () => {
			const emitter = new Emitter<TestEvents>();
			const listener1 = vi.fn();
			const listener2 = vi.fn();

			emitter.on('item:added', listener1);
			emitter.on('item:added', listener2);
			emitter.off('item:added', listener1);
			emitter.emit('item:added', {id: '1', name: 'Test'});

			expect(listener1).not.toHaveBeenCalled();
			expect(listener2).toHaveBeenCalledTimes(1);
		});

		it('should do nothing if listener not found', () => {
			const emitter = new Emitter<TestEvents>();
			const listener = vi.fn();

			// Should not throw
			emitter.off('item:added', listener);
			expect(true).toBe(true);
		});
	});

	describe('once()', () => {
		it('should only fire once', () => {
			const emitter = new Emitter<TestEvents>();
			const listener = vi.fn();

			emitter.once('item:added', listener);
			emitter.emit('item:added', {id: '1', name: 'First'});
			emitter.emit('item:added', {id: '2', name: 'Second'});

			expect(listener).toHaveBeenCalledTimes(1);
			expect(listener).toHaveBeenCalledWith({id: '1', name: 'First'});
		});

		it('should return an unsubscribe function that works before emission', () => {
			const emitter = new Emitter<TestEvents>();
			const listener = vi.fn();

			const unsub = emitter.once('item:added', listener);
			unsub();
			emitter.emit('item:added', {id: '1', name: 'Test'});

			expect(listener).not.toHaveBeenCalled();
		});
	});

	describe('emit()', () => {
		it('should do nothing if no listeners', () => {
			const emitter = new Emitter<TestEvents>();

			// Should not throw
			emitter.emit('item:added', {id: '1', name: 'Test'});
			expect(true).toBe(true);
		});

		it('should call listeners in order of subscription', () => {
			const emitter = new Emitter<TestEvents>();
			const order: number[] = [];

			emitter.on('item:added', () => order.push(1));
			emitter.on('item:added', () => order.push(2));
			emitter.on('item:added', () => order.push(3));
			emitter.emit('item:added', {id: '1', name: 'Test'});

			expect(order).toEqual([1, 2, 3]);
		});
	});

	describe('hasListeners()', () => {
		it('should return true when listeners exist', () => {
			const emitter = new Emitter<TestEvents>();
			const listener = vi.fn();

			emitter.on('item:added', listener);
			expect(emitter.hasListeners('item:added')).toBe(true);
		});

		it('should return false when no listeners exist', () => {
			const emitter = new Emitter<TestEvents>();
			expect(emitter.hasListeners('item:added')).toBe(false);
		});

		it('should return false after unsubscribing all listeners', () => {
			const emitter = new Emitter<TestEvents>();
			const listener = vi.fn();

			emitter.on('item:added', listener);
			emitter.off('item:added', listener);
			expect(emitter.hasListeners('item:added')).toBe(false);
		});
	});

	describe('listenerCount()', () => {
		it('should return the number of listeners', () => {
			const emitter = new Emitter<TestEvents>();

			expect(emitter.listenerCount('item:added')).toBe(0);

			emitter.on('item:added', vi.fn());
			expect(emitter.listenerCount('item:added')).toBe(1);

			emitter.on('item:added', vi.fn());
			emitter.on('item:added', vi.fn());
			expect(emitter.listenerCount('item:added')).toBe(3);
		});

		it('should return 0 for events with no listeners', () => {
			const emitter = new Emitter<TestEvents>();
			expect(emitter.listenerCount('nonexistent' as any)).toBe(0);
		});
	});

	describe('removeAllListeners()', () => {
		it('should remove all listeners for a specific event', () => {
			const emitter = new Emitter<TestEvents>();
			const listener1 = vi.fn();
			const listener2 = vi.fn();
			const listener3 = vi.fn();

			emitter.on('item:added', listener1);
			emitter.on('item:added', listener2);
			emitter.on('item:removed', listener3);

			emitter.removeAllListeners('item:added');

			emitter.emit('item:added', {id: '1', name: 'Test'});
			emitter.emit('item:removed', 'id-123');

			expect(listener1).not.toHaveBeenCalled();
			expect(listener2).not.toHaveBeenCalled();
			expect(listener3).toHaveBeenCalledTimes(1);
		});

		it('should remove all listeners when no event specified', () => {
			const emitter = new Emitter<TestEvents>();
			const listener1 = vi.fn();
			const listener2 = vi.fn();
			const listener3 = vi.fn();

			emitter.on('item:added', listener1);
			emitter.on('item:removed', listener2);
			emitter.on('cleared', listener3);

			emitter.removeAllListeners();

			emitter.emit('item:added', {id: '1', name: 'Test'});
			emitter.emit('item:removed', 'id-123');
			emitter.emit('cleared', undefined as void);

			expect(listener1).not.toHaveBeenCalled();
			expect(listener2).not.toHaveBeenCalled();
			expect(listener3).not.toHaveBeenCalled();
		});
	});

	describe('type safety', () => {
		it('should enforce event types at compile time', () => {
			const emitter = new Emitter<TestEvents>();

			// These should compile
			emitter.on('item:added', (item) => {
				const _id: string = item.id;
				const _name: string = item.name;
			});

			emitter.on('item:removed', (id) => {
				const _id: string = id;
			});

			emitter.on('count:changed', (count) => {
				const _count: number = count;
			});

			// Type assertions to verify
			expect(true).toBe(true);
		});
	});

	describe('error handling', () => {
		it('should propagate error when no error handler (fail-fast)', () => {
			const emitter = new Emitter<TestEvents>();
			const error = new Error('Listener error');

			emitter.on('item:added', () => {
				throw error;
			});

			expect(() => emitter.emit('item:added', {id: '1', name: 'Test'})).toThrow(
				error,
			);
		});

		it('should call error handler when configured', () => {
			const errorHandler = vi.fn();
			const emitter = new Emitter<TestEvents>({errorHandler});
			const error = new Error('Listener error');

			emitter.on('item:added', () => {
				throw error;
			});

			emitter.emit('item:added', {id: '1', name: 'Test'});

			expect(errorHandler).toHaveBeenCalledTimes(1);
			expect(errorHandler).toHaveBeenCalledWith(
				'item:added',
				error,
				expect.any(Function),
			);
		});

		it('should continue execution after error when handler configured', () => {
			const errorHandler = vi.fn();
			const emitter = new Emitter<TestEvents>({errorHandler});
			const listener1 = vi.fn(() => {
				throw new Error('Listener 1 error');
			});
			const listener2 = vi.fn();

			emitter.on('item:added', listener1);
			emitter.on('item:added', listener2);

			emitter.emit('item:added', {id: '1', name: 'Test'});

			expect(listener1).toHaveBeenCalledTimes(1);
			expect(listener2).toHaveBeenCalledTimes(1);
			expect(errorHandler).toHaveBeenCalledTimes(1);
		});

		it('should handle multiple errors in same emit', () => {
			const errorHandler = vi.fn();
			const emitter = new Emitter<TestEvents>({errorHandler});
			const error1 = new Error('Error 1');
			const error2 = new Error('Error 2');

			emitter.on('item:added', () => {
				throw error1;
			});
			emitter.on('item:added', () => {
				throw error2;
			});

			emitter.emit('item:added', {id: '1', name: 'Test'});

			expect(errorHandler).toHaveBeenCalledTimes(2);
			expect(errorHandler).toHaveBeenNthCalledWith(
				1,
				'item:added',
				error1,
				expect.any(Function),
			);
			expect(errorHandler).toHaveBeenNthCalledWith(
				2,
				'item:added',
				error2,
				expect.any(Function),
			);
		});

		it('should pass the listener function to error handler', () => {
			const errorHandler = vi.fn();
			const emitter = new Emitter<TestEvents>({errorHandler});
			const error = new Error('Listener error');
			const listenerFn = () => {
				throw error;
			};

			emitter.on('item:added', listenerFn);

			emitter.emit('item:added', {id: '1', name: 'Test'});

			expect(errorHandler).toHaveBeenCalledWith(
				'item:added',
				error,
				listenerFn,
			);
		});

		it('should work with once() and error handler', () => {
			const errorHandler = vi.fn();
			const emitter = new Emitter<TestEvents>({errorHandler});
			const listener = vi.fn(() => {
				throw new Error('Once listener error');
			});

			emitter.once('item:added', listener);

			emitter.emit('item:added', {id: '1', name: 'Test'});

			expect(listener).toHaveBeenCalledTimes(1);
			expect(errorHandler).toHaveBeenCalledTimes(1);

			// Should not be called again (once behavior)
			emitter.emit('item:added', {id: '2', name: 'Test'});
			expect(listener).toHaveBeenCalledTimes(1);
		});

		it('should stop execution immediately when no error handler', () => {
			const emitter = new Emitter<TestEvents>();
			const listener1 = vi.fn(() => {
				throw new Error('Error');
			});
			const listener2 = vi.fn();

			emitter.on('item:added', listener1);
			emitter.on('item:added', listener2);

			expect(() =>
				emitter.emit('item:added', {id: '1', name: 'Test'}),
			).toThrow();

			expect(listener1).toHaveBeenCalledTimes(1);
			expect(listener2).not.toHaveBeenCalled();
		});

		it('should handle void events with errors', () => {
			const errorHandler = vi.fn();
			const emitter = new Emitter<TestEvents>({errorHandler});

			emitter.on('cleared', () => {
				throw new Error('Cleared error');
			});

			emitter.emit('cleared', undefined as void);

			expect(errorHandler).toHaveBeenCalledWith(
				'cleared',
				expect.any(Error),
				expect.any(Function),
			);
		});
	});
});
