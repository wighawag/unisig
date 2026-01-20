# Agent Guide for unisig Repository

This guide is for AI agents working with the unisig repository. It provides essential context, patterns, and instructions for effective development.

## Project Overview

**unisig** (Universal Signals) is a framework-agnostic reactive state management library that:

- Works with any signal library (Solid.js, Preact, Vue, MobX, Svelte, etc.) via adapters
- Provides granular reactivity (collection, item, or property level)
- Includes a built-in event emitter system
- Has zero dependencies
- Is written in TypeScript with comprehensive test coverage

## Repository Structure

```
unisig/
├── packages/unisig/          # Main package
│   ├── src/
│   │   ├── Emitter.ts       # Event emitter class
│   │   ├── Tracker.ts       # Main tracking class (signals + events)
│   │   ├── Scope.ts         # Signal scope for reactive tracking
│   │   ├── standalone.ts    # Factory functions (withAdapter, withAdapterRef)
│   │   ├── types.ts         # TypeScript interfaces and types
│   │   └── *.spec.ts        # Test files (comprehensive coverage)
│   ├── package.json
│   └── tsconfig.json
├── examples/
│   └── svelte/              # Svelte example application
│       ├── src/lib/         # Svelte components and adapters
│       ├── EXAMPLE_GUIDE.md # Implementation guide for the example
│       └── README.md        # Example-specific documentation
├── README.md                # Main documentation
├── PATTERNS.md              # Design patterns and best practices
├── CONTRIBUTING.md          # Contribution guidelines
└── AGENTS.md                # This file - agent guide
```

## Core Architecture

### Three Main Classes

1. **[`Emitter`](packages/unisig/src/Emitter.ts)** - Event emitter only
   - `on(event, listener)` - Subscribe to events
   - `off(event, listener)` - Unsubscribe
   - `once(event, listener)` - Subscribe once
   - `emit(event, data)` - Emit event
   - `hasListeners(event)` - Check if event has listeners
   - `listenerCount(event)` - Count listeners
   - `removeAllListeners(event?)` - Remove listeners

2. **[`Scope`](packages/unisig/src/Scope.ts)** - Signal tracking only
   - `track(key)` - Register dependency
   - `trigger(key)` - Notify dependency
   - `dep(key)` - Get/create dependency
   - Uses adapter for depend/notify

3. **[`Tracker`](packages/unisig/src/Tracker.ts)** - Combines both Emitter and Scope
   - Event methods (on, off, once, emit, etc.)
   - Tracking methods (track, trackItem, trackProp)
   - Trigger methods (trigger, triggerItem, triggerProp)
   - Proxy methods (proxy, deepProxy, itemProxy, etc.)

### Key Pattern: Granular Tracking

The library supports granular reactivity at three levels:

1. **Collection level** - `track('users')`, `trigger('users')`
2. **Item level** - `trackItem('users', '123')`, `triggerItem('users', '123')`
3. **Property level** - `trackProp('users', '123', 'name')`, `triggerProp('users', '123', 'name')`

### Factory Pattern for Standalone State

The [`standalone.ts`](packages/unisig/src/standalone.ts) module provides factory functions:

- `withAdapter(adapter)` - Creates a `state()` function
- `withAdapterRef(adapter)` - Creates a `ref()` function

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

Pre-built adapters available from `@signaldb/*` packages.

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

1. **READ methods** - Always call `track()`, `trackItem()`, or `trackProp()` at the start
2. **WRITE methods** - Always call `trigger()`, `triggerItem()`, or `triggerProp()` after mutation
3. **Event emission** - Call `emit()` after triggering for event subscribers
4. **Proxy usage** - Return proxied objects from getter methods for automatic tracking

Example store pattern:

```typescript
class UserStore {
  private $ = new Tracker<UserEvents>();
  private users = new Map<string, User>();

  // Expose events
  on = this.$.on.bind(this.$);

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
    this.$.emit("user:updated", { id, changes });
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
  - Granular reactivity patterns
  - Using proxies for automatic tracking

## Important Files for Agents

When working on this repo, always read these files first:

1. **[`README.md`](README.md)** - Complete user documentation
2. **[`PATTERNS.md`](PATTERNS.md)** - Design patterns and best practices
3. **[`packages/unisig/src/index.ts`](packages/unisig/src/index.ts)** - Public API exports
4. **[`packages/unisig/src/Tracker.ts`](packages/unisig/src/Tracker.ts)** - Main class
5. **[`CONTRIBUTING.md`](CONTRIBUTING.md)** - Contribution guidelines

## Testing Strategy

The project has 230 tests across 7 test files:

- **Emitter.spec.ts** - Event emitter functionality (19 tests)
- **Scope.spec.ts** - Signal scope basics (49 tests)
- **Scope.deepProxy.spec.ts** - Deep proxy behavior (28 tests)
- **Tracker.spec.ts** - Tracker integration (36 tests)
- **Tracker.edgeCases.spec.ts** - Edge cases (48 tests)
- **standalone.spec.ts** - Factory functions (43 tests)
- **types.spec.ts** - Type system (7 tests)

When adding features, maintain this comprehensive coverage. Test edge cases thoroughly.

## Key Concepts for Agents

1. **Signals vs Events**
   - Signals work inside reactive contexts (effects, computeds)
   - Events work everywhere
   - The library provides BOTH in one API

2. **Tracking is Context-Aware**
   - `track()`/`trackItem()` calls are no-ops outside reactive scope
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

2. **Forgetting to call `trigger()` in WRITE methods**
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
3. **Granular notifications** - Track at the right level to minimize updates
4. **No unnecessary operations** - Emitter checks for listeners before emitting

## Summary

This is a well-architected, thoroughly tested reactive state management library. The key principles are:

- Framework-agnostic via adapters
- Both signals and events in one API
- Granular reactivity (collection/item/property level)
- Comprehensive test coverage
- Zero dependencies
- Strong TypeScript support

When working on this repo, prioritize:

1. Maintaining test coverage
2. Following existing patterns
3. Writing clear documentation
4. TypeScript type safety
5. Performance (efficient tracking/triggering)
