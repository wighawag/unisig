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

### With `unisig` (Reactive Primitives)

```typescript
// setup.svelte.ts
import unisig from "unisig";
import svelteAdapter from "@unisig/svelte";

export const { reactive, signal, effect } = unisig(svelteAdapter);
```

```svelte
<script>
  import { reactive, effect } from "./setup.svelte.ts";

  const count = reactive(0);
  const user = reactive({ name: "Alice", score: 0 });

  effect(() => {
    console.log(`Score: ${user.score}`);
  });
</script>

<button onclick={() => count.value++}>
  Count: {count.value}
</button>

<button onclick={() => user.score += 10}>
  Score: {user.score}
</button>
```

### With `@unisig/tracker` (Targeted Tracking)

```typescript
// stores/playerStore.svelte.ts
import { createTrackerFactory } from "@unisig/tracker";
import svelteAdapter from "@unisig/svelte";

const createTracker = createTrackerFactory(svelteAdapter);

type PlayerEvents = {
  "player:scored": { id: string; score: number };
};

class PlayerStore {
  private $ = createTracker<PlayerEvents>();
  private players = new Map<string, { id: string; score: number }>();

  getScore(id: string) {
    this.$.trackItemProp("players", id, "score");
    return this.players.get(id)?.score;
  }

  updateScore(id: string, score: number) {
    const player = this.players.get(id);
    if (player) {
      player.score = score;
      this.$.triggerItemProp("players", id, "score", "player:scored", { id, score });
    }
  }
}

export const playerStore = new PlayerStore();
```

```svelte
<script>
  import { playerStore } from "./stores/playerStore.svelte.ts";

  // Reactive tracking in Svelte 5 - automatically re-renders
  const score = $derived(playerStore.getScore("player1"));
</script>

<p>Player 1 score: {score}</p>
<button onclick={() => playerStore.updateScore("player1", score + 10)}>
  Add 10 points
</button>
```

## API

### Default Export

```typescript
import svelteAdapter from "@unisig/svelte";
```

The adapter implements both `BasicReactivityAdapter` (for `unisig`) and `ReactivityAdapter` (for `@unisig/tracker`).

## Requirements

- Svelte 5+ (uses `svelte/reactivity` and runes)

## Acknowledgments

This adapter is derived from [@signaldb/svelte](https://github.com/maxnowack/signaldb) by [Max Nowack](https://github.com/maxnowack). The core dependency tracking implementation using `createSubscriber` from `svelte/reactivity` originates from his excellent work on signaldb.

## License

MIT - See [LICENSE](./LICENSE) for details.