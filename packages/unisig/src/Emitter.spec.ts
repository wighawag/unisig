import {describe, it, expect, vi} from 'vitest';
import {Emitter} from './Emitter';

type TestEvents = {
	'item:added': {id: string; name: string};
	'item:removed': string;
	'count:changed': number;
	cleared: void;
};

// Create a test emitter that exposes emit
class TestEmitter extends Emitter<TestEvents> {
	public emit<K extends keyof TestEvents>(event: K, data: TestEvents[K]): void {
		super.emit(event, data);
	}
}

describe('Emitter', () => {
	describe('on()', () => {
		it('should subscribe to events', () => {
			const emitter = new TestEmitter();
			const listener = vi.fn();

			emitter.on('item:added', listener);
			emitter.emit('item:added', {id: '1', name: 'Test'});

			expect(listener).toHaveBeenCalledTimes(1);
			expect(listener).toHaveBeenCalledWith({id: '1', name: 'Test'});
		});

		it('should return an unsubscribe function', () => {
			const emitter = new TestEmitter();
			const listener = vi.fn();

			const unsub = emitter.on('item:added', listener);
			unsub();
			emitter.emit('item:added', {id: '1', name: 'Test'});

			expect(listener).not.toHaveBeenCalled();
		});

		it('should allow multiple listeners for the same event', () => {
			const emitter = new TestEmitter();
			const listener1 = vi.fn();
			const listener2 = vi.fn();

			emitter.on('item:added', listener1);
			emitter.on('item:added', listener2);
			emitter.emit('item:added', {id: '1', name: 'Test'});

			expect(listener1).toHaveBeenCalledTimes(1);
			expect(listener2).toHaveBeenCalledTimes(1);
		});

		it('should handle events with different types', () => {
			const emitter = new TestEmitter();
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
			const emitter = new TestEmitter();
			const listener = vi.fn();

			emitter.on('cleared', listener);
			emitter.emit('cleared', undefined as void);

			expect(listener).toHaveBeenCalledTimes(1);
		});
	});

	describe('off()', () => {
		it('should unsubscribe a specific listener', () => {
			const emitter = new TestEmitter();
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
			const emitter = new TestEmitter();
			const listener = vi.fn();

			// Should not throw
			emitter.off('item:added', listener);
			expect(true).toBe(true);
		});
	});

	describe('once()', () => {
		it('should only fire once', () => {
			const emitter = new TestEmitter();
			const listener = vi.fn();

			emitter.once('item:added', listener);
			emitter.emit('item:added', {id: '1', name: 'First'});
			emitter.emit('item:added', {id: '2', name: 'Second'});

			expect(listener).toHaveBeenCalledTimes(1);
			expect(listener).toHaveBeenCalledWith({id: '1', name: 'First'});
		});

		it('should return an unsubscribe function that works before emission', () => {
			const emitter = new TestEmitter();
			const listener = vi.fn();

			const unsub = emitter.once('item:added', listener);
			unsub();
			emitter.emit('item:added', {id: '1', name: 'Test'});

			expect(listener).not.toHaveBeenCalled();
		});
	});

	describe('emit()', () => {
		it('should do nothing if no listeners', () => {
			const emitter = new TestEmitter();

			// Should not throw
			emitter.emit('item:added', {id: '1', name: 'Test'});
			expect(true).toBe(true);
		});

		it('should call listeners in order of subscription', () => {
			const emitter = new TestEmitter();
			const order: number[] = [];

			emitter.on('item:added', () => order.push(1));
			emitter.on('item:added', () => order.push(2));
			emitter.on('item:added', () => order.push(3));
			emitter.emit('item:added', {id: '1', name: 'Test'});

			expect(order).toEqual([1, 2, 3]);
		});
	});

	describe('type safety', () => {
		it('should enforce event types at compile time', () => {
			const emitter = new TestEmitter();

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
});
