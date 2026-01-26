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
| [`@unisig/solid`](./packages/solid) | Solid.js adapter |
| [`@unisig/svelte`](./packages/svelte) | Svelte 5 adapter |
| [`@unisig/tracker`](./packages/tracker) | **Experimental** - Targeted reactivity tracking (subject to change) |

## Installation

```bash
# Core package
npm install unisig

# With an adapter
npm install unisig @unisig/solid
# or
npm install unisig @unisig/svelte
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

## Documentation

- [**Signals Refresher**](./docs/SIGNALS_REFRESHER.md) - Learn how signals work under the hood
- [**@unisig/tracker**](./packages/tracker/README.md) - Experimental targeted reactivity tracking (subject to change)

## Adapters

The adapter mechanism is the core of unisig's framework-agnostic approach. Adapters bridge unisig's universal API with your framework's signal library.

### Official Adapters

- `@unisig/solid` for Solid.js
- `@unisig/svelte` for Svelte 5

### How Adapters Work

Adapters implement one or both of these interfaces:

1. **BasicReactivityAdapter** - For core reactive primitives (`reactive`, `signal`, `effect`)
2. **ScopeAdapter** - For targeted tracking (used by `@unisig/tracker`)

### Creating a Basic Adapter

```typescript
import type { BasicReactivityAdapter } from "unisig";

const myAdapter: BasicReactivityAdapter = {
  effect: (fn) => {
    // Create an effect that tracks dependencies
    // Return a cleanup function
    return () => { /* cleanup */ };
  },
  reactive: <T,>(initial: T): T => {
    // Return a deeply reactive version of the value
    // Objects should be reactive, primitives boxed as { value: T }
    return initial;
  },
  signal: <T,>(initial: T) => {
    // Return a signal with get/set interface
    return {
      get: () => initial,
      set: (value: T) => { initial = value; },
    };
  },
};
```


## API Reference

### `unisig(adapter)`

Creates a bundle of reactive primitives from an adapter.

```typescript
import unisig from "unisig";

const { reactive, signal, effect } = unisig(myAdapter);
```

**Returns:**
- `reactive<T>(initial)` - Create deep reactive state
- `signal<T>(initial)` - Create shallow signal with get/set
- `effect(fn)` - Create reactive effect

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
