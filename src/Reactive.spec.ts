import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Reactive, reactive } from './Reactive'
import type { ReactivityAdapter } from './types'

// Mock adapter
function createMockAdapter() {
  const deps: Array<{ depend: ReturnType<typeof vi.fn>; notify: ReturnType<typeof vi.fn> }> = []

  const adapter: ReactivityAdapter & { deps: typeof deps; inScope: boolean } = {
    deps,
    inScope: true,
    create() {
      const dep = {
        depend: vi.fn(),
        notify: vi.fn(),
      }
      deps.push(dep)
      return dep
    },
    isInScope() {
      return this.inScope
    },
  }

  return adapter
}

type TestEvents = {
  'item:added': { id: string; value: number }
  'item:removed': string
  'list:cleared': void
}

describe('Reactive', () => {
  describe('constructor and reactive()', () => {
    it('should create without adapter', () => {
      const r = new Reactive<TestEvents>()
      expect(r.getAdapter()).toBeUndefined()
    })

    it('should create with adapter', () => {
      const adapter = createMockAdapter()
      const r = new Reactive<TestEvents>(adapter)
      expect(r.getAdapter()).toBe(adapter)
    })

    it('reactive() should be equivalent to new Reactive()', () => {
      const r = reactive<TestEvents>()
      expect(r).toBeInstanceOf(Reactive)
    })
  })

  describe('setAdapter()', () => {
    it('should set the adapter', () => {
      const r = new Reactive<TestEvents>()
      const adapter = createMockAdapter()

      r.setAdapter(adapter)
      expect(r.getAdapter()).toBe(adapter)
    })
  })

  describe('Event methods', () => {
    it('on() should subscribe to events', () => {
      const r = new Reactive<TestEvents>()
      const listener = vi.fn()

      r.on('item:added', listener)
      r.emit('item:added', { id: '1', value: 42 })

      expect(listener).toHaveBeenCalledWith({ id: '1', value: 42 })
    })

    it('on() should return unsubscribe function', () => {
      const r = new Reactive<TestEvents>()
      const listener = vi.fn()

      const unsub = r.on('item:added', listener)
      unsub()
      r.emit('item:added', { id: '1', value: 42 })

      expect(listener).not.toHaveBeenCalled()
    })

    it('off() should unsubscribe', () => {
      const r = new Reactive<TestEvents>()
      const listener = vi.fn()

      r.on('item:added', listener)
      r.off('item:added', listener)
      r.emit('item:added', { id: '1', value: 42 })

      expect(listener).not.toHaveBeenCalled()
    })

    it('once() should only fire once', () => {
      const r = new Reactive<TestEvents>()
      const listener = vi.fn()

      r.once('item:added', listener)
      r.emit('item:added', { id: '1', value: 42 })
      r.emit('item:added', { id: '2', value: 43 })

      expect(listener).toHaveBeenCalledTimes(1)
    })
  })

  describe('Tracking methods', () => {
    it('track() should call depend when in scope', () => {
      const adapter = createMockAdapter()
      const r = new Reactive<TestEvents>(adapter)

      r.track('items')

      expect(adapter.deps).toHaveLength(1)
      expect(adapter.deps[0].depend).toHaveBeenCalledTimes(1)
    })

    it('track() should not track when not in scope', () => {
      const adapter = createMockAdapter()
      adapter.inScope = false
      const r = new Reactive<TestEvents>(adapter)

      r.track('items')

      expect(adapter.deps).toHaveLength(0)
    })

    it('trackItem() should track both item and collection', () => {
      const adapter = createMockAdapter()
      const r = new Reactive<TestEvents>(adapter)

      r.trackItem('items', '1')

      expect(adapter.deps).toHaveLength(2)
    })
  })

  describe('Trigger methods', () => {
    describe('trigger()', () => {
      it('should notify signal', () => {
        const adapter = createMockAdapter()
        const r = new Reactive<TestEvents>(adapter)

        r.dep('items') // Create dep
        r.trigger('items')

        expect(adapter.deps[0].notify).toHaveBeenCalledTimes(1)
      })

      it('should emit event if provided', () => {
        const adapter = createMockAdapter()
        const r = new Reactive<TestEvents>(adapter)
        const listener = vi.fn()

        r.on('item:added', listener)
        r.trigger('items', 'item:added', { id: '1', value: 42 })

        expect(listener).toHaveBeenCalledWith({ id: '1', value: 42 })
      })

      it('should work without event', () => {
        const adapter = createMockAdapter()
        const r = new Reactive<TestEvents>(adapter)
        const listener = vi.fn()

        r.on('item:added', listener)
        r.trigger('items')

        expect(listener).not.toHaveBeenCalled()
      })
    })

    describe('triggerItem()', () => {
      it('should notify item signal', () => {
        const adapter = createMockAdapter()
        const r = new Reactive<TestEvents>(adapter)

        r.itemDep('items', '1')
        r.triggerItem('items', '1')

        expect(adapter.deps[0].notify).toHaveBeenCalledTimes(1)
      })

      it('should emit event if provided', () => {
        const adapter = createMockAdapter()
        const r = new Reactive<TestEvents>(adapter)
        const listener = vi.fn()

        r.on('item:added', listener)
        r.triggerItem('items', '1', 'item:added', { id: '1', value: 42 })

        expect(listener).toHaveBeenCalledWith({ id: '1', value: 42 })
      })
    })

    describe('triggerList()', () => {
      it('should notify list signal', () => {
        const adapter = createMockAdapter()
        const r = new Reactive<TestEvents>(adapter)

        r.dep('items')
        r.triggerList('items')

        expect(adapter.deps[0].notify).toHaveBeenCalledTimes(1)
      })

      it('should emit event if provided', () => {
        const adapter = createMockAdapter()
        const r = new Reactive<TestEvents>(adapter)
        const listener = vi.fn()

        r.on('list:cleared', listener)
        r.triggerList('items', 'list:cleared', undefined as void)

        expect(listener).toHaveBeenCalledTimes(1)
      })
    })

    describe('triggerRemove()', () => {
      it('should notify item and list signals', () => {
        const adapter = createMockAdapter()
        const r = new Reactive<TestEvents>(adapter)

        r.itemDep('items', '1')
        r.dep('items')
        r.triggerRemove('items', '1')

        expect(adapter.deps[0].notify).toHaveBeenCalledTimes(1) // item
        expect(adapter.deps[1].notify).toHaveBeenCalledTimes(1) // list
      })

      it('should emit event if provided', () => {
        const adapter = createMockAdapter()
        const r = new Reactive<TestEvents>(adapter)
        const listener = vi.fn()

        r.on('item:removed', listener)
        r.triggerRemove('items', '1', 'item:removed', '1')

        expect(listener).toHaveBeenCalledWith('1')
      })
    })

    describe('triggerAdd()', () => {
      it('should notify list signal', () => {
        const adapter = createMockAdapter()
        const r = new Reactive<TestEvents>(adapter)

        r.dep('items')
        r.triggerAdd('items')

        expect(adapter.deps[0].notify).toHaveBeenCalledTimes(1)
      })

      it('should emit event if provided', () => {
        const adapter = createMockAdapter()
        const r = new Reactive<TestEvents>(adapter)
        const listener = vi.fn()

        r.on('item:added', listener)
        r.triggerAdd('items', 'item:added', { id: '1', value: 42 })

        expect(listener).toHaveBeenCalledWith({ id: '1', value: 42 })
      })
    })
  })

  describe('emit()', () => {
    it('should emit event without triggering signals', () => {
      const adapter = createMockAdapter()
      const r = new Reactive<TestEvents>(adapter)
      const listener = vi.fn()

      r.dep('items') // Create a dep
      r.on('item:added', listener)
      r.emit('item:added', { id: '1', value: 42 })

      expect(listener).toHaveBeenCalledWith({ id: '1', value: 42 })
      expect(adapter.deps[0].notify).not.toHaveBeenCalled()
    })
  })

  describe('clear()', () => {
    it('should clear dependencies but not events', () => {
      const adapter = createMockAdapter()
      const r = new Reactive<TestEvents>(adapter)
      const listener = vi.fn()

      r.dep('items')
      r.on('item:added', listener)
      r.clear()

      // Events should still work
      r.emit('item:added', { id: '1', value: 42 })
      expect(listener).toHaveBeenCalled()
    })
  })

  describe('Integration: Real usage pattern', () => {
    it('should work as expected in a store class', () => {
      type StoreEvents = {
        'user:added': { id: string; name: string }
        'user:updated': { id: string; changes: Record<string, unknown> }
        'user:removed': string
      }

      class UserStore {
        private $ = new Reactive<StoreEvents>()
        private users = new Map<string, { id: string; name: string; score: number }>()

        setAdapter(adapter: ReactivityAdapter) {
          this.$.setAdapter(adapter)
        }

        on: typeof this.$.on = (e, l) => this.$.on(e, l)

        getAll() {
          this.$.track('users')
          return [...this.users.values()]
        }

        get(id: string) {
          this.$.trackItem('users', id)
          return this.users.get(id)
        }

        add(user: { id: string; name: string; score: number }) {
          this.users.set(user.id, user)
          this.$.triggerAdd('users', 'user:added', { id: user.id, name: user.name })
        }

        update(id: string, changes: Partial<{ name: string; score: number }>) {
          const user = this.users.get(id)
          if (!user) return
          Object.assign(user, changes)
          this.$.triggerItem('users', id, 'user:updated', { id, changes })
        }

        remove(id: string) {
          if (!this.users.has(id)) return
          this.users.delete(id)
          this.$.triggerRemove('users', id, 'user:removed', id)
        }
      }

      const adapter = createMockAdapter()
      const store = new UserStore()
      store.setAdapter(adapter)

      const addedListener = vi.fn()
      const updatedListener = vi.fn()
      const removedListener = vi.fn()

      store.on('user:added', addedListener)
      store.on('user:updated', updatedListener)
      store.on('user:removed', removedListener)

      // Get all - should track
      store.getAll()
      expect(adapter.deps).toHaveLength(1)
      expect(adapter.deps[0].depend).toHaveBeenCalledTimes(1)

      // Get one - should track item + list (but list dep already exists)
      store.get('1')
      expect(adapter.deps).toHaveLength(2) // existing list + new item dep
      expect(adapter.deps[0].depend).toHaveBeenCalledTimes(2) // list tracked again
      expect(adapter.deps[1].depend).toHaveBeenCalledTimes(1) // item tracked

      // Add
      store.add({ id: '1', name: 'Alice', score: 0 })
      expect(addedListener).toHaveBeenCalledWith({ id: '1', name: 'Alice' })
      expect(adapter.deps[0].notify).toHaveBeenCalled() // list dep notified

      // Update
      store.update('1', { score: 100 })
      expect(updatedListener).toHaveBeenCalledWith({ id: '1', changes: { score: 100 } })

      // Remove
      store.remove('1')
      expect(removedListener).toHaveBeenCalledWith('1')
    })
  })
})