# Agent Guide for unisig Repository

This guide is for AI agents working with the unisig repository. It provides essential context, patterns, and instructions for effective development.

## Project Overview

**unisig** (Universal Signals) is a framework-agnostic reactive state management library that:

- Works with any signal library (Solid.js, Preact, Vue, MobX, Svelte, etc.) via adapters
- Provides targeted reactivity (collection, item, or property level)
- Includes a built-in event emitter system
- Has zero dependencies
- Is written in TypeScript with comprehensive test coverage

## Repository Structure

```
unisig/
├── packages/unisig/          # Core reactive primitives package
│   ├── src/
│   │   ├── index.ts         # Main exports (unisig factory)
│   │   └── *.spec.ts        # Test files
│   ├── package.json
│   └── tsconfig.json
├── packages/tracker/         # Tracker package (targeted reactivity)
│   ├── src/
│   │   ├── Tracker.ts       # Main tracking class
│   │   ├── Scope.ts         # Signal scope for reactive tracking
│   │   ├── ProxyFactory.ts  # Auto-tracking proxy implementations
│   │   ├── types.ts         # TypeScript interfaces and types
│   │   └── *.spec.ts        # Test files (comprehensive coverage)
│   ├── test/
│   │   └── *.spec.ts        # Integration tests
│   ├── package.json
│   └── tsconfig.json
├── packages/solid-js/        # Solid.js adapter
│   ├── src/
│   │   └── index.ts         # Adapter implementation
│   └── package.json
├── packages/svelte/          # Svelte 5 adapter
│   ├── src/
│   │   └── index.svelte.ts  # Adapter implementation
│   └── package.json
├── examples/
│   └── svelte/              # Svelte example application
│       ├── src/lib/         # Svelte components and stores
│       ├── EXAMPLE_GUIDE.md # Implementation guide for the example
│       └── README.md        # Example-specific documentation
├── integration-tests/        # Integration tests for adapters
│   ├── solid-js/
│   └── svelte/
├── docs/                     # Documentation
│   ├── PATTERNS.md          # Design patterns and best practices
│   └── SIGNALS_REFRESHER.md # Signals refresher guide
├── README.md                # Main documentation
├── CONTRIBUTING.md          # Contribution guidelines
└── AGENTS.md                # This file - agent guide
```

## Core Architecture

### Core Classes

1. **[`Scope`](packages/tracker/src/Scope.ts)** - Signal tracking only
   - `track(key)` - Register dependency
   - `trackItem(collection, id)` - Track a specific item
   - `trackProp(key, prop)` - Track a property of a key
   - `trackItemProp(collection, id, prop)` - Track a property of an item
   - `trigger(key)` - Notify dependency
   - `triggerItem(collection, id)` - Trigger item change
   - `triggerProp(key, prop)` - Trigger property change
   - `triggerItemProp(collection, id, prop)` - Trigger item property change
   - `triggerList(collection)` - Trigger collection/list change
   - `triggerRemove(collection, id)` - Trigger item removal
   - `dep(key)` - Get/create dependency
   - `itemDep(collection, id)` - Get/create item dependency
   - `propDep(key, prop)` - Get/create property dependency
   - `itemPropDep(collection, id, prop)` - Get/create item property dependency
   - `proxy(target, key)` - Auto-tracking proxy
   - `itemProxy(target, collection, id)` - Item auto-tracking proxy
   - `deepProxy(target, key)` - Deep auto-tracking proxy
   - `deepItemProxy(target, collection, id)` - Deep item auto-tracking proxy
   - `readonlyProxy(target, key)` - Read-only proxy
   - `readonlyItemProxy(target, collection, id)` - Read-only item proxy
   - `readonlyDeepProxy(target, key)` - Deep read-only proxy
   - `readonlyDeepItemProxy(target, collection, id)` - Deep read-only item proxy
   - `clear()` - Clear all dependencies
   - Uses adapter for depend/notify

