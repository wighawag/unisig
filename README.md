# unisig

**Universal signals** — add reactivity to any data with pluggable signal adapters and built-in events.

**Zero dependencies.** Works with any signal library (Solid.js, Preact Signals, Vue, MobX, Svelte, etc.) or just events.

## Features

- 🎯 **Framework-agnostic** - Works with any signal library
- ⚡ **Zero dependencies** - Lightweight and fast
- 📦 **Granular reactivity** - Track at collection, item, or property level
- 🎪 **Event system** - Built-in event emitter for non-reactive contexts
- 🔌 **Pluggable adapters** - Works with signaldb adapters
- 🔄 **Deep proxies** - Automatic tracking of nested properties
- 📝 **Type-safe** - Full TypeScript support
- 🧪 **Well-tested** - Comprehensive test coverage

## Installation

```bash
npm install unisig
```

## How Signals Work (Beginner's Guide)

If you're new to signals or find them confusing, this section is for you.

### The Problem Signals Solve

Without signals, you manually tell the UI to update:

```typescript
// Manual approach - tedious and error-prone
let count = 0;

function increment() {
  count++;
  updateCountDisplay(); // Must remember to call this!
  updateTotalDisplay(); // And this!
  updateButtonState(); // And this!
}
```

**Problem**: Forget one update call, and your UI is out of sync.

### How Signals Work

Signals **automatically track** what depends on what, then update only what's needed:

```typescript
// With signals - automatic updates
const count = signal(0);

// This "effect" automatically re-runs when count changes
effect(() => {
  console.log("Count is:", count.value); // Reading creates a dependency
});

count.value++; // Effect automatically re-runs!
```

**Magic**: The effect re-ran without you telling it to. How?

### The Core Mechanism: depend() and notify()

Every signal library works the same way internally:

```
┌─────────────────────────────────────────────────────────────┐
│  READING (depend)                                           │
│                                                             │
│  When you READ a value inside an effect:                    │
│  1. The signal sees "someone is reading me"                 │
│  2. It records WHO is reading (the current effect)          │
│  3. This creates a "dependency"                             │
│                                                             │
│  effect(() => {                                             │
│    console.log(count.value)  ← "count" records this effect  │
│  })                                                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  WRITING (notify)                                           │
│                                                             │
│  When you WRITE a value:                                    │
│  1. The signal updates its value                            │
│  2. It notifies all recorded dependencies                   │
│  3. Those effects re-run                                    │
│                                                             │
│  count.value = 5  ← Triggers all effects that read "count"  │
└─────────────────────────────────────────────────────────────┘
```

**That's it!** Every signal library does these two things:

- **depend()**: "Remember that this effect needs me"
- **notify()**: "Tell all effects that need me to re-run"

> **How Does count Know Which Effect Is Running?**
>
> This is the clever trick: **there's a global "current effect" variable**.
>
> ```typescript
> // Simplified internals of any signal library:
>
> let currentEffect: Function | null = null; // ← Global tracker!
>
> function effect(fn) {
>   currentEffect = fn; // Step 1: Set "I'm the current effect"
>   fn(); // Step 2: Run the function (which reads signals)
>   currentEffect = null; // Step 3: Clear it
> }
>
> function createSignal(initial) {
>   let value = initial;
>   const subscribers = new Set(); // Effects that depend > on this signal
>
>   return {
>     get value() {
>       // When READ: record whoever is currently running
>       if (currentEffect) {
>         subscribers.add(currentEffect); // ← This is depend()!
>       }
>       return value;
>     },
>     set value(newVal) {
>       value = newVal;
>       // When WRITTEN: re-run all recorded effects
>       subscribers.forEach((fn) => fn()); // ← This is notify()!
>     },
>   };
> }
> ```
>
> **The flow:**
>
> ```
>
> 1. effect(() => { ... }) → Sets currentEffect = thisEffect
> 2. count.value → count sees currentEffect, adds it to subscribers
> 3. effect ends → Sets currentEffect = null
> 4. count.value = 5 → count loops through subscribers, calls each one
>
> ```
>
> This is why signals only work inside effects/computeds — outside of them, `currentEffect` is `null`, so nothing gets tracked.
>
> ```
>
> ```

