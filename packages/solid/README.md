# @unisig/solid

Solid.js adapter for [unisig](https://github.com/wighawag/unisig) - Universal Signals for reactive state management.

## Installation

```bash
npm install unisig @unisig/solid
# or
pnpm add unisig @unisig/solid
# or
yarn add unisig @unisig/solid
```

## Usage

### With `unisig` (Reactive Primitives)

```typescript
import unisig from "unisig";
import solidAdapter from "@unisig/solid";

const { reactive, signal, effect } = unisig(solidAdapter);

// Create reactive state
const count = reactive(0);
count.value++; // Triggers reactivity

const user = reactive({ name: "Alice", score: 0 });
user.score = 100; // Triggers reactivity

// Create effects
effect(() => {
  console.log(`Score: ${user.score}`);
});
```

### With `@unisig/tracker` (Targeted Tracking)

```typescript
import { createTrackerFactory } from "@unisig/tracker";
import solidAdapter from "@unisig/solid";
import { createEffect } from "solid-js";

const createTracker = createTrackerFactory(solidAdapter);

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

const store = new PlayerStore();

// Reactive tracking in Solid.js
createEffect(() => {
  const score = store.getScore("player1");
  console.log(`Player 1 score: ${score}`);
});
```

## API

### Default Export

```typescript
import solidAdapter from "@unisig/solid";
```

The adapter implements both `BasicReactivityAdapter` (for `unisig`) and `ReactivityAdapter` (for `@unisig/tracker`).

## Acknowledgments

This adapter is derived from [@signaldb/solid](https://github.com/maxnowack/signaldb) by [Max Nowack](https://github.com/maxnowack). The core dependency tracking implementation originates from his excellent work on signaldb.

## License

MIT - See [LICENSE](./LICENSE) for details.