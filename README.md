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

### `Emitter<Events>`

Standalone event emitter if you only need events.

```typescript
class MyClass extends Emitter<MyEvents> {
  doSomething() {
    this.emit('something', data)  // protected method
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
import { withAdapter, withAdapterRef } from 'unisig';
import { solidReactivityAdapter } from '@signaldb/reactivity/solid';

// Create configured state function
const state = withAdapter(solidReactivityAdapter);
const ref = withAdapterRef(solidReactivityAdapter);

// Primitives return Ref<T>
const count = state(0);
console.log(count.value);  // 0
count.value++;             // Triggers updates

// Objects return deeply proxied versions
const player = state({ name: 'Alice', score: 0, stats: { health: 100 } });
console.log(player.name);        // Tracks 'name'
player.score = 50;              // Notifies 'score' watchers

// Derived values use framework primitives
const doubled = $derived.by(() => count.value * 2);  // Svelte
```

### Benefits of Factory Pattern

- **No global state** - Each factory creates its own configured function
- **Better for testing** - Easy to create isolated test environments
- **Multiple adapters** - Can use different adapters in different parts of your app
- **Explicit API** - Makes the adapter dependency clear

## Adapters

unisig uses the same adapter pattern as [signaldb](https://github.com/MaxGraey/signaldb). You can use any adapter from the signaldb ecosystem:

- `@signaldb/reactivity/solid` for Solid.js
- `@signaldb/reactivity/preact` for Preact
- `@signaldb/reactivity/vue` for Vue
- `@signaldb/reactivity/mobx` for MobX
- `@signaldb/reactivity/svelte` for Svelte

Example with Solid.js:

```typescript
import { solidReactivityAdapter } from '@signaldb/reactivity/solid';
import { Tracker } from 'unisig';

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

## Patterns and Best Practices

See [PATTERNS.md](./PATTERNS.md) for:

- Pre-indexing for O(1) lookups
- Lazy caching strategies
- Cross-store dependencies
- Event-based subscriptions
- Hybrid patterns

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT
