# Signals Refresher

If you're new to signals or find them confusing, this guide is for you.

## The Problem Signals Solve

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

## How Signals Work

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

## The Core Mechanism: depend() and notify()

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

## How Does the Signal Know Which Effect Is Running?

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
1. effect(() => { ... }) → Sets currentEffect = thisEffect
2. count.value → count sees currentEffect, adds it to subscribers
3. effect ends → Sets currentEffect = null
4. count.value = 5 → count loops through subscribers, calls each one
```

This is why signals only work inside effects/computeds — outside of them, `currentEffect` is `null`, so nothing gets tracked.

## Why Adapters Work

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
```

## Summary

1. **Signals track dependencies automatically** - When you read a value inside an effect, the signal remembers that effect
2. **Signals notify on changes** - When you write a value, all tracked effects re-run
3. **This works because of a global "current effect"** - The signal checks this when read
4. **Adapters unify different libraries** - They all do the same thing, just with different APIs