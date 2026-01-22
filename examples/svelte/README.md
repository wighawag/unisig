# unisig Svelte Example

A demonstration of unisig's fine-grained reactivity with Svelte 5 runes.

## Features

- 🔬 **Property-level reactivity** - Each property has its own signal
- 📊 **Collection tracking** - Efficient list-level updates
- 🎪 **Event subscriptions** - Listen to changes outside reactive contexts
- 🔄 **Deep proxies** - Automatic nested property tracking
- 💎 **Type-safe** - Full TypeScript support

## Getting Started

### Installation

```bash
cd examples/svelte
pnpm install
```

### Running the Example

```bash
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) to see the demo.

## What You'll See

The demo showcases a player management system with:

1. **Player List** - Collection-level reactivity (updates when players are added/removed)
2. **Player Cards** - Property-level reactivity (only updates when specific properties change)
3. **Render Counts** - Visual indicators showing which components re-render
4. **Event Logs** - Browser console shows all emitted events

## Key Demonstrations

### 1. Fine-Grained Reactivity

Watch the render counts carefully:
- Click **+10** on Score → Only Score component re-renders
- Click **Level Up** → Only Level component re-renders
- Edit **Name** → Only Name component re-renders
- Add/Remove player → Only Player List re-renders

This is achieved using targeted tracking:

```typescript
// Track only score property
getScore(id: string): number | undefined {
  this.$.trackItemProp('players', id, 'score');
  return this.players.get(id)?.score;
}

// Trigger only score property
updateScore(id: string, score: number): void {
  this.players.get(id).score = score;
  this.$.triggerItemProp('players', id, 'score', 'player:scored', { id, score });
}
```

### 2. Event Subscriptions

The browser console shows events as they happen:

```
🎮 Player added: Alice
🎯 Score updated: p1 -> 110
⬆️ Level up: p1 -> 6
```

Events work anywhere, even outside reactive contexts:

```typescript
playerStore.on('player:added', (player) => {
  console.log('Player added:', player.name);
});
```

### 3. Deep Proxies

Accessing nested properties automatically tracks them:

```typescript
get(id: string): Player | undefined {
  this.$.trackItem('players', id);
  // Deep proxy automatically tracks nested properties
  return this.$.deepItemProxy(this.players.get(id), 'players', id);
}
```

## Architecture

```
┌─────────────────────────────────────────┐
│           Svelte Component              │
│  (uses $state, $derived, $effect)       │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│           PlayerStore                   │
│  ┌─────────────────────────────────┐   │
│  │  Tracker<PlayerEvents>         │   │
│  │  - track()                     │   │
│  │  - trackItem()                 │   │
│  │  - trackItemProp()             │   │
│  │  - trigger()                   │   │
│  │  - triggerItemProp()           │   │
│  └─────────────────────────────────┘   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│        Svelte Adapter                   │
│  (bridges unisig to Svelte 5 runes)    │
└─────────────────────────────────────────┘
```

## Learn More

- 📖 **[EXAMPLE_GUIDE.md](./EXAMPLE_GUIDE.md)** - Comprehensive implementation guide
- 📘 **[PATTERNS.md](../../PATTERNS.md)** - Common usage patterns
- 📗 **[README.md](../../README.md)** - Main unisig documentation

## Code Structure

```
src/
├── lib/
│   ├── playerStore.ts         # Main store implementation
│   ├── svelteAdapter.svelte.ts # Svelte 5 adapter
│   ├── PlayerList.svelte      # List component (collection tracking)
│   ├── PlayerCard.svelte      # Card component (property tracking)
│   ├── PlayerName.svelte      # Name component (targeted tracking)
│   ├── PlayerScore.svelte     # Score component (targeted tracking)
│   └── PlayerLevel.svelte     # Level component (targeted tracking)
└── App.svelte                 # Main application
```

## Key Concepts

### Tracking vs Triggering

**Tracking** (for reads):
```typescript
this.$.trackItemProp('players', id, 'score');
```
- Call in getter methods
- Creates a dependency
- Registers with signal library

**Triggering** (for writes):
```typescript
this.$.triggerItemProp('players', id, 'score');
```
- Call in setter methods
- Notifies dependencies
- Triggers re-renders

### Targetedity Levels

| Level | Method | When to Use |
|-------|--------|-------------|
| Collection | `track()` | Lists, counts, computed over all items |
| Item | `trackItem()` | Single item display |
| Property | `trackProp()` | High-frequency properties |
| Item Property | `trackItemProp()` | Item properties in collections |

### Deep Proxies

```typescript
// Shallow proxy (first level only)
this.$.itemProxy(item, 'players', id)

// Deep proxy (any nesting level)
this.$.deepItemProxy(item, 'players', id)
```

Deep proxies use dot notation for tracking:
- `player.name` → Tracks `'name'`
- `player.stats.health` → Tracks `'stats.health'`
- `player.inventory[0]` → Tracks `'inventory.0'`

## Performance Tips

1. **Use targeted tracking** - Track only what you need
2. **Avoid deep proxies for simple data** - Use shallow proxies instead
3. **Prefer property-level tracking** - For high-frequency updates
4. **Use events for side effects** - API calls, logging, etc.

## Troubleshooting

### Components Not Updating

Check that:
1. Adapter is passed to the Tracker constructor: `new Tracker({ adapter })`
2. Tracking is called in getters: `this.$.trackItem('players', id)`
3. Triggering is called in setters: `this.$.triggerItem('players', id)`
4. Access is in reactive context: `$derived.by(() => store.get(id))`

### All Components Re-rendering

You might be tracking at too high a level:
```typescript
// ❌ BAD: Tracks entire collection
this.$.track('users');

// ✅ GOOD: Tracks only the specific item
this.$.trackItem('users', id);
```

### Events Not Firing

Check that:
1. Event is emitted: `this.$.emit('event', data)`
2. Event name matches exactly (case-sensitive)
3. Listener is still subscribed (not unsubscribed)

## License

MIT