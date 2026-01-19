# Patterns Guide

This guide covers common patterns for building efficient, reactive data stores with `unisig`.

## Table of Contents

- [Pre-Indexing for O(1) Lookups](#pre-indexing-for-o1-lookups)
- [Lazy Caching](#lazy-caching)
- [Cross-Store Dependencies](#cross-store-dependencies)
- [Event-Based Alternatives](#event-based-alternatives)

---

## Pre-Indexing for O(1) Lookups

When you frequently access items by a specific field (like `starSystemId`), maintaining a pre-computed index avoids expensive O(n) filtering on every access.

### Problem

```typescript
class ActionsStore {
  private $ = new Reactive<{ actions: void }>()
  private actions: Action[] = []

  // ❌ BAD: O(n) filter runs on EVERY call
  getByStarSystem(starSystemId: bigint): Action[] {
    this.$.track('actions')
    return this.actions.filter(a => a.starSystemId === starSystemId)
  }
}
```

Even with granular tracking (`trackItem`), the filter still scans all actions.

### Solution: Pre-Indexing

```typescript
interface Action {
  id: string
  starSystemId: bigint
  type: string
  // ...other fields
}

type ActionEvents = {
  actions: void
  'actions-by-system': { systemId: string }
}

class ActionsStore {
  private $ = new Reactive<ActionEvents>()
  private actions: Action[] = []
  // Pre-computed index: starSystemId → actions for that system
  private actionsBySystem = new Map<string, Action[]>()

  // ✅ GOOD: O(1) lookup!
  getByStarSystem(starSystemId: bigint): Action[] {
    const key = starSystemId.toString()
    this.$.trackItem('actions-by-system', key)
    return this.actionsBySystem.get(key) ?? []
  }

  getAll(): Action[] {
    this.$.track('actions')
    return [...this.actions]
  }

  addAction(action: Action) {
    const key = action.starSystemId.toString()
    
    // Update main list
    this.actions.push(action)
    
    // Update index (O(1))
    let systemActions = this.actionsBySystem.get(key)
    if (!systemActions) {
      systemActions = []
      this.actionsBySystem.set(key, systemActions)
    }
    systemActions.push(action)
    
    // Trigger reactivity
    this.$.trigger('actions')
    this.$.triggerItem('actions-by-system', key)
  }

  removeAction(id: string) {
    const index = this.actions.findIndex(a => a.id === id)
    if (index === -1) return
    
    const action = this.actions[index]
    const key = action.starSystemId.toString()
    
    // Update main list
    this.actions.splice(index, 1)
    
    // Update index
    const systemActions = this.actionsBySystem.get(key)
    if (systemActions) {
      const idx = systemActions.findIndex(a => a.id === id)
      if (idx !== -1) systemActions.splice(idx, 1)
      // Optional: clean up empty arrays
      if (systemActions.length === 0) {
        this.actionsBySystem.delete(key)
      }
    }
    
    // Trigger reactivity
    this.$.trigger('actions')
    this.$.triggerItem('actions-by-system', key)
  }

  updateAction(id: string, updates: Partial<Action>) {
    const action = this.actions.find(a => a.id === id)
    if (!action) return

    const oldKey = action.starSystemId.toString()
    
    // Apply updates
    Object.assign(action, updates)
    
    const newKey = action.starSystemId.toString()
    
    // If starSystemId changed, update indices
    if (oldKey !== newKey) {
      // Remove from old index
      const oldSystemActions = this.actionsBySystem.get(oldKey)
      if (oldSystemActions) {
        const idx = oldSystemActions.findIndex(a => a.id === id)
        if (idx !== -1) oldSystemActions.splice(idx, 1)
      }
      
      // Add to new index
      let newSystemActions = this.actionsBySystem.get(newKey)
      if (!newSystemActions) {
        newSystemActions = []
        this.actionsBySystem.set(newKey, newSystemActions)
      }
      newSystemActions.push(action)
      
      // Trigger both systems
      this.$.triggerItem('actions-by-system', oldKey)
      this.$.triggerItem('actions-by-system', newKey)
    } else {
      this.$.triggerItem('actions-by-system', oldKey)
    }
    
    this.$.trigger('actions')
  }
}
```

### Performance Comparison

| Operation | Without Index | With Index |
|-----------|--------------|------------|
| `getByStarSystem(id)` | O(n) filter | O(1) lookup |
| `addAction(a)` | O(1) | O(1) |
| `removeAction(id)` | O(n) find | O(n) find + O(1) index |
| Memory | O(n) | O(n) + O(n) pointers |

---

## Lazy Caching

If you want to avoid the complexity of maintaining indices on every write, you can use lazy caching: compute on first access, cache the result, and invalidate when data changes.

```typescript
type ActionEvents = {
  actions: void
  'actions-by-system': { systemId: string }
}

class ActionsStore {
  private $ = new Reactive<ActionEvents>()
  private actions: Action[] = []
  private cache = new Map<string, { value: Action[], valid: boolean }>()

  getByStarSystem(starSystemId: bigint): Action[] {
    const key = starSystemId.toString()
    this.$.trackItem('actions-by-system', key)
    
    let cached = this.cache.get(key)
    if (!cached || !cached.valid) {
      // Compute only when needed
      const filtered = this.actions.filter(a => a.starSystemId === starSystemId)
      cached = { value: filtered, valid: true }
      this.cache.set(key, cached)
    }
    return cached.value
  }

  addAction(action: Action) {
    this.actions.push(action)
    
    // Invalidate only the affected cache entry
    const key = action.starSystemId.toString()
    const cached = this.cache.get(key)
    if (cached) cached.valid = false
    
    this.$.trigger('actions')
    this.$.triggerItem('actions-by-system', key)
  }

  removeAction(id: string) {
    const index = this.actions.findIndex(a => a.id === id)
    if (index === -1) return
    
    const action = this.actions[index]
    const key = action.starSystemId.toString()
    
    this.actions.splice(index, 1)
    
    // Invalidate cache
    const cached = this.cache.get(key)
    if (cached) cached.valid = false
    
    this.$.trigger('actions')
    this.$.triggerItem('actions-by-system', key)
  }

  // Optional: clear cache periodically or when it gets too large
  clearCache() {
    this.cache.clear()
  }
}
```

### Trade-offs

| Approach | Pros | Cons |
|----------|------|------|
| **Pre-Index** | Always O(1) reads | More code, memory for index |
| **Lazy Cache** | Simpler code, lazy computation | First access after invalidation is O(n) |

---

## Cross-Store Dependencies

When one store's derived values depend on another store's data, use the same tracking primitives.

### Example: Star Systems with Derived Action Counts

```typescript
// actions-store.ts
type ActionEvents = {
  actions: void
  'actions-by-system': { systemId: string }
}

class ActionsStore {
  private $ = new Reactive<ActionEvents>()
  private actionsBySystem = new Map<string, Action[]>()

  getByStarSystem(starSystemId: bigint): Action[] {
    const key = starSystemId.toString()
    this.$.trackItem('actions-by-system', key)
    return this.actionsBySystem.get(key) ?? []
  }

  // ... add/remove methods
}

// star-systems-store.ts
interface StarSystem {
  id: bigint
  name: string
  coordinates: { x: number, y: number, z: number }
}

interface StarSystemWithDerived extends StarSystem {
  pendingActionCount: number
  hasActiveFleet: boolean
}

type SystemEvents = {
  systems: void
  system: { id: string }
}

class StarSystemsStore {
  private $ = new Reactive<SystemEvents>()
  private systems = new Map<string, StarSystem>()
  
  constructor(private actionsStore: ActionsStore) {}

  // Derived value that depends on both stores
  getWithDerivedValues(id: bigint): StarSystemWithDerived | undefined {
    const key = id.toString()
    this.$.trackItem('system', key)  // Track this system
    
    const system = this.systems.get(key)
    if (!system) return undefined
    
    // This call tracks 'actions-by-system' for this specific system
    const actions = this.actionsStore.getByStarSystem(id)
    
    return {
      ...system,
      pendingActionCount: actions.filter(a => a.status === 'pending').length,
      hasActiveFleet: actions.some(a => a.type === 'fleet-movement')
    }
  }

  // ... other methods
}
```

### How It Works

When you call `getWithDerivedValues(42n)` inside a signal effect:

1. The effect tracks `system:42` from StarSystemsStore
2. The effect tracks `actions-by-system:42` from ActionsStore (via `getByStarSystem`)
3. When an action for system 42 is added/removed, the effect re-runs
4. When system 42 itself changes, the effect re-runs
5. Changes to other systems or other systems' actions don't trigger re-runs

---

## Event-Based Subscriptions

You can also subscribe to changes via events using `$.on()`. This is useful for non-reactive contexts or when you need explicit subscription control.

### Key Insight: Same Methods Work for Both Patterns

The tracking calls (`$.track()`, `$.trackItem()`) are **no-ops when called outside a reactive context**. This means you can use the **same methods** for both signal-based and event-based patterns:

```typescript
getByStarSystem(starSystemId: bigint): Action[] {
  const key = starSystemId.toString()
  this.$.trackItem('actions-by-system', key)  // No-op if no effect is running
  return this.actionsBySystem.get(key) ?? []
}
```

- **Inside signal effect:** `trackItem()` registers the dependency
- **Inside event callback:** `trackItem()` does nothing (no effect running)

### Adding Event Support to Your Store

Extend the store from the [Cross-Store Dependencies](#cross-store-dependencies) example by:
1. Making `$` public so consumers can subscribe
2. Emitting events in mutation methods

```typescript
type ActionEvents = {
  // For signal tracking
  actions: void
  'actions-by-system': { systemId: string }
  // For event subscriptions (optional, more semantic)
  'action-added': { action: Action }
  'action-removed': { id: string, systemId: string }
}

class ActionsStore {
  // Make $ public for event subscriptions
  public readonly $ = new Reactive<ActionEvents>()
  private actionsBySystem = new Map<string, Action[]>()

  // Same method works for both signals AND events
  getByStarSystem(starSystemId: bigint): Action[] {
    const key = starSystemId.toString()
    this.$.trackItem('actions-by-system', key)  // No-op outside reactive context
    return this.actionsBySystem.get(key) ?? []
  }

  addAction(action: Action) {
    const key = action.starSystemId.toString()
    
    let systemActions = this.actionsBySystem.get(key)
    if (!systemActions) {
      systemActions = []
      this.actionsBySystem.set(key, systemActions)
    }
    systemActions.push(action)
    
    // Trigger for signals
    this.$.trigger('actions')
    this.$.triggerItem('actions-by-system', key)
    
    // Emit events for subscribers
    this.$.emit('action-added', { action })
    this.$.emit('actions-by-system', { systemId: key })
  }

  removeAction(id: string) {
    for (const [key, actions] of this.actionsBySystem) {
      const idx = actions.findIndex(a => a.id === id)
      if (idx !== -1) {
        actions.splice(idx, 1)
        
        // Trigger for signals
        this.$.trigger('actions')
        this.$.triggerItem('actions-by-system', key)
        
        // Emit events for subscribers
        this.$.emit('action-removed', { id, systemId: key })
        this.$.emit('actions-by-system', { systemId: key })
        return
      }
    }
  }
}
```

### Same Store from Cross-Store Example, with Events

```typescript
class StarSystemsStore {
  public readonly $ = new Reactive<SystemEvents>()
  private systems = new Map<string, StarSystem>()
  
  constructor(private actionsStore: ActionsStore) {}

  // Same method works for both patterns!
  getWithDerivedValues(id: bigint): StarSystemWithDerived | undefined {
    const key = id.toString()
    this.$.trackItem('system', key)  // No-op outside reactive context
    
    const system = this.systems.get(key)
    if (!system) return undefined
    
    // This also tracks (or is no-op outside reactive context)
    const actions = this.actionsStore.getByStarSystem(id)
    
    return {
      ...system,
      pendingActionCount: actions.filter(a => a.status === 'pending').length,
      hasActiveFleet: actions.some(a => a.type === 'fleet-movement')
    }
  }

  // ... mutation methods emit events same as ActionsStore
}
```

### Using with Signals (Automatic)

```typescript
import { createEffect } from 'solid-js'

createEffect(() => {
  // Tracking calls register dependencies automatically
  const system = starSystemsStore.getWithDerivedValues(42n)
  console.log('System updated:', system)
  // Re-runs when system 42 or its actions change
})
```

### Using with Events (Manual)

```typescript
// Subscribe to derived values for a specific system
function subscribeToSystem(
  systemId: bigint,
  callback: (system: StarSystemWithDerived | undefined) => void
): () => void {
  const key = systemId.toString()
  
  const update = () => {
    // Same method! Tracking is no-op here.
    callback(starSystemsStore.getWithDerivedValues(systemId))
  }
  
  // Initial value
  update()
  
  // Subscribe to this system's changes
  const unsubSystem = starSystemsStore.$.on('system', (data) => {
    if (data.id === key) update()
  })
  
  // Subscribe to this system's actions changes
  const unsubActions = actionsStore.$.on('actions-by-system', (data) => {
    if (data.systemId === key) update()
  })
  
  return () => {
    unsubSystem()
    unsubActions()
  }
}

// Usage
const unsubscribe = subscribeToSystem(42n, (system) => {
  console.log('System 42 updated:', system)
})

// Later: clean up
unsubscribe()
```

### Direct Event Subscriptions

You can also subscribe directly to specific events:

```typescript
// Subscribe to all action additions
const unsub1 = actionsStore.$.on('action-added', ({ action }) => {
  console.log('Action added:', action)
})

// Subscribe to all action removals
const unsub2 = actionsStore.$.on('action-removed', ({ id, systemId }) => {
  console.log(`Action ${id} removed from system ${systemId}`)
})

// Subscribe to changes for a specific system
const unsub3 = actionsStore.$.on('actions-by-system', ({ systemId }) => {
  if (systemId === '42') {
    const actions = actionsStore.getByStarSystem(42n)  // Tracking is no-op here
    console.log('System 42 actions:', actions)
  }
})

// Clean up
unsub1()
unsub2()
unsub3()
```

### Summary: One Store, Two Patterns

| Pattern | How to Use | Tracking Behavior |
|---------|-----------|-------------------|
| **Signals** | Call methods inside `createEffect()` | `track()`/`trackItem()` registers dependencies |
| **Events** | Subscribe via `$.on()`, call methods in callback | `track()`/`trackItem()` is a no-op |

You don't need separate "Direct" methods - the same methods work everywhere!

---

## Summary

| Pattern | Use Case |
|---------|----------|
| **Pre-Indexing** | Frequent lookups by a specific field |
| **Lazy Caching** | Less frequent lookups, simpler code |
| **Cross-Store Tracking** | Derived values from multiple stores (signals) |
| **Event Subscriptions** | Non-reactive contexts, explicit control |
| **Hybrid** | Maximum flexibility for all consumers |