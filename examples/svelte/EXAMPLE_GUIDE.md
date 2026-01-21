# Svelte Example Implementation Guide

This guide explains how the unisig library is integrated with Svelte 5 in this example application.

## Overview

The example demonstrates:
- Fine-grained reactivity at collection, item, and property levels
- Event-based subscriptions
- Deep proxy usage for nested objects
- Integration with Svelte 5 runes (`$state`, `$derived`, `$effect`)

## Architecture

### PlayerStore (`playerStore.ts`)

The store is implemented as a class with these key features:

```typescript
class PlayerStore {
  private $ = new Tracker<PlayerEvents>();
  private players = new Map<string, Player>();
}
```

**Key Design Decisions:**

1. **Private Tracker Instance**: The `Tracker` instance is private to prevent external manipulation
2. **Public Event Subscription**: The `on` method is exposed to allow external event listeners
3. **Adapter Configuration**: The adapter is passed during construction
4. **Granular Getters**: Multiple getter methods for different levels of reactivity:
   - `getAll()` - Collection level (tracks entire list)
   - `get(id)` - Item level (tracks specific item with deep proxy)
   - `getScore(id)` - Property level (tracks only score)
   - `getRaw(id)` - No tracking (for snapshots)

### Svelte Adapter (`svelteAdapter.svelte.ts`)

```typescript
import svelteReactivityAdapter from '@signaldb/svelte';
export const svelteAdapter: ReactivityAdapter = svelteReactivityAdapter;
```

The adapter wraps `@signaldb/svelte` to provide fine-grained reactivity. This adapter:
- Tracks dependencies automatically when accessed in reactive contexts
- Triggers re-renders when dependencies change
- Works with Svelte 5's `$state`, `$derived`, and `$effect` runes

## Usage Patterns

### 1. Creating a Reactive Store

```typescript
// Import Tracker and define your events
import { Tracker, type ReactivityAdapter } from 'unisig';

type PlayerEvents = {
  'player:added': Player;
  'player:removed': string;
  'player:scored': { id: string; score: number };
};

class PlayerStore {
  private $ = new Tracker<PlayerEvents>(adapter);
  private players = new Map<string, Player>();

  // Expose event subscription
  on<K extends keyof PlayerEvents>(
    event: K,
    listener: Listener<PlayerEvents[K]>
  ): Unsubscribe {
    return this.$.on(event, listener);
  }
}
```

### 2. Collection-Level Reactivity

```typescript
// In the store:
getIds(): string[] {
  this.$.track('players');  // Track the collection
  return [...this.players.keys()];
}

// In a Svelte component:
const playerIds = $derived.by(() => playerStore.getIds());

// This effect only re-runs when players are added/removed
$effect(() => {
  console.log('Player count:', playerIds.length);
});
```

**When to use:**
- When you need to iterate over all items
- When you need the count of items
- When any item change affects the computation

### 3. Item-Level Reactivity

```typescript
// In the store:
get(id: string): Player | undefined {
  this.$.trackItem('players', id);  // Track specific item
  const player = this.players.get(id);
  // Return deep proxy for nested property tracking
  return player ? this.$.deepItemProxy(player, 'players', id) : undefined;
}

// In a Svelte component:
<script>
  let { playerId } = $props();
  const player = $derived.by(() => playerStore.get(playerId));
</script>

<p>{player?.name}</p>  {/* Only re-renders when this specific player changes */}
```

**When to use:**
- When displaying a single item
- When you want to track item-specific changes
- When other items changing shouldn't affect this component

### 4. Property-Level Reactivity

```typescript
// In the store:
getScore(id: string): number | undefined {
  this.$.trackItemProp('players', id, 'score');  // Track only score
  return this.players.get(id)?.score;
}

// In a Svelte component:
<script>
  let { playerId } = $props();
  const score = $derived.by(() => playerStore.getScore(playerId));
</script>

<p>Score: {score}</p>  {/* Only re-renders when score changes! */}
```

**When to use:**
- When displaying individual properties
- For high-frequency updates (like scores, counters)
- When other property changes shouldn't affect this component

### 5. Deep Proxies for Nested Objects

```typescript
// In the store:
get(id: string): Player | undefined {
  this.$.trackItem('players', id);
  const player = this.players.get(id);
  // Deep proxy automatically tracks nested properties
  return player ? this.$.deepItemProxy(player, 'players', id) : undefined;
}

// In a Svelte component:
<script>
  const player = $derived.by(() => playerStore.get('p1'));
</script>

<p>Name: {player?.name}</p>        {/* Tracks 'name' property */}
<p>Score: {player?.score}</p>      {/* Tracks 'score' property */}
<p>Level: {player?.stats.level}</p> {/* Tracks 'stats.level' property */}
```

**Benefits:**
- Automatic tracking of all property accesses
- No need to manually call `trackProp()` for each property
- Fine-grained reactivity at any nesting level

### 6. Event-Based Subscriptions

```typescript
// In the store (called once):
onMount(() => {
  playerStore.on('player:added', (player) => {
    console.log('Player added:', player.name);
  });

  playerStore.on('player:scored', ({ id, score }) => {
    console.log('Score updated:', id, '->', score);
  });
});
```

**When to use:**
- For logging and analytics
- For side effects (API calls, WebSocket messages)
- When you need to react to changes outside of reactive contexts
- When you want to listen to all mutations of a certain type

### 7. Mutations with Events

```typescript
// In the store:
add(player: Player): void {
  this.players.set(player.id, player);
  // Trigger signal + emit event
  this.$.triggerAdd('players', 'player:added', player);
}

updateScore(id: string, score: number): void {
  const player = this.players.get(id);
  if (!player) return;
  player.score = score;
  // Trigger only score signal + emit event
  this.$.triggerItemProp('players', id, 'score', 'player:scored', { id, score });
}
```