### Why Adapters Work

Every signal library has `depend()` and `notify()` — they just call them different things:

| Library  | depend() equivalent          | notify() equivalent                      |
| -------- | ---------------------------- | ---------------------------------------- |
| Solid.js | Read a signal: `sig()`       | Write a signal: `setSig()`               |
| Preact   | Read: `sig.value`            | Write: `sig.value = x`                   |
| Vue      | Read: `ref.value`            | Write: `ref.value = x` or `triggerRef()` |
| MobX     | Read: `obs.prop`             | Write: `obs.prop = x`                    |
| Svelte 5 | Read a rune: `$state` getter | Write: `$state` setter                   |

An **adapter** simply maps these library-specific APIs to our generic interface:

```typescript
// Solid.js adapter
const solidAdapter = {
  create: () => {
    const [track, trigger] = createSignal(undefined);
    return {
      depend: () => track(), // Reading = depend
      notify: () => trigger(), // Writing = notify
    };
  },
};
```

### Why This Library Also Supports Events

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

## Quick Start

### Basic Usage with Events

```typescript
import { Tracker } from "unisig";

// Define your events (use `type`, not `interface`)
type MyEvents = {
  "user:added": { id: string; name: string };
  "user:removed": string;
};

class UserStore {
  private $ = new Tracker<MyEvents>();
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
import { createSignal, getOwner, onCleanup } from "solid-js";

// Create adapter for your signal library
const solidAdapter = {
  create: () => {
    const [track, trigger] = createSignal(undefined, { equals: false });
    return { depend: () => track(), notify: () => trigger(undefined) };
  },
  isInScope: () => !!getOwner(),
  onDispose: (cb) => onCleanup(cb),
};

// Use with Tracker
const $ = new Tracker<UserEvents>(solidAdapter);

// In a reactive context:
createEffect(() => {
  const users = $.getAll(); // Automatically tracked
});
```

## API Reference

### `Tracker<Events>`

Main class combining signals and events.

```typescript
const $ = new Tracker<MyEvents>()

// Configuration
$.setAdapter(adapter)      // Set signal adapter
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

By default, errors in event listeners propagate immediately (fail-fast behavior). This is consistent with most event emitter libraries and provides the best performance.

For production environments, you can configure an error handler to catch errors and continue executing other listeners:

```typescript
import { Tracker } from "unisig";

