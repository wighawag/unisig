# @unisig/svelte

Svelte 5 adapter for [unisig](https://github.com/wighawag/unisig) - Universal Signals for reactive state management.

## Installation

```bash
npm install unisig @unisig/svelte
# or
pnpm add unisig @unisig/svelte
# or
yarn add unisig @unisig/svelte
```

## Usage

### Basic Setup

Create a setup file that re-exports the utilities:

```ts
// src/lib/unisig.svelte.ts
export { svelteAdapter, createTracker, effect, reactive, signal } from '@unisig/svelte';
```

### Using in Svelte Components

```svelte
<script lang="ts">
  import { createTracker } from '$lib/unisig.svelte';

  const tracker = createTracker();
  let count = $state(0);

  // The tracker integrates with Svelte's reactivity
  $effect(() => {
    tracker.track('count');
    console.log('Count is:', count);
  });

  function increment() {
    count++;
    tracker.trigger('count');
  }
</script>

<button onclick={increment}>Count: {count}</button>
```

### Using Effects in Plain TypeScript Files

The main advantage of this adapter is that you can use effects in plain `.ts` files:

```ts
// src/lib/store.ts
import { effect, createTracker } from '$lib/unisig.svelte';

export class DataStore {
  private tracker = createTracker();
  private data: string[] = [];
  private cleanup?: () => void;

  constructor() {
    // This effect works in a plain .ts file!
    this.cleanup = effect(() => {
      this.tracker.track('data');
      console.log('Data changed:', this.data);
    });
  }

  addItem(item: string) {
    this.data.push(item);
    this.tracker.trigger('data');
  }

  destroy() {
    this.cleanup?.();
  }
}
```

### Using Reactive and Signal

```ts
// src/lib/reactive.svelte.ts
import { reactive, signal } from '@unisig/svelte';

// Deep reactive state
const user = reactive({ name: 'John', settings: { theme: 'dark' } });
user.name = 'Jane';  // Reactive!
user.settings.theme = 'light';  // Also reactive!

// Shallow signal with get/set interface
const counter = signal(0);
counter.set(1);  // Reactive!
```

## API

### `svelteAdapter`

The raw Svelte adapter implementing the `ReactivityAdapter` interface.

### `svelteBundle`

Pre-configured bundle containing all utilities:
- `createTracker`: Create a new Tracker instance
- `effect`: Create framework-agnostic effects
- `reactive`: Create deep reactive state objects
- `signal`: Create shallow reactive signals with get/set interface
- `adapter`: The underlying adapter

### `createTracker()`

Create a new Tracker instance configured with the Svelte adapter.

### `effect(fn)`

Create a reactive effect that re-runs when dependencies change.

```ts
const cleanup = effect(() => {
  // Track dependencies here
  tracker.track('key');
  
  // Optional cleanup function
  return () => {
    console.log('Cleanup before next run or on dispose');
  };
});

// Stop the effect
cleanup();
```

### `reactive(initialValue)`

Create a deeply reactive state object.

### `signal(initialValue)`

Create a shallow reactive signal with get/set interface.

## Requirements

- Svelte 5.7.0+
- unisig

## Acknowledgments

This adapter is derived from [@signaldb/svelte](https://github.com/maxnowack/signaldb) by [Max Nowack](https://github.com/maxnowack). The core dependency tracking implementation using `createSubscriber` from `svelte/reactivity` originates from his excellent work on signaldb.

## License

MIT - See [LICENSE](./LICENSE) for details.