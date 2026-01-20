# Performance Optimization Opportunities

This document outlines potential performance improvements for unisig based on benchmark results and best practices from other signal libraries (Solid.js, Preact signals, Vue, MobX, etc.).

## Design Decision: Keep Proxy-Based Approach

**Decision:** Stay with proxy-based reactivity (like Vue 3 and MobX 5)

**Rationale:**
- Industry standard: Modern reactive systems (Vue 3, MobX 5, Solid) use proxies
- Better developer experience: Just works, no special methods needed
- Fewer edge cases: Handles dynamic properties, array operations, Map/Set naturally
- No build tools required: Pure runtime solution
- Aligns with JavaScript ecosystem trends

**Trade-offs:**
- **Accept:** 160x slower than direct property access (but still fast enough for most use cases)
- **Avoid:** Complexity of compile-time transformations
- **Avoid:** Limitations of getter/setter pattern (can't track new properties, array index assignments)

**Performance Goal:** Achieve 2-3x improvement through runtime optimizations while maintaining the proxy API.

## Practical Proxy Optimizations (No Build Tools Required)

### Phase 1: Quick Wins (Easy, Immediate)

#### 1. Symbol-Based Internal Keys

**Problem:** String comparisons for every property access

**Solution:** Use symbols for internal properties

```typescript
const TRACK_KEY = Symbol('track');
const TRIGGER_KEY = Symbol('trigger');

get(target, prop, receiver) {
  // Fast path for internal properties
  if (prop === TRACK_KEY) return this.trackFn;
  if (prop === TRIGGER_KEY) return this.triggerFn;
  
  // Rest of logic
  if (typeof prop === 'string') {
    scope.trackProp(key, prop);
  }
  return Reflect.get(target, prop, receiver);
}
```

**Expected improvement:** 5-10% faster property access

#### 2. Optimized Property Checks with Set

**Problem:** Repeated `typeof` and string comparisons

**Solution:** Pre-define properties to skip

```typescript
const SKIP_PROPS = new Set([
  'toString', 'valueOf', 'hasOwnProperty',
  'isPrototypeOf', 'propertyIsEnumerable',
  '__proto__', 'constructor',
  'then', 'catch', 'finally', // Promise-like
  'toJSON', 'inspect', // Node.js
]);

get(target, prop, receiver) {
  if (typeof prop === 'symbol' || SKIP_PROPS.has(prop)) {
    return Reflect.get(target, prop, receiver);
  }
  // Tracking logic
}
```

**Expected improvement:** 10-15% faster for non-tracked properties

#### 3. Shallow Proxy Mode

**Problem:** Deep proxies create many nested proxies

**Solution:** Add option for shallow proxying

```typescript
deepProxy<T extends object>(
  target: T, 
  key: string, 
  options?: { shallow?: boolean }
): T {
  if (options?.shallow) {
    return this.proxy(target, key); // Only shallow, no nested proxies
  }
  return this.createDeepProxy(target, key, '', new WeakMap());
}
```

**Usage:**
```typescript
// Fast for flat objects
const config = scope.deepProxy({ name: 'Alice', age: 30 }, 'config', { shallow: true });

// Full reactivity for nested
const user = scope.deepProxy({ name: 'Alice', stats: { health: 100 } }, 'user');
```

**Expected improvement:** 5-8x faster for simple objects (from ~100K to ~500-800K ops/sec)

### Phase 2: Medium Effort (1-2 days)

#### 4. Lazy Proxy Creation

**Problem:** Creates proxies for all objects upfront

**Solution:** Only create proxy on first access

```typescript
get(target, prop, receiver) {
  const value = Reflect.get(target, prop, receiver);
  
  // Don't create proxy for non-object values
  if (value === null || typeof value !== 'object') {
    return value;
  }
  
  // Check cache first
  const cached = this.proxyCache.get(value);
  if (cached) return cached;
  
  // Create and cache on first access
  const proxy = this.createProxy(value);
  this.proxyCache.set(value, proxy);
  return proxy;
}
```

**Expected improvement:** 20-30% faster initialization, 10-15% faster access

#### 5. Read-Only Proxy Mode

**Problem:** Set handler overhead for read-heavy data

**Solution:** Optimize for read-only operations

```typescript
readOnlyProxy<T extends object>(target: T, key: string): T {
  const scope = this;
  return new Proxy(target, {
    get(obj, prop, receiver) {
      if (typeof prop === 'string') {
        scope.trackProp(key, prop);
      }
      return Reflect.get(obj, prop, receiver);
    },
    // No set handler - faster
  });
}
```

**Expected improvement:** 20-30% faster for read-mostly data

#### 6. Optimized Array Mutation Methods

**Problem:** Array method wrapping creates new functions

**Solution:** Pre-bind mutation methods

```typescript
const ARRAY_MUTATION_METHODS = new Set([
  'push', 'pop', 'shift', 'unshift', 'splice',
  'sort', 'reverse', 'fill', 'copyWithin'
]);

get(target, prop, receiver) {
  if (Array.isArray(target) && ARRAY_MUTATION_METHODS.has(prop)) {
    const original = target[prop as keyof Array<unknown>];
    const scope = this.scope;
    
    // Return wrapped method (cached per proxy instance)
    return function(this: unknown[], ...args: unknown[]) {
      const result = original.apply(target, args);
      scope.triggerProp(key, prop as string);
      return result;
    };
  }
  // ... rest
}
```

**Expected improvement:** 15-20% faster array mutations

### Phase 3: Advanced Optimizations (Next sprint)

#### 7. Proxy Pooling

**Problem:** Creating new proxies is expensive

**Solution:** Reuse proxy instances

```typescript
class ProxyPool {
  private pool = new Map<object, object>();
  private maxPoolSize = 100;
  
  get(target: object): object | undefined {
    return this.pool.get(target);
  }
  
  set(target: object, proxy: object) {
    if (this.pool.size >= this.maxPoolSize) {
      this.pool.clear();
    }
    this.pool.set(target, proxy);
  }
}
```

**Expected improvement:** 20-30% faster for frequently accessed objects

#### 8. Selective Tracking (Escape Hatch)

**Problem:** Sometimes you need maximum performance

**Solution:** Allow opting out of tracking

```typescript
const SKIP_TRACK = Symbol('skipTrack');

get(target, prop, receiver) {
  if (prop === SKIP_TRACK) {
    return Reflect.get(target, prop, receiver);
  }
  
  if (typeof prop === 'string') {
    scope.trackProp(key, prop);
  }
  // ...
}
```

**Usage:**
```typescript
// In performance-critical code
const value = obj[SKIP_TRACK].hotProperty; // No tracking
scope.trackProp('key', 'hotProperty'); // Manual tracking
```

**Expected improvement:** Direct access speed when needed

#### 9. Batch Property Tracking

**Problem:** Multiple track calls for same object

**Solution:** Track multiple properties at once

```typescript
trackProps(key: string, props: string[]) {
  if (!this.isInScope()) return;
  const dep = this.dep(key);
  if (dep) dep.depend();
  
  // Track all properties in one operation
  for (const prop of props) {
    this.propDep(key, prop)?.depend();
  }
}
```

**Expected improvement:** 20-30% faster for multiple property access

## Performance Targets

### Current Performance (from benchmarks)
- Proxy read: ~80-100K ops/sec
- Proxy write: ~1.5-1.8M ops/sec
- Direct access: ~16M ops/sec (baseline)
- **Slowdown: 160x**

### Target Performance with Optimizations
- **Phase 1 complete:** 150-200K ops/sec (2x improvement)
- **Phase 2 complete:** 250-300K ops/sec (3x improvement)
- **Phase 3 complete:** 300-400K ops/sec (4x improvement)
- **Shallow proxy mode:** 500-800K ops/sec (5-8x improvement)

### Real-World Impact
Even with 4x improvement, proxies will still be slower than direct access. However:
- For application code: 4x improvement is significant
- For hot paths: Use shallow proxy or read-only mode
- For computed values: Cache them to avoid repeated proxy access
- For rendering: Most frameworks already optimize this

## Why Not Getter/Setter Pattern?

### Issues with Getter/Setter (Why Vue 2 and MobX 4 Switched Away)

1. **Cannot detect new properties**
   ```javascript
   const obj = makeReactive({ name: 'Alice' });
   obj.age = 30;  // Not reactive! No setter defined.
   ```

2. **Array index assignment**
   ```javascript
   const arr = makeReactive([1, 2, 3]);
   arr[0] = 10;  // Not reactive! Need custom array wrapper.
   ```

3. **Property deletion**
   ```javascript
   const obj = makeReactive({ name: 'Alice' });
   delete obj.name;  // Not reactive!
   ```

4. **Dynamic property additions**
   - Must use helper methods: `Vue.set()`, `extendObservable()`
   - Cannot use spread operator: `obj = {...obj, newProp: value}`
   - Cannot use `Object.assign()`

5. **Prototype chain complexity**
   - Hard to make inherited properties reactive
   - Class instances problematic

6. **Memory overhead**
   - Each property needs its own closure
   - Deep objects create many nested closures

### Why MobX 5 and Vue 3 Chose Proxies
- Better developer experience
- Handles all edge cases naturally
- Works with modern JavaScript patterns
- No special methods needed
- ES6 standard feature
- V8 and other engines have optimized proxies

## Implementation Priority

### Phase 1 (Immediate - Today)
1. ✅ Use symbol-based internal keys
2. ✅ Optimize string property checks with Set
3. ✅ Add shallow proxy option

### Phase 2 (This Week)
1. Implement lazy proxy creation
2. Add read-only proxy mode
3. Optimize array methods
4. Improve WeakMap caching strategy

### Phase 3 (Next Sprint)
1. Add proxy pooling
2. Implement selective tracking
3. Add batch tracking
4. Add performance profiling hooks

## Other Optimizations

### Event Emission Performance

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

**Expected improvement:** 10-20% faster

### Tracking Operation Overhead

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

// Use inline check:
track(key) {
  const dep = this.deps.get(key);  // Direct Map access
  if (dep && this.adapter?.isInScope?.() !== false) {
    dep.depend();
  }
}
```

**Expected improvement:** 10-15% faster

### Dependency Management

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

#### C. String key caching
```typescript
// Cache compound keys to avoid repeated string concatenation
const key = compoundKeyCache.get(collection, id, prop) 
  ?? compoundKeyCache.set(collection, id, prop, `${collection}_${id}_${prop}`);
```

## Medium Priority Optimizations

### Batch Triggering

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

### Memory Management

**Optimizations:**
- Implement proper cleanup for removed items
- Use WeakMap where possible for garbage collection
- Provide explicit dispose methods
- Add WeakMap cleanup scheduling

## Development vs Production Builds

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

## Comparison with Other Libraries

### Solid.js
- **Strengths**: Compile-time, zero overhead
- **Trade-offs**: Requires build step, steeper learning curve
- **Lessons**: Compile-time transformations are fastest but not for us

### Preact Signals
- **Strengths**: Simple API, good performance
- **Trade-offs**: Less granular tracking
- **Lessons**: Simplicity can be faster

### Vue 3
- **Strengths**: Granular tracking, good DX
- **Trade-offs**: Proxy overhead
- **Lessons:** Proxies are the right choice for modern JavaScript
- **Decision:** Follow Vue 3's approach

### MobX
- **Strengths**: Action batching, automatic tracking
- **Trade-offs**: Complex API, more magic
- **Lessons:** Batching is important for performance
- **Decision:** MobX 5's proxy approach is our model

## Recommendations

### For Maximum Performance (Without Build Tools):
1. ✅ **Keep proxy API** (industry standard)
2. ✅ **Implement Phase 1 optimizations** (symbol keys, shallow mode)
3. ✅ **Add Phase 2 optimizations** (lazy creation, read-only mode)
4. ✅ **Provide escape hatches** for manual tracking in hot paths

### For Balance of Performance and DX:
1. **Keep proxy API** but optimize it
2. **Add batching** for multiple updates
3. **Provide shallow/read-only modes** for common use cases
4. **Add selective tracking** for performance-critical code

### For Quick Improvements (Today):
1. ✅ Symbol-based internal keys
2. ✅ Optimized property checks with Set
3. ✅ Shallow proxy option
4. Replace `forEach` with `for...of` in emitter
5. Optimize `isInScope()` checks

## Next Steps

1. ✅ **Phase 1 optimizations** (implement today)
2. **Benchmark each optimization** to measure impact
3. **Profile real applications** to identify hot paths
4. **Implement Phase 2** based on Phase 1 results
5. **Consider Phase 3** if needed based on real-world usage

## References

- [Solid.js Compiler](https://github.com/solidjs/solid/tree/main/packages/compiler)
- [Preact Signals](https://preactjs.com/guide/v10/signals/)
- [Vue 3 Reactivity](https://github.com/vuejs/core/tree/main/packages/reactivity)
- [MobX 5](https://mobx.js.org/)
- [Optimizing JavaScript V8](https://v8.dev/blog/elements-kinds)
- [MDN Proxy Documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy)