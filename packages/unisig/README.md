# unisig

**Universal signals** — a universal facade over any signal library's reactive primitives.

Part of the [unisig monorepo](https://github.com/wighawag/unisig).

## Features

- 🎯 **Framework-agnostic** - Works with any signal library via adapters
- ⚡ **Zero dependencies** - Lightweight and fast
- 📝 **Type-safe** - Full TypeScript support
- 🔄 **Consistent API** - Same interface across all signal libraries

## Installation

```bash
npm install unisig
# With an adapter
npm install unisig @unisig/solid
# or
npm install unisig @unisig/svelte
```

## Quick Start

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

## API Reference

### `unisig(adapter)`

Creates a bundle of reactive primitives from an adapter.

```typescript
import unisig from "unisig";

const { reactive, signal, effect } = unisig(myAdapter);
```

**Parameters:**
- `adapter` - A `BasicReactivityAdapter` implementation

**Returns:** `ReactivityBundle`
- `reactive<T>(initial)` - Create deep reactive state
- `signal<T>(initial)` - Create shallow signal with get/set
- `effect(fn)` - Create reactive effect

### `reactive<T>(initial)`

Create a deep reactive state.

```typescript
// Objects - direct property access
const user = reactive({ name: "Alice", age: 30 });
user.name = "Bob"; // Triggers reactivity

// Primitives - use .value
const count = reactive(5);
count.value = 10; // Triggers reactivity
console.log(count.value); // 10
```

**Return type:**
- For objects: Returns `T` directly (deep reactive proxy)
- For primitives: Returns `{ value: T }` (boxed value)

### `signal<T>(initial)`

Create a shallow reactive signal with get/set interface.

```typescript
const count = signal(0);
console.log(count.get()); // 0
count.set(1); // Triggers updates
```

**Returns:** `Signal<T>`
- `get()` - Get the current value (tracks dependency)
- `set(value)` - Set a new value (triggers updates)

### `effect(fn)`

Create a reactive effect that re-runs when tracked dependencies change.

```typescript
const user = reactive({ name: "Alice" });

const cleanup = effect(() => {
  console.log("Name:", user.name);
  return () => console.log("Cleanup"); // Optional cleanup
});

user.name = "Bob"; // Effect re-runs, logs "Cleanup" then "Name: Bob"
cleanup(); // Stops the effect
```

**Parameters:**
- `fn` - Effect function, may return a cleanup function

**Returns:** A cleanup function that stops the effect

## Types

### `BasicReactivityAdapter`

The adapter interface for `unisig`:

```typescript
interface BasicReactivityAdapter {
  effect(fn: () => void | (() => void)): () => void;
  reactive<T>(initial: T): ReactiveResult<T>;
  signal<T>(initial: T): Signal<T>;
}
```

### `Signal<T>`

```typescript
interface Signal<T> {
  get(): T;
  set(value: T): void;
}
```

### `Boxed<T>`

Wrapper for primitive values:

```typescript
interface Boxed<T> {
  value: T;
}
```

### `ReactiveResult<T>`

Conditional return type for `reactive()`:

```typescript
type ReactiveResult<T> = T extends object ? T : Boxed<T>;
```

## Adapters

Official adapters:

- [`@unisig/solid`](https://github.com/wighawag/unisig/tree/main/packages/solid) - Solid.js adapter
- [`@unisig/svelte`](https://github.com/wighawag/unisig/tree/main/packages/svelte) - Svelte 5 adapter

### Creating Custom Adapters

```typescript
import type { BasicReactivityAdapter } from "unisig";

const myAdapter: BasicReactivityAdapter = {
  effect: (fn) => {
    // Set up reactive effect
    // Return cleanup function
  },
  reactive: (initial) => {
    // Return deep reactive value
    // Objects: return T, Primitives: return { value: T }
  },
  signal: (initial) => {
    // Return { get, set }
  },
};
```

## Related Packages

For stores, collections, and targeted reactivity (collection/item/property level tracking), see **experimental** package: [`@unisig/tracker`](https://github.com/wighawag/unisig/tree/main/packages/tracker) (subject to changes).

## License

MIT