# unisig

**Universal signals** — add reactivity to any data with pluggable signal adapters and built-in events.

**Zero dependencies.** Works with any signal library (Solid.js, Preact Signals, Vue, MobX, Svelte, etc.) or just events.

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

### How Does count Know Which Effect Is Running?

This is the clever trick: **there's a global "current effect" variable**.

```typescript
// Simplified internals of any signal library:

let currentEffect: Function | null = null; // ← Global tracker!

function effect(fn) {
  currentEffect = fn; // Step 1: Set "I'm the current effect"
  fn(); // Step 2: Run the function (which reads signals)
  currentEffect = null; // Step 3: Clear it
}

function createSignal(initial) {
  let value = initial;
  const subscribers = new Set(); // Effects that depend on this signal

  return {
    get value() {
      // When READ: record whoever is currently running
      if (currentEffect) {
        subscribers.add(currentEffect); // ← This is depend()!
      }
      return value;
    },
    set value(newVal) {
      value = newVal;
      // When WRITTEN: re-run all recorded effects
      subscribers.forEach((fn) => fn()); // ← This is notify()!
    },
  };
}
```

**The flow:**

```
1. effect(() => { ... })     →  Sets currentEffect = thisEffect
2.   count.value             →  count sees currentEffect, adds it to subscribers
3. effect ends               →  Sets currentEffect = null
4. count.value = 5           →  count loops through subscribers, calls each one
```

This is why signals only work inside effects/computeds — outside of them, `currentEffect` is `null`, so nothing gets tracked.

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

// Preact adapter
const preactAdapter = {
  create: () => {
    const sig = signal(0);
    return {
      depend: () => sig.value, // Reading = depend
      notify: () => sig.value++, // Writing = notify
    };
  },
};
```

**The adapter is just a translator** between this library's generic `depend()`/`notify()` and your signal library's specific API.

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

## Installation

```bash
npm install unisig
```

## Quick Start

```typescript
import { Reactive } from "unisig";

// Define your events (use `type`, not `interface`)
type MyEvents = {
  "user:added": { id: string; name: string };
  "user:removed": string;
};

class UserStore {
  // Add reactivity with one line
  private $ = new Reactive<MyEvents>();
  private users = new Map<string, { id: string; name: string }>();

  // Expose event subscription
  on: typeof this.$.on = (e, l) => this.$.on(e, l);

  // Optional: enable signal-based reactivity
  setReactivityAdapter(adapter: ReactivityAdapter) {
    this.$.setAdapter(adapter);
  }

  // READ methods: call track()
  getAll() {
    this.$.track("users");
    return [...this.users.values()];
  }

  get(id: string) {
    this.$.trackItem("users", id);
    return this.users.get(id);
  }

  // WRITE methods: call trigger() with optional event
  add(user: { id: string; name: string }) {
    this.users.set(user.id, user);
    this.$.triggerAdd("users", "user:added", user);
  }

  remove(id: string) {
    this.users.delete(id);
    this.$.triggerRemove("users", id, "user:removed", id);
  }
}
```

### Example with Arrays

The library works with any data structure. Here's an example using arrays:

```typescript
type TodoEvents = {
  "todo:added": { id: string; text: string };
  "todo:toggled": { id: string; done: boolean };
  "todo:removed": string;
};

class TodoStore {
  private $ = new Reactive<TodoEvents>();
  private todos: Array<{ id: string; text: string; done: boolean }> = [];

  on: typeof this.$.on = (e, l) => this.$.on(e, l);
  setReactivityAdapter(a: ReactivityAdapter) {
    this.$.setAdapter(a);
  }

  // Get all todos
  getAll() {
    this.$.track("todos");
    return this.todos;
  }

  // Get single todo by ID (granular tracking)
  getById(id: string) {
    this.$.trackItem("todos", id);
    return this.todos.find((t) => t.id === id);
  }

  // Get by index - tracks BOTH list (for reordering) and item (for changes)
  // Note: This re-runs on ANY list change, not just this index
  getByIndex(index: number) {
    this.$.track("todos"); // Track list - index meaning changes with list
    const todo = this.todos[index];
    if (todo) {
      this.$.trackItem("todos", todo.id); // Also track the specific item
    }
    return todo;
  }

  // Get filtered todos
  getActive() {
    this.$.track("todos"); // Any todo change affects this
    return this.todos.filter((t) => !t.done);
  }

  add(text: string) {
    const todo = { id: crypto.randomUUID(), text, done: false };
    this.todos.push(todo);
    this.$.triggerAdd("todos", "todo:added", { id: todo.id, text });
  }

  toggle(id: string) {
    const todo = this.todos.find((t) => t.id === id);
    if (!todo) return;
    todo.done = !todo.done;
    // Notify both the specific item AND the list (for filtered views)
    this.$.triggerItem("todos", id, "todo:toggled", { id, done: todo.done });
    this.$.triggerList("todos"); // getActive() needs to re-run too
  }

  remove(id: string) {
    const index = this.todos.findIndex((t) => t.id === id);
    if (index === -1) return;
    this.todos.splice(index, 1);
    this.$.triggerRemove("todos", id, "todo:removed", id);
  }
}

// Usage:
const todos = new TodoStore();

// Events work anywhere
todos.on("todo:added", ({ text }) => console.log("New todo:", text));

// With a signal library (e.g., in Solid.js):
createEffect(() => {
  console.log("Active todos:", todos.getActive()); // Re-runs on any change
});

createEffect(() => {
  // getById - ONLY re-runs when todo with id='abc' changes
  // Even works if item doesn't exist yet (will re-run when added)
  console.log("Specific todo:", todos.getById("abc"));
});

createEffect(() => {
  // getByIndex - Re-runs on ANY list change (less granular)
  // Because "item at index 0" changes meaning when list changes
  console.log("First todo:", todos.getByIndex(0));
});
```

### Use with Events (always works)

```typescript
const store = new UserStore();

store.on("user:added", (user) => {
  console.log("Added:", user.name);
});

store.on("user:removed", (id) => {
  console.log("Removed:", id);
});

store.add({ id: "1", name: "Alice" }); // Logs: "Added: Alice"
store.remove("1"); // Logs: "Removed: 1"
```

### Use with Signals (Solid.js example)

```typescript
import { createSignal, getOwner, onCleanup, createEffect } from "solid-js";

// Create adapter for your signal library
const solidAdapter = {
  create: () => {
    const [track, trigger] = createSignal(undefined, { equals: false });
    return { depend: () => track(), notify: () => trigger(undefined) };
  },
  isInScope: () => !!getOwner(),
  onDispose: (cb) => onCleanup(cb),
};

const store = new UserStore();
store.setReactivityAdapter(solidAdapter);

// Now reads are automatically tracked!
createEffect(() => {
  console.log("Users:", store.getAll()); // Re-runs when users change
});

store.add({ id: "1", name: "Alice" }); // Effect re-runs
```

## API

### `Reactive<Events>`

Main class combining signals and events.

```typescript
const $ = new Reactive<MyEvents>()

// Configuration
$.setAdapter(adapter)      // Set signal adapter
$.getAdapter()             // Get current adapter
$.isInScope()              // Check if in reactive scope

// Events (always work)
$.on(event, listener)      // Subscribe to event
$.off(event, listener)     // Unsubscribe
$.once(event, listener)    // Subscribe once
$.emit(event, data)        // Emit event only (no signal)

// Tracking (for reads)
$.track(key)               // Track dependency by key
$.trackItem(collection, id) // Track specific item + collection

// Triggering (for writes)
$.trigger(key, event?, data?)           // Notify + emit
$.triggerItem(collection, id, event?, data?)  // Notify item
$.triggerList(collection, event?, data?)      // Notify list
$.triggerAdd(collection, event?, data?)       // Alias for triggerList
$.triggerRemove(collection, id, event?, data?) // Notify item + list + cleanup

// Direct access
$.dep(key)                 // Get/create dependency
$.itemDep(collection, id)  // Get/create item dependency
$.clear()                  // Clear all dependencies
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

### Creating Adapters

```typescript
import { createReactivityAdapter } from "unisig";

// Preact Signals
import { signal } from "@preact/signals-core";

const preactAdapter = createReactivityAdapter({
  create: () => {
    const s = signal(0);
    return {
      depend: () => {
        s.value;
      },
      notify: () => {
        s.value++;
      },
    };
  },
});

// Vue
import { shallowRef, triggerRef } from "vue";

const vueAdapter = createReactivityAdapter({
  create: () => {
    const r = shallowRef(0);
    return {
      depend: () => {
        r.value;
      },
      notify: () => triggerRef(r),
    };
  },
});

// MobX
import { observable, runInAction } from "mobx";

const mobxAdapter = createReactivityAdapter({
  create: () => {
    const o = observable({ v: 0 });
    return {
      depend: () => {
        o.v;
      },
      notify: () =>
        runInAction(() => {
          o.v++;
        }),
    };
  },
});

// Svelte 5 (with runes)
import { createSubscriber } from "svelte/reactivity";

class SvelteDependency {
  #subscribe: () => void;
  #update: (() => void) | undefined;

  constructor() {
    this.#subscribe = createSubscriber((update) => {
      this.#update = update;
      return () => {};
    });
  }

  depend() {
    this.#subscribe();
  }

  notify() {
    this.#update?.();
  }
}

const svelteAdapter = createReactivityAdapter({
  create: () => new SvelteDependency(),
  isInScope: () => $effect.tracking(),
});
```

## Granular Reactivity

Use `trackItem()` and `triggerItem()` for per-item updates:

```typescript
class PlayerStore {
  private $ = new Reactive<PlayerEvents>();

  // Only re-renders when THIS player changes
  getPlayer(id: string) {
    this.$.trackItem("players", id);
    return this.players.get(id);
  }

  // Only notifies watchers of THIS player
  updateScore(id: string, score: number) {
    this.players.get(id)!.score = score;
    this.$.triggerItem("players", id, "player:scored", { id, score });
  }
}

// In Solid.js:
createEffect(() => {
  console.log("Player 1:", store.getPlayer("1")); // Only player 1
});

createEffect(() => {
  console.log("Player 2:", store.getPlayer("2")); // Only player 2
});

store.updateScore("1", 100); // Only first effect runs!
```

## TypeScript

Full TypeScript support with strong event typing:

```typescript
// Use `type` instead of `interface` for event maps
type Events = {
  "item:added": { id: string; value: number };
  "item:removed": string;
  cleared: void;
};

const $ = new Reactive<Events>();

// Type-safe events
$.on("item:added", (item) => {
  item.id; // string
  item.value; // number
});

$.emit("item:added", { id: "1", value: 42 }); // ✓
$.emit("item:added", { id: "1" }); // ✗ Error: missing value
```

## License

MIT
