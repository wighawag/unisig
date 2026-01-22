# unisig

**Universal signals** — add reactivity to any data with pluggable signal adapters.

**Zero dependencies.** Works with any signal library (Solid.js, Preact Signals, Vue, MobX, Svelte, etc.) or just events.

## Features

- 🎯 **Framework-agnostic** - Works with any signal library
- ⚡ **Zero dependencies** - Lightweight and fast
- 🔌 **Pluggable adapters** - Works with signaldb adapters
- 📝 **Type-safe** - Full TypeScript support

## Packages

| Package | Description |
|---------|-------------|
| [`unisig`](./packages/unisig) | Core reactive primitives (`reactive`, `signal`, `effect`) |
| [`@unisig/tracker`](./packages/tracker) | Granular reactivity tracking with events (Tracker, Emitter, Scope) |
| [`@unisig/solid-js`](./packages/solid-js) | Solid.js adapter |
| [`@unisig/svelte`](./packages/svelte) | Svelte 5 adapter |

## Installation

```bash
# Core package
npm install unisig

# With an adapter
npm install unisig @unisig/solid-js
# or
npm install unisig @unisig/svelte

# For granular tracking (stores, collections)
npm install @unisig/tracker
```

## Quick Start

### Basic Usage with `unisig`

The core `unisig` package provides simple reactive primitives:

```typescript
import unisig from "unisig";
import solidAdapter from "@unisig/solid-js";

// Create configured reactive primitives
const { reactive, signal, effect } = unisig(solidAdapter);

// Primitives return { value: T }
const count = reactive(0);
console.log(count.value); // 0
count.value++; // Triggers updates

// Objects return deeply reactive versions
const player = reactive({ name: "Alice", score: 0, stats: { health: 100 } });
console.log(player.name); // Tracks 'name'
player.score = 50; // Notifies 'score' watchers

// Shallow signals with get/set interface
const countSignal = signal(0);
console.log(countSignal.get()); // 0
countSignal.set(1); // Triggers updates

// Effects re-run when dependencies change
effect(() => {
  console.log(`Score: ${player.score}`);
});
```

### Advanced Usage with `@unisig/tracker`

For stores, collections, and granular reactivity, use the Tracker package:

```typescript
import { createTrackerFactory } from "@unisig/tracker";
import solidAdapter from "@unisig/solid-js";

// Define your events
type PlayerEvents = {
  "player:added": { id: string; name: string };
  "player:removed": string;
};

const createTracker = createTrackerFactory(solidAdapter);

class PlayerStore {
  private $ = createTracker<PlayerEvents>();
  private players = new Map<string, { id: string; name: string; score: number }>();

  // Expose event subscription
  on: typeof this.$.on = (e, l) => this.$.on(e, l);

  // READ methods: call track()
  getAll() {
    this.$.track("players");
    return [...this.players.values()];
  }

  getPlayer(id: string) {
    this.$.trackItem("players", id);
    return this.players.get(id);
  }

  // WRITE methods: call trigger() with optional event
  add(player: { id: string; name: string; score: number }) {
    this.players.set(player.id, player);
    this.$.trigger("players", "player:added", player);
  }
}
```

See the [`@unisig/tracker` README](./packages/tracker/README.md) for full documentation on:
- Granular reactivity (collection, item, property level)
- Event system (built-in event emitter)
- Auto-tracking proxies (shallow and deep)
- Performance patterns

## Documentation

- [**Signals Refresher**](./docs/SIGNALS_REFRESHER.md) - Learn how signals work under the hood
- [**Patterns & Best Practices**](./docs/PATTERNS.md) - Common patterns for building stores

## Adapters

Official adapters:

- `@unisig/solid-js` for Solid.js
- `@unisig/svelte` for Svelte 5

### Creating Custom Adapters

For `unisig` core (reactive primitives):

```typescript
import type { BasicReactivityAdapter } from "unisig";

const myAdapter: BasicReactivityAdapter = {
  effect: (fn) => { /* return cleanup */ },
  reactive: (initial) => { /* return reactive value */ },
  signal: (initial) => { /* return { get, set } */ },
};
```

For `@unisig/tracker` (granular tracking):

```typescript
import type { ReactivityAdapter } from "@unisig/tracker";

const myAdapter: ReactivityAdapter = {
  create: () => ({
    depend: () => { /* track dependency */ },
    notify: () => { /* trigger update */ },
  }),
  isInScope: () => { /* return true if in reactive scope */ },
  onDispose: (cb) => { /* register cleanup callback */ },
};
```

## API Reference

### `unisig(adapter)`

Creates a bundle of reactive primitives from an adapter.

```typescript
import unisig from "unisig";

const { reactive, signal, effect, adapter } = unisig(myAdapter);
```

**Returns:**
- `reactive<T>(initial)` - Create deep reactive state
- `signal<T>(initial)` - Create shallow signal with get/set
- `effect(fn)` - Create reactive effect
- `adapter` - The raw adapter

### Return Types

```typescript
// Objects return T directly (deep reactive)
const user = reactive({ name: "Alice" });
user.name = "Bob"; // Direct property access

// Primitives return { value: T } (boxed)
const count = reactive(0);
count.value = 1; // Use .value for primitives

// Signals always use get/set
const sig = signal(0);
sig.get(); // Read
sig.set(1); // Write
```

## Inspiration

This project was inspired by the reactivity adapter pattern from [signaldb](https://github.com/maxnowack/signaldb). The adapter interface used by unisig is an extended version of signaldb adapters.

## License

MIT