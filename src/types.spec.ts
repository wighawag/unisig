import { describe, it, expect, vi } from 'vitest'
import { createReactivityAdapter } from './types'
import type { Dependency, ReactivityAdapter } from './types'

describe('types', () => {
  describe('createReactivityAdapter()', () => {
    it('should return the same object passed in', () => {
      const adapter: ReactivityAdapter = {
        create: () => ({
          depend: vi.fn(),
          notify: vi.fn(),
        }),
      }

      const result = createReactivityAdapter(adapter)
      expect(result).toBe(adapter)
    })

    it('should preserve type information for extended dependencies', () => {
      interface ExtendedDep extends Dependency {
        _internal: { value: number }
      }

      const adapter = createReactivityAdapter<ExtendedDep>({
        create: () => ({
          depend: vi.fn(),
          notify: vi.fn(),
          _internal: { value: 42 },
        }),
      })

      const dep = adapter.create() as ExtendedDep
      expect(dep._internal.value).toBe(42)
    })

    it('should work with all optional methods', () => {
      const onDisposeCallback = vi.fn()
      const isInScopeValue = true

      const adapter = createReactivityAdapter({
        create: () => ({
          depend: vi.fn(),
          notify: vi.fn(),
        }),
        isInScope: () => isInScopeValue,
        onDispose: (callback, _dep) => {
          onDisposeCallback(callback)
        },
      })

      expect(adapter.isInScope?.()).toBe(true)

      const dep = adapter.create()
      adapter.onDispose?.(() => {}, dep)
      expect(onDisposeCallback).toHaveBeenCalled()
    })
  })

  describe('Dependency interface', () => {
    it('should have depend and notify methods', () => {
      const dep: Dependency = {
        depend: vi.fn(),
        notify: vi.fn(),
      }

      dep.depend()
      dep.notify()

      expect(dep.depend).toHaveBeenCalledTimes(1)
      expect(dep.notify).toHaveBeenCalledTimes(1)
    })
  })

  describe('ReactivityAdapter interface', () => {
    it('should require create() method', () => {
      const minimalAdapter: ReactivityAdapter = {
        create: () => ({
          depend: () => {},
          notify: () => {},
        }),
      }

      expect(typeof minimalAdapter.create).toBe('function')
    })

    it('should allow optional isInScope', () => {
      const adapter: ReactivityAdapter = {
        create: () => ({ depend: () => {}, notify: () => {} }),
        isInScope: () => true,
      }

      expect(adapter.isInScope?.()).toBe(true)
    })

    it('should allow optional onDispose', () => {
      const cleanupFn = vi.fn()
      const adapter: ReactivityAdapter = {
        create: () => ({ depend: () => {}, notify: () => {} }),
        onDispose: (callback, _dep) => {
          // Simulate cleanup registration
          cleanupFn(callback)
        },
      }

      const dep = adapter.create()
      adapter.onDispose?.(() => console.log('cleanup'), dep)
      expect(cleanupFn).toHaveBeenCalled()
    })
  })
})