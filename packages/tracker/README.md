# @unisig/tracker

**Targeted reactivity tracking** for any signal library.

> **⚠️ Experimental**: This package is experimental and subject to change. Use with caution in production.

Part of the [unisig monorepo](https://github.com/wighawag/unisig).

## Features

- 📦 **Targeted reactivity** - Track at collection, item, or property level
- 🔄 **Auto-tracking proxies** - Shallow, deep, and read-only variants
- 🎯 **Framework-agnostic** - Works with any signal library via adapters
- ⚡ **Zero dependencies (except for unisig)** - Lightweight and fast
- 📝 **Type-safe** - Full TypeScript support

## Installation

```bash
npm install @unisig/tracker
# With an adapter
npm install @unisig/tracker @unisig/solid
# or
npm install @unisig/tracker @unisig/svelte
```

## Quick Start

```typescript
import { createTrackerFactory } from "@unisig/tracker";
import solidAdapter from "@unisig/solid";
import { createEffect } from "solid-js";

// Create factory with adapter
const createTracker = createTrackerFactory(solidAdapter);

class PlayerStore {
  private $ = createTracker();
  private players = new Map<string, { id: string; name: string; score: number }>();

  // READ methods: call track()
  getAll() {
    this.$.track("players");
    return [...this.players.values()];
  }

  getPlayer(id: string) {
    this.$.trackItem("players", id);
    return this.players.get(id);
  }

  getScore(id: string) {
    this.$.trackItemProp("players", id, "score");
    return this.players.get(id)?.score;
  }

  // WRITE methods: call trigger()
  add(player: { id: string; name: string; score: number }) {
    this.players.set(player.id, player);
    this.$.triggerItemAdded("players");
  }

  updateScore(id: string, score: number) {
    const player = this.players.get(id);
    if (player) {
      player.score = score;
      this.$.triggerItemProp("players", id, "score");
    }
  }

  remove(id: string) {
    if (this.players.has(id)) {
      this.players.delete(id);
      this.$.triggerItemRemoved("players", id);
    }
  }
}

const store = new PlayerStore();

// Reactive tracking in Solid.js
createEffect(() => {
  const players = store.getAll();
  console.log("Players:", players.length);
});

createEffect(() => {
  const score = store.getScore("player1");
  console.log("Player 1 score:", score);
});
```

## API Reference

### `createTrackerFactory(adapter)`

Create a factory function for creating Tracker instances with a pre-configured adapter.

```typescript
import { createTrackerFactory } from "@unisig/tracker";
import solidAdapter from "@unisig/solid";

const createTracker = createTrackerFactory(solidAdapter);

// Create Tracker instances
const playerTracker = createTracker();
const gameTracker = createTracker();
```

### `Tracker`

Main class for targeted signal tracking.

```typescript
const $ = createTracker();

// Check scope
$.getAdapter()             // Get current adapter
$.isInScope()              // Check if in reactive scope

// Tracking (for reads)
$.track(key)               // Track dependency by key
$.trackItem(collection, id) // Track specific item + collection
$.trackProp(key, prop)     // Track specific property of a key
$.trackItemProp(collection, id, prop) // Track specific property of an item

// Triggering (for writes)
$.trigger(key)             // Notify key watchers
$.triggerItem(collection, id)  // Notify item + all its props
$.triggerProp(key, prop)   // Notify property only
$.triggerItemProp(collection, id, prop) // Notify item property only
$.triggerCollection(collection)  // Notify collection watchers
$.triggerItemAdded(collection)   // Notify collection (alias)
$.triggerItemRemoved(collection, id) // Notify item + collection + cleanup

// Direct dependency access
$.dep(key)                 // Get/create dependency
$.itemDep(collection, id)  // Get/create item dependency
$.propDep(key, prop)       // Get/create property dependency
$.itemPropDep(collection, id, prop) // Get/create item property dependency
$.clear()                  // Clear all dependencies

// Auto-tracking proxies (shallow)
$.proxy(target, key)       // Create auto-tracking proxy
$.itemProxy(target, collection, id) // Create item proxy

// Deep auto-tracking proxies
$.deepProxy(target, key)   // Deep proxy with dot notation paths
$.deepItemProxy(target, collection, id) // Deep proxy for items

// Read-only proxies (track only, throw on write)
$.readonlyProxy(target, key)
$.readonlyItemProxy(target, collection, id)
$.readonlyDeepProxy(target, key)
$.readonlyDeepItemProxy(target, collection, id)
```

## Targeted Reactivity

### Philosophy: Tracking is Broad, Triggering is Targeted

- **Tracking (reading) is broad**: When you read data, you subscribe to all levels that might affect you.
- **Triggering (writing) is targeted**: When you write data, you only notify what actually changed.

**Example:**
```typescript
// Reading tracks collection, item, and property
getScore(id: string) {
  this.$.trackItemProp('players', id, 'score'); // Tracks property, item, AND collection
  return this.players.get(id)?.score;
}

// Writing only triggers the property
updateScore(id: string, score: number) {
  this.players.get(id).score = score;
  this.$.triggerItemProp('players', id, 'score'); // Only triggers property, NOT collection
}
```

### Collection Level

Track the entire collection:

```typescript
class Store {
  private $ = createTracker();

  getAll() {
    this.$.track("users");
    return [...this.users.values()];
  }

  add(user) {
    this.users.set(user.id, user);
    this.$.triggerCollection("users");
  }
}
```

### Item Level

Track specific items:

```typescript
class Store {
  private $ = createTracker();

  get(id) {
    this.$.trackItem("users", id);
    return this.users.get(id);
  }

  update(id, changes) {
    Object.assign(this.users.get(id), changes);
    this.$.triggerItem("users", id);
  }
}
```

### Property Level

Track specific properties:

```typescript
class Store {
  private $ = createTracker();

  getScore(id) {
    this.$.trackItemProp("users", id, "score");
    return this.users.get(id)?.score;
  }

  updateScore(id, score) {
    this.users.get(id).score = score;
    this.$.triggerItemProp("users", id, "score");
  }
}
```

## Auto-Tracking with Proxies

### Shallow Proxies

```typescript
class Store {
  private $ = createTracker();

  get(id) {
    this.$.trackItem("users", id);
    const user = this.users.get(id);
    return user ? this.$.itemProxy(user, "users", id) : undefined;
  }
}

// Usage
createEffect(() => {
  const user = store.get("1");
  console.log(user?.score); // Auto-tracks 'users:1:score'
});

// Can modify through proxy
const user = store.get("1");
if (user) {
  user.score = 100; // Auto-triggers 'users:1:score'
}
```

### Deep Proxies

For nested objects:

```typescript
class Store {
  private $ = createTracker();
  private players = new Map<string, Player>();

  get(id) {
    this.$.trackItem("players", id);
    const player = this.players.get(id);
    return player ? this.$.deepItemProxy(player, "players", id) : undefined;
  }
}

// Usage
createEffect(() => {
  const player = store.get("1");
  // Nested access is automatically tracked:
  console.log(player?.stats.health); // Tracks 'stats.health'
  console.log(player?.inventory[0]); // Tracks 'inventory.0'
});
```

### Read-Only Proxies

For safe read access that prevents accidental mutations:

```typescript
class Store {
  private $ = createTracker();

  getReadonly(id) {
    this.$.trackItem("users", id);
    const user = this.users.get(id);
    return user ? this.$.readonlyDeepItemProxy(user, "users", id) : undefined;
  }
}

// Usage
createEffect(() => {
  const user = store.getReadonly("1");
  console.log(user?.score); // Works - tracks 'score'
  user.score = 100; // Throws: Cannot modify read-only proxy
});
```

### What Gets Proxied

Deep proxies recursively wrap:
- Plain objects `{}`
- Arrays `[]` (with index tracking and mutation method support)

Deep proxies do **not** proxy:
- `Date`, `RegExp`, `Map`, `Set`, `WeakMap`, `WeakSet`, `Error`
- Promise-like objects
- Primitives (strings, numbers, booleans, null, undefined)

## Performance: Read-Only vs Proxied Getters

### Recommendation: Use Read-Only Getters by Default

```typescript
class PlayerStore {
  private $ = createTracker();
  private players = new Map<string, Player>();

  // ✅ Fast: Returns raw object with tracking
  get(id: string): Readonly<Player> | undefined {
    this.$.trackItem("players", id);
    return this.players.get(id); // No proxy!
  }

  // Update methods trigger reactivity
  updateScore(id: string, score: number): void {
    const player = this.players.get(id);
    if (!player) return;
    player.score = score;
    this.$.triggerItemProp("players", id, "score");
  }
}
```

### When to Use Proxied Getters

Use proxied getters only when you need fine-grained property-level tracking with automatic triggering:

```typescript
// For complex components that need targeted updates AND writes through proxy
getLive(id: string): Player | undefined {
  this.$.trackItem('players', id)
  const player = this.players.get(id)
  return player ? this.$.deepItemProxy(player, 'players', id) : undefined
}
```

### Summary

| Use Case | Recommended Approach | Performance |
|----------|---------------------|-------------|
| Simple list display | `get()` / `getAll()` (read-only) | ⚡ ~16M ops/sec |
| Property display | `getScore()` / `getName()` (property getters) | ⚡ ~16M ops/sec |
| Complex component | `getLive()` (deep proxy) | 🐢 ~100K ops/sec |

## Types

### `ScopeAdapter`

The adapter interface for `@unisig/tracker`:

```typescript
interface ScopeAdapter {
  create(): Dependency;
  isInScope?(): boolean;
  onDispose?(callback: () => void, dep: Dependency): void;
  reactive?<T>(initial: T): ReactiveResult<T>;
}
```

### `Dependency`

```typescript
interface Dependency {
  depend(): void;
  notify(): void;
}
```

### `ReactivityAdapter`

Full adapter that extends both `BasicReactivityAdapter` and `ScopeAdapter`:

```typescript
interface ReactivityAdapter extends BasicReactivityAdapter, ScopeAdapter {}
```

## Adapters

Official adapters:

- [`@unisig/solid`](https://github.com/wighawag/unisig/tree/main/packages/solid-js) - Solid.js adapter
- [`@unisig/svelte`](https://github.com/wighawag/unisig/tree/main/packages/svelte) - Svelte 5 adapter

### Creating Custom Adapters

```typescript
import type { ScopeAdapter } from "@unisig/tracker";
import { createSignal, getOwner, onCleanup } from "solid-js";

const solidAdapter: ScopeAdapter = {
  create: () => {
    const [track, trigger] = createSignal(undefined, { equals: false });
    return { depend: () => track(), notify: () => trigger(undefined) };
  },
  isInScope: () => !!getOwner(),
  onDispose: (cb) => onCleanup(cb),
};
```

## Related Packages

For simple reactive primitives (`reactive`, `signal`, `effect`), see [`unisig`](https://github.com/wighawag/unisig/tree/main/packages/unisig).

## Inspiration

This project was inspired by the reactivity adapter pattern from [signaldb](https://github.com/maxnowack/signaldb). The adapter interface used by unisig is an extended version of signaldb adapters.

## License

MIT