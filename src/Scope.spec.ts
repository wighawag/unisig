import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Scope } from './Scope'
import type { ReactivityAdapter, Dependency } from './types'

// Mock adapter that tracks all calls
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

describe('Scope', () => {
  describe('constructor', () => {
    it('should create without adapter', () => {
      const scope = new Scope()
      expect(scope.getAdapter()).toBeUndefined()
    })

    it('should create with adapter', () => {
      const adapter = createMockAdapter()
      const scope = new Scope(adapter)
      expect(scope.getAdapter()).toBe(adapter)
    })
  })

  describe('setAdapter()', () => {
    it('should set the adapter', () => {
      const scope = new Scope()
      const adapter = createMockAdapter()

      scope.setAdapter(adapter)
      expect(scope.getAdapter()).toBe(adapter)
    })
  })

  describe('isInScope()', () => {
    it('should return false if no adapter', () => {
      const scope = new Scope()
      expect(scope.isInScope()).toBe(false)
    })

    it('should return true if adapter has no isInScope', () => {
      const adapter: ReactivityAdapter = {
        create: () => ({ depend: vi.fn(), notify: vi.fn() }),
      }
      const scope = new Scope(adapter)
      expect(scope.isInScope()).toBe(true)
    })

    it('should delegate to adapter.isInScope', () => {
      const adapter = createMockAdapter()
      const scope = new Scope(adapter)

      adapter.inScope = true
      expect(scope.isInScope()).toBe(true)

      adapter.inScope = false
      expect(scope.isInScope()).toBe(false)
    })
  })

  describe('dep()', () => {
    it('should return null if no adapter', () => {
      const scope = new Scope()
      expect(scope.dep('test')).toBeNull()
    })

    it('should create and return a dependency', () => {
      const adapter = createMockAdapter()
      const scope = new Scope(adapter)

      const dep = scope.dep('test')
      expect(dep).not.toBeNull()
      expect(adapter.deps).toHaveLength(1)
    })

    it('should return the same dependency for the same key', () => {
      const adapter = createMockAdapter()
      const scope = new Scope(adapter)

      const dep1 = scope.dep('test')
      const dep2 = scope.dep('test')

      expect(dep1).toBe(dep2)
      expect(adapter.deps).toHaveLength(1)
    })

    it('should create different dependencies for different keys', () => {
      const adapter = createMockAdapter()
      const scope = new Scope(adapter)

      const dep1 = scope.dep('key1')
      const dep2 = scope.dep('key2')

      expect(dep1).not.toBe(dep2)
      expect(adapter.deps).toHaveLength(2)
    })
  })

  describe('itemDep()', () => {
    it('should return null if no adapter', () => {
      const scope = new Scope()
      expect(scope.itemDep('users', '1')).toBeNull()
    })

    it('should create per-item dependencies', () => {
      const adapter = createMockAdapter()
      const scope = new Scope(adapter)

      const dep = scope.itemDep('users', '1')
      expect(dep).not.toBeNull()
    })

    it('should return same dependency for same collection and id', () => {
      const adapter = createMockAdapter()
      const scope = new Scope(adapter)

      const dep1 = scope.itemDep('users', '1')
      const dep2 = scope.itemDep('users', '1')

      expect(dep1).toBe(dep2)
    })

    it('should create different dependencies for different ids', () => {
      const adapter = createMockAdapter()
      const scope = new Scope(adapter)

      const dep1 = scope.itemDep('users', '1')
      const dep2 = scope.itemDep('users', '2')

      expect(dep1).not.toBe(dep2)
    })

    it('should create different dependencies for different collections', () => {
      const adapter = createMockAdapter()
      const scope = new Scope(adapter)

      const dep1 = scope.itemDep('users', '1')
      const dep2 = scope.itemDep('posts', '1')

      expect(dep1).not.toBe(dep2)
    })

    it('should support numeric ids', () => {
      const adapter = createMockAdapter()
      const scope = new Scope(adapter)

      const dep1 = scope.itemDep('items', 1)
      const dep2 = scope.itemDep('items', 2)

      expect(dep1).not.toBe(dep2)
    })
  })

  describe('removeItemDep()', () => {
    it('should remove item dependency', () => {
      const adapter = createMockAdapter()
      const scope = new Scope(adapter)

      scope.itemDep('users', '1')
      expect(scope.hasItemDep('users', '1')).toBe(true)

      scope.removeItemDep('users', '1')
      expect(scope.hasItemDep('users', '1')).toBe(false)
    })

    it('should not throw if item does not exist', () => {
      const scope = new Scope()
      scope.removeItemDep('users', 'nonexistent')
      expect(true).toBe(true)
    })
  })

  describe('track()', () => {
    it('should do nothing if no adapter', () => {
      const scope = new Scope()
      scope.track('test') // Should not throw
      expect(true).toBe(true)
    })

    it('should do nothing if not in scope', () => {
      const adapter = createMockAdapter()
      adapter.inScope = false
      const scope = new Scope(adapter)

      scope.track('test')

      // Dep should not even be created
      expect(adapter.deps).toHaveLength(0)
    })

    it('should call depend() when in scope', () => {
      const adapter = createMockAdapter()
      const scope = new Scope(adapter)

      scope.track('test')

      expect(adapter.deps).toHaveLength(1)
      expect(adapter.deps[0].depend).toHaveBeenCalledTimes(1)
    })
  })

  describe('trackItem()', () => {
    it('should track both item and collection', () => {
      const adapter = createMockAdapter()
      const scope = new Scope(adapter)

      scope.trackItem('users', '1')

      // Should create 2 deps: one for item, one for collection
      expect(adapter.deps).toHaveLength(2)
      expect(adapter.deps[0].depend).toHaveBeenCalledTimes(1)
      expect(adapter.deps[1].depend).toHaveBeenCalledTimes(1)
    })
  })

  describe('trigger()', () => {
    it('should call notify() on dependency', () => {
      const adapter = createMockAdapter()
      const scope = new Scope(adapter)

      scope.dep('test') // Create the dep
      scope.trigger('test')

      expect(adapter.deps[0].notify).toHaveBeenCalledTimes(1)
    })

    it('should create dep if not exists', () => {
      const adapter = createMockAdapter()
      const scope = new Scope(adapter)

      scope.trigger('test')

      expect(adapter.deps).toHaveLength(1)
      expect(adapter.deps[0].notify).toHaveBeenCalledTimes(1)
    })
  })

  describe('triggerItem()', () => {
    it('should only notify item dep, not collection', () => {
      const adapter = createMockAdapter()
      const scope = new Scope(adapter)

      scope.itemDep('users', '1')
      scope.dep('users')

      scope.triggerItem('users', '1')

      expect(adapter.deps[0].notify).toHaveBeenCalledTimes(1) // item
      expect(adapter.deps[1].notify).not.toHaveBeenCalled() // collection
    })
  })

  describe('triggerList()', () => {
    it('should notify collection dep', () => {
      const adapter = createMockAdapter()
      const scope = new Scope(adapter)

      scope.dep('users')
      scope.triggerList('users')

      expect(adapter.deps[0].notify).toHaveBeenCalledTimes(1)
    })
  })

  describe('triggerRemove()', () => {
    it('should notify item, notify list, and remove item dep', () => {
      const adapter = createMockAdapter()
      const scope = new Scope(adapter)

      scope.itemDep('users', '1')
      scope.dep('users')

      scope.triggerRemove('users', '1')

      expect(adapter.deps[0].notify).toHaveBeenCalledTimes(1) // item
      expect(adapter.deps[1].notify).toHaveBeenCalledTimes(1) // collection
      expect(scope.hasItemDep('users', '1')).toBe(false) // cleaned up
    })
  })

  describe('clear()', () => {
    it('should clear all dependencies', () => {
      const adapter = createMockAdapter()
      const scope = new Scope(adapter)

      scope.dep('key1')
      scope.dep('key2')
      scope.itemDep('users', '1')
      scope.itemDep('users', '2')

      scope.clear()

      // After clear, new deps should be created for same keys
      const oldDepsCount = adapter.deps.length
      scope.dep('key1')
      expect(adapter.deps.length).toBe(oldDepsCount + 1)
    })
  })
})