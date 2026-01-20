# Performance Optimization Opportunities

This document outlines potential performance improvements for unisig based on benchmark results and best practices from other signal libraries (Solid.js, Preact signals, Vue, MobX, etc.).

## Critical Performance Issues

### 1. Proxy Overhead (HIGHEST PRIORITY)

**Current Performance:**
- Direct property access: ~16M ops/sec
- Proxy access: ~100K ops/sec
- **Slowdown: 160x** 😱

**Root Cause:**
- Runtime proxies have inherent overhead
- Every property access goes through proxy traps
- Deep proxy compounds this with nested proxies

**Solutions:**

#### Option A: Compile-Time Transformations (Best)
Like Solid.js, use a compile-time approach:
- Transform `obj.prop` to `obj.get('prop')` at build time
- No runtime overhead for property access
- Requires Babel plugin or similar

#### Option B: Getter/Setter Pattern (Medium)
Like Vue 2 and older MobX:
- Use Object.defineProperty to create reactive getters/setters
- Faster than proxies (no trap overhead)
- Still has some overhead but much less than proxies

#### Option C: Selective Proxy Usage (Quick Win)
- Only proxy objects that are explicitly requested
- Provide a non-proxied fast path for read-heavy operations
- Add `track()` calls manually in critical paths

#### Option D: Proxy Caching Optimization
- Cache proxy instances more aggressively
- Use symbol-based cache keys for faster lookup
- Implement proxy pooling for frequently created objects

### 2. Tracking Operation Overhead

**Current Performance:**
- `track()` operations: ~6-7M ops/sec
- `isInScope()` called on every track

**Optimization:**
```typescript
// Instead of:
track(key) {
  if (this.isInScope()) {  // Function call overhead
    this.dep(key)?.depend();
  }
}

// Use inline check (like Solid.js):
track(key) {
  const dep = this.deps.get(key);  // Direct Map access
  if (dep && this.adapter?.isInScope?.() !== false) {
    dep.depend();
  }
}
```

### 3. Event Emission Performance

**Current Performance:**
- `forEach` for emission: ~1.4M ops/sec (1000 listeners)

**Optimization:**
```typescript
// forEach is slower than for...of in some V8 versions
emit(event, data) {
  const listeners = this._listeners.get(event);
  if (!listeners) return;

  if (this._errorHandler) {
    for (const fn of listeners) {  // Faster than forEach
      try {
        fn(data);
      } catch (err) {
        this._errorHandler(event, err as Error, fn);
      }
    }
  } else {
    for (const fn of listeners) {
      fn(data);  // Direct iteration
    }
  }
}
```

### 4. Dependency Management

**Current Performance:**
- Map-based dependency storage
- Multiple nested Maps for granular tracking

**Optimizations:**

#### A. Use WeakMap for object-keyed dependencies
```typescript
// For object-based dependencies (better memory)
const objectDeps = new WeakMap<object, Dependency>();
```

#### B. Flatten nested structure for common cases
```typescript
// Instead of:
itemPropDeps: Map<string, Map<string | number, Map<string, Dependency>>>

// Use compound keys:
propDeps: Map<string, Dependency>  // Key: "collection_id_prop"
```

#### C. Lazy dependency creation
Only create dependencies when actually tracked (already done, but can be optimized)

## Medium Priority Optimizations

### 5. Batch Triggering

**Concept:**
Like MobX's `runInAction` or Vue's `batch`:
- Collect multiple triggers
- Execute them together
- Reduce redundant notifications

**Implementation:**
```typescript
batch(callback: () => void) {
  const queuedTriggers = new Set<Dependency>();
  const originalNotify = this.adapter.create().notify;
  
  this.adapter.create = () => ({
    depend: () => {},
    notify: () => queuedTriggers.add(dep),
  });
  
  callback();
  
  for (const dep of queuedTriggers) {
    dep.notify();
  }
}
```

### 6. Track-Once Pattern

**Concept:**
Like Solid.js createMemo:
- Track dependencies once
- Re-run only when they change
- Avoid repeated tracking overhead

**Implementation:**
```typescript
memo<T>(fn: () => T): () => T {
  let value: T;
  let deps: Dependency[] = [];
  const tracker = new Tracker();
  
  const effect = () => {
    // Clear old deps
    deps.forEach(dep => {
      // Need to track this somehow
    });
    deps = [];
    
    // Run with tracking
    value = fn();
  };
  
  return () => {
    effect();
    return value;
  };
}
```

### 7. Optimized Array Operations

