# Performance Benchmarks

This directory contains comprehensive performance benchmarks for the unisig library using Vitest bench.

## Running Benchmarks

### Run all benchmarks
```bash
pnpm bench
```

### Run benchmarks with JSON output (for CI/CD)
```bash
pnpm bench:report
```

## Benchmark Files

### [`Emitter.bench.ts`](src/Emitter.bench.ts)
Benchmarks for the Emitter class (event system):

- **Event Subscription**: Subscribe to events, measuring overhead of different listener counts
- **Event Emission**: Emit events to varying numbers of listeners (1, 10, 100, 1000)
- **Event Unsubscription**: Unsubscribe from events using different methods
- **once() Performance**: One-time listener subscription and auto-unsubscribe
- **hasListeners() and listenerCount()**: Query listener state
- **removeAllListeners()**: Cleanup operations
- **Error Handling**: Compare performance with and without error handlers

### [`Scope.bench.ts`](src/Scope.bench.ts)
Benchmarks for the Scope class (signal tracking):

- **Tracking Operations**: `track()`, `trackItem()`, `trackProp()`, `trackItemProp()`
- **Triggering Operations**: `trigger()`, `triggerItem()`, `triggerProp()`, etc.
- **Dependency Management**: Creating and accessing dependencies
- **Adapter Management**: Setting and checking adapter state
- **Cleanup Operations**: Clearing dependencies
- **Conditional Tracking**: Early return when not in reactive scope
- **Granular Tracking Patterns**: Compare collection, item, and property-level tracking

### [`Tracker.bench.ts`](src/Tracker.bench.ts)
Benchmarks for the Tracker class (combined signals + events):

- **Instantiation**: Creating Tracker instances with/without adapters
- **Event Operations**: Subscribing and emitting events
- **Combined Operations**: Triggering signals and emitting events together
- **Granular Tracking Operations**: Track operations at different granularity levels
- **Dependency Access**: Getting and creating dependencies
- **Adapter Management**: Adapter configuration
- **Real-World Usage Patterns**: Simulate typical store operations
- **High-Frequency Operations**: 1000+ track/trigger cycles

### [`Proxy.bench.ts`](src/Proxy.bench.ts)
Benchmarks for proxy-based auto-tracking:

- **Simple Proxy (Shallow)**: `proxy()` and `itemProxy()` operations
- **Deep Proxy**: `deepProxy()` and `deepItemProxy()` with nested objects
- **Array Proxy Operations**: Array mutations and iterations through proxies
- **Proxy Identity Preservation**: WeakMap cache performance
- **Tracker Proxy Methods**: Tracker's proxy wrapper methods
- **Proxy with Complex Objects**: Arrays of objects, large objects
- **Performance Comparison**: Direct access vs proxy access
- **Edge Cases**: Date, RegExp, Map objects (not proxied)

### [`standalone.bench.ts`](src/standalone.bench.ts)
Benchmarks for standalone state (withAdapter, withAdapterRef):

- **withAdapter() Factory**: Creating state factories
- **Primitive State (Ref)**: Number, string, boolean state operations
- **Object State**: Simple and nested object operations
- **Array State**: Array mutations and iterations
- **withAdapterRef() Factory**: Creating ref factories
- **Ref Operations**: Ref creation, read, write operations
- **isRef() Utility**: Type checking performance
- **Real-World Usage Patterns**: Counter, todo list, user profile, shopping cart
- **Performance: State Creation**: Creating many state instances
- **Complex State Scenarios**: Nested structures, large objects
- **Memory and Reuse Patterns**: State instance reuse

## Understanding Benchmark Results

Benchmarks show:
- **hz**: Operations per second (higher is better)
- **min/max**: Fastest/slowest execution times
- **mean**: Average execution time
- **p75/p99/p995/p999**: Percentiles (75%, 99%, 99.5%, 99.9%)
- **rme**: Relative margin of error
- **samples**: Number of benchmark iterations

Comparisons show which operations are faster and by how much (e.g., "2.5x faster").

## Key Performance Insights

### Emitter
- Emission to no listeners is fastest (early return optimization)
- Adding listeners has minimal overhead
- Error handler adds ~7% overhead to emissions

### Scope
- Tracking outside reactive scope is essentially free (early return)
- Dependency caching improves repeated access
- Granular tracking (item/property) has similar overhead to collection tracking

### Tracker
- Instantiation is very fast (< 1µs)
- Combined signal + event operations are efficient
- Real-world patterns show excellent performance characteristics

### Proxies
- Direct property access is fastest (baseline)
- Proxy overhead is minimal for most operations
- WeakMap caching maintains identity efficiently
- Array mutations through proxies perform well

### Standalone State
- Factory creation is fast
- Primitive state operations are extremely efficient
- Object and array state scales well with size
- State reuse is more efficient than creating many instances

## Performance Goals

The library is designed to be:

1. **Fast**: Minimal overhead for reactive operations
2. **Scalable**: Performance doesn't degrade with more listeners/dependencies
3. **Efficient**: Early returns and caching optimizations
4. **Predictable**: Consistent performance across operations

## Contributing

When adding new features:

1. Add benchmarks for the new operations
2. Compare against existing benchmarks
3. Ensure performance doesn't regress
4. Document any performance characteristics

When optimizing:

1. Run benchmarks before and after changes
2. Focus on hot paths (frequently called operations)
3. Consider trade-offs (memory vs speed)
4. Update this documentation with insights