**Pattern:**
1. Update the data
2. Call appropriate trigger method
3. Emit event if needed

## Performance Considerations

### Choose the Right Tracking Level

| Method | Granularity | Re-renders When | Use For |
|--------|-------------|-----------------|---------|
| `track()` | Collection | Any item changes | Lists, counts, computed over all items |
| `trackItem()` | Item | This item changes | Single item display |
| `trackProp()` | Property | This property changes | High-frequency properties (score, counters) |
| `trackItemProp()` | Item Property | This item's property changes | Item properties in collections |

### Avoid Over-Tracking

```typescript
// ❌ BAD: Tracks entire collection for a single item
function getBad(id: string) {
  this.$.track('players');  // Tracks ALL players!
  return this.players.get(id);
}

// ✅ GOOD: Tracks only the specific item
function getGood(id: string) {
  this.$.trackItem('players', id);  // Tracks only this player
  return this.players.get(id);
}
```

### Use Deep Proxies Wisely

```typescript
// ✅ GOOD: For displaying multiple properties of an item
get(id: string): Player | undefined {
  this.$.trackItem('players', id);
  return this.$.deepItemProxy(this.players.get(id), 'players', id);
}

// ✅ GOOD: For displaying a single property (more efficient)
getScore(id: string): number | undefined {
  this.$.trackItemProp('players', id, 'score');
  return this.players.get(id)?.score;
}
```

## Best Practices

### 1. Consistent Naming

```typescript
// Use descriptive names for tracking keys
this.$.track('users');           // Collection
this.$.trackItem('users', id);  // Item
this.$.trackProp('config', 'theme');  // Property
this.$.trackItemProp('users', id, 'score');  // Item property
```

### 2. Always Return Tracked Data

```typescript
// ❌ BAD: Tracks but returns raw data
getUser(id: string) {
  this.$.trackItem('users', id);
  return this.users.get(id);  // Raw object - no reactivity!
}

// ✅ GOOD: Returns tracked proxy
getUser(id: string) {
  this.$.trackItem('users', id);
  return this.$.deepItemProxy(this.users.get(id), 'users', id);
}
```

### 3. Use Events for Cross-Component Communication

```typescript
// Store emits events
updateScore(id: string, score: number): void {
  // ... update logic ...
  this.$.triggerItemProp('players', id, 'score', 'player:scored', { id, score });
}

// Other components listen
playerStore.on('player:scored', ({ id, score }) => {
  // React to score change without tracking
});
```

### 4. Clean Up Event Listeners

```typescript
import { onMount, onUnmount } from 'svelte';

onMount(() => {
  const unsub1 = playerStore.on('player:added', (player) => {
    console.log('Added:', player);
  });

  const unsub2 = playerStore.on('player:removed', (id) => {
    console.log('Removed:', id);
  });

  onUnmount(() => {
    unsub1();
    unsub2();
  });
});
```

## Common Patterns

### Pattern 1: Computed Values

```typescript
// Using $derived.by() for computed values
const topPlayers = $derived.by(() => {
  const all = playerStore.getAll();
  return all
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
});
```

### Pattern 2: Filtered Lists

```typescript
const activePlayers = $derived.by(() => {
  const all = playerStore.getAll();
  return all.filter(p => p.level > 5);
});
```

### Pattern 3: Derived Item State

```typescript
const playerRank = $derived.by(() => {
  const score = playerStore.getScore(playerId);
  const allScores = playerStore.getAll().map(p => p.score);
  
  if (!score) return 'N/A';
  
  const rank = allScores.filter(s => s > score).length + 1;
  return `#${rank}`;
});
```

## Debugging Tips

### Check What's Being Tracked

```typescript
// Add console.log to see when tracking happens
get(id: string): Player | undefined {
  console.log('Tracking player:', id);
  this.$.trackItem('players', id);
  return this.$.deepItemProxy(this.players.get(id), 'players', id);
}
```

### Monitor Events

```typescript
// Log all events to see what's happening
onMount(() => {
  playerStore.on('player:added', (p) => console.log('Added:', p));
  playerStore.on('player:scored', (d) => console.log('Scored:', d));
  playerStore.on('player:levelUp', (d) => console.log('Level up:', d));
  playerStore.on('player:removed', (id) => console.log('Removed:', id));
});
```

### Use Svelte DevTools

1. Install Svelte DevTools browser extension
2. Inspect component render counts
3. Check which dependencies trigger re-renders
4. Verify fine-grained reactivity is working

## Migration from Other Patterns

### From Signals Only

```typescript
// Old: Everything in one signal
const players = $state<Player[]>([]);

// New: Granular reactivity
const playerIds = $derived.by(() => playerStore.getIds());
const player = $derived.by(() => playerStore.get(id));
const score = $derived.by(() => playerStore.getScore(id));
```

### From Events Only

```typescript
// Old: Manual updates
let players = [];
playerStore.on('change', () => {
  players = playerStore.getAll();  // Full re-fetch
});

// New: Automatic updates
const players = $derived.by(() => playerStore.getAll());  // Auto-tracked
```

## Summary

The unisig library provides:

✅ **Fine-grained reactivity** - Track at collection, item, or property level  
✅ **Event system** - Subscribe to changes outside reactive contexts  
✅ **Deep proxies** - Automatic nested property tracking  
✅ **Type safety** - Full TypeScript support  
✅ **Framework-agnostic** - Works with any signal library  

This example demonstrates best practices for using unisig with Svelte 5, showing how to achieve optimal performance through granular tracking while maintaining a clean, maintainable codebase.