**Current Performance:**
- Array mutations through proxy: ~500K ops/sec
- Array iterations: ~500-700K ops/sec

**Optimizations:**

#### A. Specialized Array Proxy
```typescript
// Use more optimized array methods
const optimizedArrayMethods = {
  push: function(...items) {
    const result = Array.prototype.push.apply(this, items);
    trigger();
    return result;
  },
  // Other methods...
};
```

#### B. Avoid proxy for arrays when possible
- Provide non-proxied array methods
- Use native array methods when safe

### 8. String Key Optimization

**Concept:**
Avoid string concatenation for compound keys:
- Use template strings sparingly
- Cache compound keys
- Use symbols or numbers where possible

**Implementation:**
```typescript
// Instead of:
const key = `${collection}_${id}_${prop}`;

// Use:
const key = compoundKeyCache.get(collection, id, prop) 
  ?? compoundKeyCache.set(collection, id, prop, `${collection}_${id}_${prop}`);
```

## Low Priority Optimizations

### 9. Memory Management

**Optimizations:**
- Implement proper cleanup for removed items
- Use WeakMap where possible for garbage collection
- Provide explicit dispose methods

### 10. Development vs Production Builds

**Concept:**
Like React and Vue:
- Development: Full error checking, devtools, warnings
- Production: Stripped down, minimal overhead

**Implementation:**
```typescript
// Use build-time flags
const __DEV__ = process.env.NODE_ENV !== 'production';

export class Scope {
  track(key: string): void {
    if (__DEV__) {
      // Expensive checks
    }
    // Fast path
  }
}
```

## Benchmark-Driven Optimization Priorities

Based on benchmark results:

1. **PROXY OVERHEAD** - 160x slowdown (CRITICAL)
   - Implement compile-time transformations or getter/setter pattern
   - Expected improvement: 50-100x faster

2. **Array Operations** - 3-5x slower than direct
   - Optimize array proxy methods
   - Expected improvement: 2-3x faster

3. **Event Emission** - Good but can improve
   - Replace forEach with for...of
   - Expected improvement: 10-20% faster

4. **Tracking Operations** - Already good (7M ops/sec)
   - Minor optimizations possible
   - Expected improvement: 10-15% faster

## Implementation Strategy

### Phase 1: Quick Wins (1-2 days)
1. Replace `forEach` with `for...of` in emitter
2. Optimize `isInScope()` checks
3. Add proxy caching improvements

### Phase 2: Medium Effort (1 week)
1. Implement batching API
2. Optimize array proxy methods
3. Add compound key caching

### Phase 3: Major Overhaul (2-3 weeks)
1. Implement getter/setter pattern as alternative to proxies
2. Add compile-time transformation support
3. Create production/development builds

## Comparison with Other Libraries

### Solid.js
- **Strengths**: Compile-time, zero overhead
- **Trade-offs**: Requires build step, steeper learning curve
- **Lessons**: Compile-time transformations are fastest

### Preact Signals
- **Strengths**: Simple API, good performance
- **Trade-offs**: Less granular tracking
- **Lessons**: Simplicity can be faster

### Vue 3
- **Strengths**: Granular tracking, good DX
- **Trade-offs**: Proxy overhead
- **Lessons**: Proxies are convenient but slow

### MobX
- **Strengths**: Action batching, automatic tracking
- **Trade-offs**: Complex API, more magic
- **Lessons**: Batching is important for performance

## Recommendations

### For Maximum Performance:
1. **Implement compile-time transformations** (like Solid.js)
2. **Provide alternative API** without proxies for hot paths
3. **Add production build** that strips dev features

### For Balance of Performance and DX:
1. **Keep proxy API** but optimize it
2. **Add batching** for multiple updates
3. **Provide escape hatches** for manual tracking

### For Quick Improvements:
1. Replace `forEach` with `for...of`
2. Optimize `isInScope()` checks
3. Add compound key caching
4. Improve proxy caching

## Next Steps

1. Profile actual application usage to identify hot paths
2. Implement Phase 1 optimizations
3. Add benchmarks for each optimization
4. Measure real-world impact
5. Decide on Phase 2 based on results

## References

- [Solid.js Compiler](https://github.com/solidjs/solid/tree/main/packages/compiler)
- [Preact Signals](https://preactjs.com/guide/v10/signals/)
- [Vue 3 Reactivity](https://github.com/vuejs/core/tree/main/packages/reactivity)
- [MobX](https://mobx.js.org/)
- [Optimizing JavaScript V8](https://v8.dev/blog/elements-kinds)