// With error handler for production
const tracker = new Tracker<MyEvents>({
  adapter: myAdapter,
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

tracker.emit("user:added", { id: "1", name: "Alice" });
```

**Error Handler Benefits:**

- 🛡️ **Resilience** - All listeners execute even if one fails
- 📊 **Observability** - Centralized error logging and tracking
- 🔧 **Production-ready** - Easy integration with error services (Sentry, LogRocket, etc.)

**Performance Impact:**

- **No error handler:** Zero overhead (default, best for development)
- **With error handler:** ~2-3x slower on emit calls (acceptable for production)

**Error Handler Signature:**

```typescript
type ErrorHandler<Events> = (
  event: keyof Events,
  error: Error,
  listener: Listener<unknown>,
) => void;
```

**Examples:**

```typescript
// Console logging (simple)
const tracker = new Tracker<MyEvents>({
  errorHandler: (event, error) => {
    console.error(`[${String(event)}]`, error.message);
  },
});

// Error tracking service (production)
const tracker = new Tracker<MyEvents>({
  errorHandler: (event, error) => {
    Sentry.captureException(error, {
      extra: { event: String(event) },
    });
  },
});

// Custom error handling
const tracker = new Tracker<MyEvents>({
  errorHandler: (event, error, listener) => {
    if (event === "critical:error") {
      // Show user-facing error
      showErrorToast(error.message);
    } else {
      // Log non-critical errors
      console.warn(error);
    }
  },
});
```

**Backward Compatibility:**

```typescript
// Old way (still works) - backward compatible
const tracker = new Tracker<MyEvents>(adapter);

// New way - with error handler
const tracker = new Tracker<MyEvents>({ adapter, errorHandler });

// New way - error handler only (no adapter)
const tracker = new Tracker<MyEvents>({ errorHandler });
```

### `Emitter<Events>`

Standalone event emitter if you only need events.

```typescript
// Without error handler (fail-fast)
class MyClass extends Emitter<MyEvents> {
  doSomething() {
    this.emit('something', data)  // Errors propagate
  }
}

// With error handler (production)
class MyClass extends Emitter<MyEvents>({
  errorHandler: (event, error) => {
    console.error('Error in', event, ':', error);
  },
}) {
  doSomething() {
    this.emit('something', data)  // Errors are caught
  }
}

const instance = new MyClass()
instance.on('something', (data) => { ... })
```

### `Scope`

Standalone signal scope if you only need signals.

```typescript
const scope = new Scope(adapter);
scope.track("key");
scope.trigger("key");
```

## Standalone State with `withAdapter`

For standalone reactive state (like Svelte runes, Solid signals, or Vue refs), use the factory pattern:

```typescript
import { withAdapter, withAdapterRef } from "unisig";
import { solidReactivityAdapter } from "@signaldb/solid";

// Create configured state function
const state = withAdapter(solidReactivityAdapter);
const ref = withAdapterRef(solidReactivityAdapter);

// Primitives return Ref<T>
const count = state(0);
console.log(count.value); // 0
count.value++; // Triggers updates

// Objects return deeply proxied versions
const player = state({ name: "Alice", score: 0, stats: { health: 100 } });
console.log(player.name); // Tracks 'name'
player.score = 50; // Notifies 'score' watchers

// Derived values use framework primitives
const doubled = $derived.by(() => count.value * 2); // Svelte
```

### Benefits of Factory Pattern

- **No global state** - Each factory creates its own configured function
- **Better for testing** - Easy to create isolated test environments
- **Multiple adapters** - Can use different adapters in different parts of your app
- **Explicit API** - Makes the adapter dependency clear

## Adapters

unisig uses the same adapter pattern as [signaldb](https://github.com/maxnowack/signaldb). You can use any adapter from the signaldb ecosystem:

- `@signaldb/solid` for Solid.js
- `@signaldb/preact` for Preact
- `@signaldb/vue` for Vue
- `@signaldb/mobx` for MobX
- `@signaldb/svelte` for Svelte

Example with Solid.js:

```typescript
import { solidReactivityAdapter } from "@signaldb/solid";
import { Tracker } from "unisig";

const $ = new Tracker<UserEvents>(solidReactivityAdapter);
```

Or create your own adapter by implementing the `ReactivityAdapter` interface:

```typescript
import { createSignal, getOwner, onCleanup } from "solid-js";
import type { ReactivityAdapter } from "unisig";

const solidAdapter: ReactivityAdapter = {
  create: () => {
    const [track, trigger] = createSignal(undefined, { equals: false });
    return { depend: () => track(), notify: () => trigger(undefined) };
  },
  isInScope: () => !!getOwner(),
  onDispose: (cb) => onCleanup(cb),
};
```

## Using Multiple Signal Runtimes

unisig supports using multiple signal libraries simultaneously through the [`MultiAdapter`](packages/unisig/src/MultiAdapter.ts) class. This allows you to track changes across different frameworks or signal libraries with a single Tracker instance.

### Basic Usage

```typescript
import { Tracker, MultiAdapter, createMultiAdapter } from "unisig";
import { solidAdapter } from "@signaldb/solid";
import { preactAdapter } from "@signaldb/preact";
import { mobxAdapter } from "@signaldb/mobx";

// Using MultiAdapter constructor
const multiAdapter = new MultiAdapter([
  solidAdapter,
  preactAdapter,
  mobxAdapter,
]);

// Or using the helper function
const multiAdapter = createMultiAdapter(solidAdapter, preactAdapter, mobxAdapter);

// Create a Tracker that works with all three runtimes
const $ = new Tracker<UserEvents>({ adapter: multiAdapter });
```

### How It Works

The [`MultiAdapter`](packages/unisig/src/MultiAdapter.ts) creates a [`CompositeDependency`](packages/unisig/src/MultiAdapter.ts) for each tracked key, which wraps dependencies from all underlying adapters:

- **On read** (`track()`, `trackItem()`, etc.): Tracks with ALL adapters
- **On write** (`trigger()`, `triggerItem()`, etc.): Notifies ALL adapters
- **Scope detection**: Returns true if ANY adapter is in scope

### Use Cases

#### 1. Cross-Framework Components

When building component libraries that work across multiple frameworks:

```typescript
import { MultiAdapter } from "unisig";
import { solidAdapter } from "@signaldb/solid";
import { preactAdapter } from "@signaldb/preact";
import { vueAdapter } from "@signaldb/vue";

const sharedStore = new Tracker<SharedEvents>({
  adapter: new MultiAdapter([solidAdapter, preactAdapter, vueAdapter]),
});

// Now the same store works seamlessly with:
// - Solid.js components (via solidAdapter)
// - Preact components (via preactAdapter)
// - Vue components (via vueAdapter)
```

#### 2. Migration Scenarios

When migrating from one signal library to another:

```typescript
// Start with both, then remove the old one
const multiAdapter = new MultiAdapter([oldAdapter, newAdapter]);
const $ = new Tracker<MyEvents>({ adapter: multiAdapter });

// Gradually migrate components, then switch to:
// const $ = new Tracker<MyEvents>({ adapter: newAdapter });
```

#### 3. Hybrid Applications

When using multiple frameworks in the same application:

```typescript
// Main store works with both Solid and Preact
const multiAdapter = new MultiAdapter([solidAdapter, preactAdapter]);
const store = new Tracker<AppEvents>({ adapter: multiAdapter });

// Solid.js component
function SolidComponent() {
  const users = createMemo(() => store.getAll());
  return <UserList users={users()} />;
}

// Preact component
function PreactComponent() {
  const users = useSignal(() => store.getAll());
  return <UserList users={users()} />;
}
```

### API Reference

#### `MultiAdapter`

```typescript
import { MultiAdapter } from "unisig";

class MultiAdapter implements ReactivityAdapter {
  constructor(adapters: ReactivityAdapter[])
  
  create(): Dependency
  isInScope(): boolean
  onDispose(callback: () => void, dep: Dependency): void
  getAdapters(): readonly ReactivityAdapter[]
}
```

#### `createMultiAdapter` (Helper)

```typescript
import { createMultiAdapter } from "unisig";

function createMultiAdapter(
  ...adapters: ReactivityAdapter[]
): MultiAdapter
```

#### `CompositeDependency`

The internal dependency wrapper (usually you don't need to use this directly):

```typescript
class CompositeDependency implements Dependency {
  constructor(dependencies: Dependency[])
  
  depend(): void
  notify(): void
  getDependencies(): readonly Dependency[]
}
```

### Performance Considerations

Using a [`MultiAdapter`](packages/unisig/src/MultiAdapter.ts) adds minimal overhead:

- **Memory**: One [`CompositeDependency`](packages/unisig/src/MultiAdapter.ts) wrapper per tracked key
- **Runtime**: O(n) where n is the number of adapters (calls `depend()` or `notify()` on each)

For most applications with 2-3 adapters, this overhead is negligible. If you have many adapters (10+), consider whether you truly need all of them simultaneously.

## Granular Reactivity

### Collection Level

Track the entire collection:

```typescript
class UserStore {
  private $ = new Tracker<UserEvents>();

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
  private $ = new Tracker<UserEvents>();

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
  private $ = new Tracker<UserEvents>();

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
  private $ = new Tracker<UserEvents>();

  getUser(id) {
    this.$.trackItem("users", id);
    const user = this.users.get(id);
    return user ? this.$.itemProxy(user, "users", id) : undefined;
  }

  add(user) {
    this.users.set(user.id, user);
    this.$.triggerList("users");
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
  private $ = new Tracker<GameEvents>();
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

## TypeScript

Full TypeScript support with strong event typing:

```typescript
// Use `type` instead of `interface` for event maps
type Events = {
  "item:added": { id: string; value: number };
  "item:removed": string;
  cleared: void;
};

const $ = new Tracker<Events>();

// Type-safe events
$.on("item:added", (item) => {
  item.id; // string
  item.value; // number
});

$.emit("item:added", { id: "1", value: 42 }); // ✓
$.emit("item:added", { id: "1" }); // ✗ Error: missing value
```

## Performance: Read-Only vs Proxied Getters

When designing your store API, you have an important choice between returning read-only objects (fast) or proxied objects (granular reactivity). This choice has significant performance implications.

### Performance Comparison

| Approach                           | Performance      | Speedup         |
| ---------------------------------- | ---------------- | --------------- |
| Proxied getters (deep proxy)       | ~100K ops/sec    | 1x (baseline)   |
| **Read-only getters (raw object)** | **~16M ops/sec** | **160x faster** |

### Recommendation: Use Read-Only Getters by Default

Return raw objects with `Readonly<T>` type annotation for most use cases:

```typescript
class PlayerStore {
  private $ = new Tracker<PlayerEvents>();
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
    this.$.triggerItemProp("players", id, "score", "player:scored", {
      id,
      score,
    });
  }
}
```

**Why this works:**

- `trackItem()` registers the dependency, so components re-render when the item changes
- Direct property access is 160x faster than through a proxy
- `Readonly<T>` prevents accidental mutations at compile time
- Component re-renders entirely when data changes (usually fine for simple displays)

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

**Use cases for proxies:**

- Component has expensive rendering logic
- You need to avoid full re-renders
- Different properties update at different times
- Performance of property-level updates matters

### Property-Level Getters (Alternative)

For fine-grained tracking without proxy overhead:

```typescript
class PlayerStore {
  // Fast property-level tracking (no proxy overhead)
  getScore(id: string): number | undefined {
    this.$.trackItemProp("players", id, "score");
    return this.players.get(id)?.score;
  }

  getName(id: string): string | undefined {
    this.$.trackItemProp("players", id, "name");
    return this.players.get(id)?.name;
  }
}
```

**Performance:** Same as read-only getters (~16M ops/sec), but with granular tracking.

### Summary

| Use Case            | Recommended Approach                          | Performance      |
| ------------------- | --------------------------------------------- | ---------------- |
| Simple list display | `get()` / `getAll()` (read-only)              | ⚡ ~16M ops/sec  |
| Property display    | `getName()` / `getScore()` (property getters) | ⚡ ~16M ops/sec  |
| Complex component   | `getLive()` / `getAllLive()` (live/proxied)   | 🐢 ~100K ops/sec |

**Key insight:** Start with read-only getters. They're 160x faster and work great for most use cases. Only use live objects when you have a proven performance problem that property-level tracking can solve.

For detailed examples and usage patterns, see [PATTERNS.md - Read-Only vs Proxied Getters](./PATTERNS.md#read-only-vs-proxied-getters).

## Patterns and Best Practices

See [PATTERNS.md](./PATTERNS.md) for:

- Read-Only vs Proxied Getters
- Pre-indexing for O(1) lookups
- Lazy caching strategies
- Cross-store dependencies
- Event-based subscriptions
- Hybrid patterns

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT
