# unisig

**Universal signals** — a universal facade over any signal library's reactive primitives.

## Features

- 🎯 **Framework-agnostic** - Works with any signal library
- ⚡ **Zero dependencies** - Lightweight and minimal overhead
- 🔌 **Pluggable adapters** - svelte and solid-js currently implemented 
- 📝 **Type-safe** - Full TypeScript support

## Packages

| Package | Description |
|---------|-------------|
| [`unisig`](./packages/unisig) | Core reactive primitives (`reactive`, `signal`, `effect`) |
| [`@unisig/tracker`](./packages/tracker) | Targeted reactivity tracking (Tracker, Scope) |
| [`@unisig/solid`](./packages/solid) | Solid.js adapter |
| [`@unisig/svelte`](./packages/svelte) | Svelte 5 adapter |

## Installation

```bash
# Core package
npm install unisig

# With an adapter
npm install unisig @unisig/solid
# or
npm install unisig @unisig/svelte

# For targeted tracking (stores, collections)
npm install @unisig/tracker
```

## Quick Start

### Basic Usage with `unisig`

The core `unisig` package provides simple reactive primitives:

```typescript
import unisig from "unisig";
import solidAdapter from "@unisig/solid";

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

For stores, collections, and targeted reactivity, use the Tracker package:

```typescript
import { createTrackerFactory } from "@unisig/tracker";
import solidAdapter from "@unisig/solid";
import unisig from "unisig";

const {effect} = unisig(solidAdapter);

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
    this.$.triggerCollection("players");
  }

  updateScore(id: string, score: number) {
    this.players.get(id)!.score = score;
    this.$.triggerItemProp("players", id, "score");
  }
}

const store = new PlayerStore();

effect(() => {
  const players = store.getAll();
  console.log("Players:", players.length);
});
```

See the [`@unisig/tracker` README](./packages/tracker/README.md) for full documentation on:
- Targeted reactivity (collection, item, property level)
- Auto-tracking proxies (shallow, deep, and read-only)
- Performance patterns

## Documentation

- [**Signals Refresher**](./docs/SIGNALS_REFRESHER.md) - Learn how signals work under the hood

## Adapters

Official adapters:

- `@unisig/solid` for Solid.js
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

For `@unisig/tracker` (targeted tracking):

```typescript
import type { ScopeAdapter } from "@unisig/tracker";

const myAdapter: ScopeAdapter = {
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