2. **[`Tracker`](packages/tracker/src/Tracker.ts)** - Wrapper around Scope
   - All Scope methods (track, trackItem, trackProp, trackItemProp)
   - All Trigger methods (trigger, triggerItem, triggerProp, triggerItemProp, triggerCollection, triggerItemRemoved, triggerItemAdded)
   - All Proxy methods (proxy, itemProxy, deepProxy, deepItemProxy, readonlyProxy, readonlyItemProxy, readonlyDeepProxy, readonlyDeepItemProxy)
   - Dependency access methods (dep, itemDep, propDep, itemPropDep)
   - Helper methods (getAdapter, isInScope, clear)

### Key Pattern: Targeted Tracking

The library supports targeted reactivity at three levels:

1. **Collection level** - `track('users')`, `trigger('users')`
2. **Item level** - `trackItem('users', '123')`, `triggerItem('users', '123')`
3. **Property level** - `trackProp('config', 'theme')`, `triggerProp('config', 'theme')`
4. **Item property level** - `trackItemProp('users', '123', 'name')`, `triggerItemProp('users', '123', 'name')`

### Factory Pattern for Standalone State

The [`index.ts`](packages/unisig/src/index.ts) module provides the `unisig()` factory function:

- `unisig(adapter)` - Creates a bundle with `reactive()`, `signal()`, and `effect()` functions

The [`Tracker.ts`](packages/tracker/src/Tracker.ts) module provides the `createTrackerFactory()` function:

- `createTrackerFactory(adapter)` - Creates a factory for creating Tracker instances with a pre-configured adapter

This avoids global state and enables testing with multiple adapters.

### Adapter System

The library uses the signaldb adapter pattern. An adapter must implement:

```typescript
interface ReactivityAdapter {
  create: () => { depend: () => void; notify: () => void };
  isInScope?: () => boolean;
  onDispose?: (callback: () => void) => void;
}
```

Pre-built adapters available from `@unisig/*` packages.

## Coding Conventions

### TypeScript Style

1. **Use `type` instead of `interface` for event maps**

   ```typescript
   // Good
   type Events = {
     "item:added": { id: string; value: number };
     cleared: void;
   };

   // Avoid
   interface Events {
     "item:added": { id: string; value: number };
     cleared: void;
   }
   ```

2. **JSDoc comments on all public APIs**
   - Include `@param`, `@returns`, `@throws` where applicable
   - Provide `@example` usage examples
   - See [`Emitter.ts`](packages/unisig/src/Emitter.ts) for examples

3. **Generic type constraints**
   ```typescript
   // Good
   on<K extends keyof Events>(event: K, listener: Listener<Events[K]>)
   ```

### Testing Conventions

1. **Comprehensive test coverage** - Current: 230 tests across 7 test files
2. **Test file naming** - Use `.spec.ts` suffix
3. **Test organization** - Related tests grouped by describe blocks
4. **Edge case testing** - Separate edge case test files (e.g., `Tracker.edgeCases.spec.ts`)
5. **Test naming** - Descriptive names explaining what is tested

### Code Patterns

1. **READ methods** - Always call `track()`, `trackItem()`, `trackProp()`, or `trackItemProp()` at the start
2. **WRITE methods** - Always call `trigger()`, `triggerItem()`, `triggerProp()`, or `triggerItemProp()` after mutation
3. **Proxy usage** - Return proxied objects from getter methods for automatic tracking

Example store pattern:

```typescript
class UserStore {
  private $ = new Tracker({ adapter: myAdapter });
  private users = new Map<string, User>();

  // READ method
  getUser(id: string): User | undefined {
    this.$.trackItem("users", id);
    return this.users.get(id);
  }

  // WRITE method
  updateUser(id: string, changes: Partial<User>): void {
    const user = this.users.get(id);
    if (!user) return;

    Object.assign(user, changes);
    this.$.triggerItem("users", id);
  }
}
```

## Common Tasks

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run tests for a specific file
pnpm test Tracker.spec.ts
```

### Building the Package

```bash
# Build TypeScript
pnpm build

