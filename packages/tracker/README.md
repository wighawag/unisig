# @unisig/tracker

**Granular reactivity tracking** with built-in events for any signal library.

Part of the [unisig monorepo](https://github.com/wighawag/unisig).

## Features

- 📦 **Granular reactivity** - Track at collection, item, or property level
- 🎪 **Event system** - Built-in event emitter for non-reactive contexts
- 🔄 **Deep proxies** - Automatic tracking of nested properties
- 🎯 **Framework-agnostic** - Works with any signal library via adapters
- ⚡ **Zero dependencies** - Lightweight and fast
- 📝 **Type-safe** - Full TypeScript support

## Installation

```bash
npm install @unisig/tracker
# With an adapter
npm install @unisig/tracker @unisig/solid-js
# or
npm install @unisig/tracker @unisig/svelte
```

## Quick Start

### Basic Usage with Events

```typescript
import { createTrackerFactory } from "@unisig/tracker";

// Define your events (use `type`, not `interface`)
type MyEvents = {
  "user:added": { id: string; name: string };
  "user:removed": string;
};

const createTracker = createTrackerFactory();

class UserStore {
  private $ = createTracker<MyEvents>();
  private users = new Map<string, { id: string; name: string }>();

  // Expose event subscription
  on: typeof this.$.on = (e, l) => this.$.on(e, l);

  // READ methods: call track()
  getAll() {
    this.$.track("users");
    return [...this.users.values()];
  }

  // WRITE methods: call trigger() with optional event
  add(user: { id: string; name: string }) {
    this.users.set(user.id, user);
    this.$.trigger("users", "user:added", user);
  }
}

// Usage
const store = new UserStore();

// Events work anywhere
store.on("user:added", (user) => {
  console.log("Added:", user.name);
});

store.add({ id: "1", name: "Alice" }); // Logs: "Added: Alice"
```

### Using with Signals

```typescript
import { createTrackerFactory } from "@unisig/tracker";
import solidAdapter from "@unisig/solid-js";
import { createEffect } from "solid-js";

// Create factory with adapter
const createTracker = createTrackerFactory(solidAdapter);

type UserEvents = {
  "user:added": { id: string; name: string };
};

class UserStore {
  private $ = createTracker<UserEvents>();
  private users = new Map<string, { id: string; name: string }>();

  getAll() {
    this.$.track("users");
    return [...this.users.values()];
  }

  add(user: { id: string; name: string }) {
    this.users.set(user.id, user);
    this.$.trigger("users", "user:added", user);
  }
}

const store = new UserStore();

// In a reactive context:
createEffect(() => {
  const users = store.getAll(); // Automatically tracked
  console.log("Users:", users);
});

store.add({ id: "1", name: "Alice" }); // Effect re-runs
```

## Why Both Signals and Events?

Signals require a "reactive scope" (an effect, computed, etc.) to work. Outside of that:

```typescript
// This WON'T work - not inside an effect
const users = store.getAll(); // track() does nothing outside reactive scope
```

**Events always work**, regardless of context:

```typescript
// This ALWAYS works
store.on("user:added", (user) => {
  console.log("Added:", user); // Fires every time, no matter where you call it
});
```

**Use events when:**
- Working in plain JavaScript (no framework)
- Doing one-time operations (API calls, logging)
- Framework hasn't set up reactive scope yet

**Use signals when:**
- Inside a framework's reactive system (Solid's `createEffect`, Vue's `watchEffect`, etc.)
- You want automatic, fine-grained updates

This library gives you **both** — events for reliability, signals for power.

## API Reference

### `createTrackerFactory(adapter?)`

Create a factory function for creating Tracker instances with a pre-configured adapter.

```typescript
import { createTrackerFactory } from "@unisig/tracker";
import solidAdapter from "@unisig/solid-js";

// Create the factory with your adapter
const createTracker = createTrackerFactory(solidAdapter);

// Use the factory to create typed Tracker instances
type PlayerEvents = {
  'player:added': Player;
  'player:removed': string;
};

const playerTracker = createTracker<PlayerEvents>();

// You can still pass additional options like errorHandler
const trackerWithErrorHandling = createTracker<PlayerEvents>({
  errorHandler: (event, error) => console.error(`Error in ${String(event)}:`, error),
});
```

**Benefits:**
- **Single adapter source** - Ensures all stores use the same adapter
- **Type-safe** - Each Tracker can have its own event types
- **Cleaner code** - No need to repeat `{ adapter }` on every instantiation
- **Better for testing** - Easy to create factories with mock adapters

### `Tracker<Events>`

Main class combining signals and events.

```typescript
const $ = createTracker<MyEvents>({ adapter })  // Pass adapter in options
$.getAdapter()             // Get current adapter
$.isInScope()              // Check if in reactive scope

// Events (always work)
$.on(event, listener)      // Subscribe to event
$.off(event, listener)     // Unsubscribe
$.once(event, listener)    // Subscribe once
$.emit(event, data)        // Emit event only (no signal)
$.hasListeners(event)      // Check if event has listeners
$.removeAllListeners(event?) // Remove listeners

// Tracking (for reads)
$.track(key)               // Track dependency by key
$.trackItem(collection, id) // Track specific item + collection
$.trackProp(key, prop)     // Track specific property of a key
$.trackItemProp(collection, id, prop) // Track specific property of an item

// Triggering (for writes)
$.trigger(key, event?, data?)           // Notify + emit
$.triggerItem(collection, id, event?, data?)  // Notify item + all its props
$.triggerList(collection, event?, data?)      // Notify list
$.triggerAdd(collection, event?, data?)       // Alias for triggerList
$.triggerRemove(collection, id, event?, data?) // Notify item + list + cleanup
$.triggerProp(key, prop, event?, data?)       // Notify property only
$.triggerItemProp(collection, id, prop, event?, data?) // Notify item property only

// Direct access
$.dep(key)                 // Get/create dependency
$.itemDep(collection, id)  // Get/create item dependency
$.propDep(key, prop)       // Get/create property dependency
$.itemPropDep(collection, id, prop) // Get/create item property dependency
$.clear()                  // Clear all dependencies

// Auto-tracking proxies (shallow - first level only)
$.proxy(target, key)       // Create auto-tracking proxy for an object
$.itemProxy(target, collection, id) // Create auto-tracking proxy for a collection item

// Deep auto-tracking proxies (any nesting level)
$.deepProxy(target, key)   // Deep proxy with dot notation paths
$.deepItemProxy(target, collection, id) // Deep proxy for collection items
```

### Error Handling

By default, errors in event listeners propagate immediately (fail-fast behavior). For production environments, you can configure an error handler:

```typescript
import { createTrackerFactory } from "@unisig/tracker";

const createTracker = createTrackerFactory(myAdapter);

// With error handler for production
const tracker = createTracker<MyEvents>({
  errorHandler: (event, error, listener) => {
    console.error(`Error in ${String(event)}:`, error);
    // Send to error tracking service
    Sentry.captureException(error, { tags: { event: String(event) } });
  },
});

// Now all listeners get a chance to run, even if one fails
tracker.on("user:added", (user) => {
  throw new Error("Oops!"); // Caught by errorHandler
});

tracker.on("user:added", (user) => {
  console.log("This still runs!"); // ✅
});
```

**Error Handler Signature:**

```typescript
type ErrorHandler<Events> = (
  event: keyof Events,
  error: Error,
  listener: Listener<unknown>,
) => void;
```

## Granular Reactivity

### Philosophy: Tracking is Broad, Triggering is Granular

- **Tracking (reading) is broad**: When you read data, you subscribe to all levels that might affect you.
- **Triggering (writing) is granular**: When you write data, you only notify what actually changed.

**Example:**
```typescript
// Reading tracks collection, item, and property
getUserScore(id: string) {
  this.$.trackItemProp('users', id, 'score'); // Tracks property, item, AND collection
  return this.users.get(id)?.score;
}

// Writing only triggers the property
updateUserScore(id: string, score: number) {
  this.users.get(id).score = score;
  this.$.triggerItemProp('users', id, 'score'); // Only triggers property, NOT collection
}
```

### Collection Level

Track the entire collection:

```typescript
class UserStore {
  private $ = createTracker<UserEvents>();

  getAll() {
    this.$.track("users");
    return [...this.users.values()];
  }

  add(user) {
    this.users.set(user.id, user);
    this.$.triggerList("users");
  }
}
```

### Item Level

Track specific items:

```typescript
class UserStore {
  private $ = createTracker<UserEvents>();

  getUser(id) {
    this.$.trackItem("users", id);
    return this.users.get(id);
  }

  updateUser(id, changes) {
    Object.assign(this.users.get(id), changes);
    this.$.triggerItem("users", id);
  }
}
```

### Property Level

Track specific properties:

```typescript
class UserStore {
  private $ = createTracker<UserEvents>();

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
class UserStore {
  private $ = createTracker<UserEvents>();

  getUser(id) {
    this.$.trackItem("users", id);
    const user = this.users.get(id);
    return user ? this.$.itemProxy(user, "users", id) : undefined;
  }
}

// Usage
createEffect(() => {
  const user = store.getUser("1");
  console.log(user?.score); // Auto-tracks 'users:1:score'
});

// Can modify through proxy
const user = store.getUser("1");
if (user) {
  user.score = 100; // Auto-triggers 'users:1:score'
}
```

### Deep Proxies

For nested objects, use deep proxies:

```typescript
class GameStore {
  private $ = createTracker<GameEvents>();
  private players = new Map<string, Player>();

  getPlayer(id) {
    this.$.trackItem("players", id);
    const player = this.players.get(id);
    return player ? this.$.deepItemProxy(player, "players", id) : undefined;
  }
}

// Usage
createEffect(() => {
  const player = store.getPlayer("1");
  // Nested access is automatically tracked:
  console.log(player?.stats.health); // Tracks 'stats.health'
  console.log(player?.inventory[0]); // Tracks 'inventory.0'
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

### Performance Comparison

| Approach | Performance | Speedup |
|----------|-------------|---------|
| Proxied getters (deep proxy) | ~100K ops/sec | 1x (baseline) |
| **Read-only getters (raw object)** | **~16M ops/sec** | **160x faster** |

### Recommendation: Use Read-Only Getters by Default

```typescript
class PlayerStore {
  private $ = createTracker<PlayerEvents>();
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
    this.$.triggerItemProp("players", id, "score", "player:scored", { id, score });
  }
}
```

### When to Use Live Objects

Use live getters (with proxies) only when you need fine-grained property-level tracking:

```typescript
// For complex components that need granular updates
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
| Property display | `getName()` / `getScore()` (property getters) | ⚡ ~16M ops/sec |
| Complex component | `getLive()` / `getAllLive()` (live/proxied) | 🐢 ~100K ops/sec |

## TypeScript

Full TypeScript support with strong event typing:

```typescript
// Use `type` instead of `interface` for event maps
type Events = {
  "item:added": { id: string; value: number };
  "item:removed": string;
  cleared: void;
};

const $ = createTracker<Events>();

// Type-safe events
$.on("item:added", (item) => {
  item.id; // string
  item.value; // number
});

$.emit("item:added", { id: "1", value: 42 }); // ✓
$.emit("item:added", { id: "1" }); // ✗ Error: missing value
```

## Types

### `ReactivityAdapter`

The adapter interface for `@unisig/tracker`:

```typescript
interface ReactivityAdapter {
  create: () => Dependency;
  isInScope?: () => boolean;
  onDispose?: (callback: () => void, dep: Dependency) => void;
}
```

### `Dependency`

```typescript
interface Dependency {
  depend: () => void;
  notify: () => void;
}
```

## Adapters

Official adapters:

- [`@unisig/solid-js`](https://github.com/wighawag/unisig/tree/main/packages/solid-js) - Solid.js adapter
- [`@unisig/svelte`](https://github.com/wighawag/unisig/tree/main/packages/svelte) - Svelte 5 adapter

### Creating Custom Adapters

```typescript
import type { ReactivityAdapter } from "@unisig/tracker";
import { createSignal, getOwner, onCleanup } from "solid-js";

const solidAdapter: ReactivityAdapter = {
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