# Build the Svelte example
cd examples/svelte && pnpm build
```

### Adding a New Feature

1. **Write the implementation** in the appropriate source file
2. **Add comprehensive tests** covering:
   - Happy path
   - Edge cases
   - Error conditions
   - TypeScript type safety
3. **Update documentation**:
   - Add JSDoc comments to the implementation
   - Update README.md if it's a user-facing API
   - Update PATTERNS.md if it's a new pattern
4. **Run tests** to ensure nothing broke
5. **Run TypeScript compiler** to check types

### Fixing a Bug

1. **Identify the issue** by examining test failures or error reports
2. **Add a failing test** that reproduces the bug
3. **Fix the implementation**
4. **Verify the fix** by running the new test and all existing tests
5. **Check TypeScript compilation**

### Working with the Svelte Example

The [`examples/svelte`](examples/svelte/) directory contains a working example:

- See [`examples/svelte/EXAMPLE_GUIDE.md`](examples/svelte/EXAMPLE_GUIDE.md) for implementation details
- The example demonstrates:
  - Creating a Svelte adapter
  - Building a reactive store with Tracker
  - Targeted reactivity patterns
  - Using proxies for automatic tracking

## Important Files for Agents

When working on this repo, always read these files first:

1. **[`README.md`](README.md)** - Complete user documentation
2. **[`docs/PATTERNS.md`](docs/PATTERNS.md)** - Design patterns and best practices
3. **[`packages/unisig/src/index.ts`](packages/unisig/src/index.ts)** - Public API exports for unisig
4. **[`packages/tracker/src/Tracker.ts`](packages/tracker/src/Tracker.ts)** - Main Tracker class
5. **[`packages/tracker/src/Scope.ts`](packages/tracker/src/Scope.ts)** - Core Scope class
6. **[`CONTRIBUTING.md`](CONTRIBUTING.md)** - Contribution guidelines

## Testing Strategy

The project has comprehensive test coverage across multiple test files:

- **unisig.spec.ts** - Core unisig functionality
- **Scope.spec.ts** - Signal scope basics
- **Scope.deepProxy.spec.ts** - Deep proxy behavior
- **Scope.readonlyProxy.spec.ts** - Read-only proxy behavior
- **Tracker.spec.ts** - Tracker integration
- **Tracker.edgeCases.spec.ts** - Edge cases
- **Tracker.proxy.integration.spec.ts** - Proxy integration tests

When adding features, maintain this comprehensive coverage. Test edge cases thoroughly.

## Key Concepts for Agents

1. **Signals vs Events**
   - Signals work inside reactive contexts (effects, computeds)
   - Events work everywhere
   - The library provides BOTH in one API

2. **Tracking is Context-Aware**
   - `track()`/`trackItem()`/`trackProp()`/`trackItemProp()` calls are no-ops outside reactive scope
   - Same methods work for both signal and event patterns
   - No need for separate "direct" methods

3. **Deep Proxies**
   - Automatic tracking of nested properties
   - Supports objects and arrays
   - Does NOT proxy: Date, RegExp, Map, Set, WeakMap, WeakSet, Error, Promises
   - Uses WeakMap for identity preservation

4. **No Global State**
   - Use factory pattern (`withAdapter`) for standalone state
   - Each factory creates its own configured function
   - Better for testing and multiple adapters

## Common Mistakes to Avoid

1. **Forgetting to call `track()` in READ methods**
   - Always call at the start of getter methods

2. **Forgetting to call `trigger()`/`triggerItem()`/`triggerProp()`/`triggerItemProp()` in WRITE methods**
   - Always call after mutations

3. **Using `interface` instead of `type` for events**
   - Use `type` for event maps to enable proper inference

4. **Not testing edge cases**
   - Add edge case tests for all new features

5. **Updating global state**
   - Avoid global adapters - use factory pattern instead

## Performance Considerations

1. **WeakMap caching** - Proxies are cached to maintain identity
2. **Conditional tracking** - `track()` only works inside reactive scope
3. **Targeted notifications** - Track at the right level to minimize updates
4. **No unnecessary operations** - Tracking only happens when in reactive scope

## Summary

This is a well-architected, thoroughly tested reactive state management library. The key principles are:

- Framework-agnostic via adapters
- Both signals and events in one API
- Targeted reactivity (collection/item/property level)
- Comprehensive test coverage
- Zero dependencies
- Strong TypeScript support

When working on this repo, prioritize:

1. Maintaining test coverage
2. Following existing patterns
3. Writing clear documentation
4. TypeScript type safety
5. Performance (efficient tracking/triggering)
