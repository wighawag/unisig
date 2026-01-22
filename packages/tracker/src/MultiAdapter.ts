import type {Dependency, ScopeAdapter} from '@unisig/scope';

/**
 * A composite dependency that wraps multiple underlying dependencies.
 *
 * When `depend()` is called, it tracks with all underlying dependencies.
 * When `notify()` is called, it notifies all underlying dependencies.
 *
 * This enables a single key to be tracked by multiple signal runtimes simultaneously.
 *
 * @example
 * ```ts
 * const deps = [
 *   solidAdapter.create(), // Solid.js signal
 *   preactAdapter.create(), // Preact signal
 *   mobxAdapter.create(),  // MobX observable
 * ]
 * const composite = new CompositeDependency(deps)
 *
 * // Track with all runtimes
 * composite.depend()
 *
 * // Notify all runtimes
 * composite.notify()
 * ```
 */
export class CompositeDependency implements Dependency {
	private readonly dependencies: Dependency[];

	/**
	 * Create a composite dependency.
	 *
	 * @param dependencies - Array of dependencies to wrap
	 */
	constructor(dependencies: Dependency[]) {
		this.dependencies = dependencies;
	}

	/**
	 * Call `depend()` on all underlying dependencies.
	 *
	 * This registers the current reactive scope with all signal runtimes.
	 */
	depend(): void {
		for (const dep of this.dependencies) {
			dep.depend();
		}
	}

	/**
	 * Call `notify()` on all underlying dependencies.
	 *
	 * This triggers re-execution of all tracked effects/computeds across all runtimes.
	 */
	notify(): void {
		for (const dep of this.dependencies) {
			dep.notify();
		}
	}

	/**
	 * Get the underlying dependencies (for testing/debugging).
	 */
	getDependencies(): readonly Dependency[] {
		return this.dependencies;
	}
}

/**
 * A reactivity adapter that manages multiple underlying adapters.
 *
 * This allows you to use multiple signal libraries simultaneously with a single Tracker.
 * Each key will create a `CompositeDependency` that wraps dependencies from all adapters.
 *
 * @example
 * ```ts
 * import { withAdapter } from 'unisig'
 * import { solidAdapter } from '@unisig/solid'
 * import { svelteAdapter } from '@unisig/svelte'
 *
 * const multiAdapter = new MultiAdapter([
 *   solidAdapter,
 *   svelteAdapter,
 * ])
 *
 * const reactive = withAdapter(multiAdapter)
 *
 * // Now reactive() creates signals that work with Solid, Preact, and MobX simultaneously
 * const count = reactive(0)
 *
 * // In Solid.js component:
 * createEffect(() => console.log(count())) // Re-runs when count changes
 *
 * // In Preact component:
 * const value = useSignal(() => count()) // Re-renders when count changes
 *
 * // In MobX reaction:
 * reaction(() => count(), (value) => console.log(value)) // Runs when count changes
 * ```
 */
export class MultiAdapter implements ScopeAdapter {
	private readonly adapters: ScopeAdapter[];

	/**
	 * Create a multi-adapter from an array of adapters.
	 *
	 * @param adapters - Array of reactivity adapters to combine
	 *
	 * @example
	 * ```ts
	 * const multiAdapter = new MultiAdapter([
	 *   solidAdapter,
	 *   preactAdapter,
	 * ])
	 * ```
	 */
	constructor(adapters: ScopeAdapter[]) {
		if (!Array.isArray(adapters)) {
			throw new TypeError('MultiAdapter requires an array of adapters');
		}
		if (adapters.length === 0) {
			throw new Error('MultiAdapter requires at least one adapter');
		}
		this.adapters = adapters;
	}

	/**
	 * Create a composite dependency that wraps dependencies from all adapters.
	 *
	 * This method creates one dependency from each adapter and wraps them
	 * in a `CompositeDependency` that delegates to all of them.
	 *
	 * @returns A composite dependency
	 */
	create(): Dependency {
		const dependencies = this.adapters.map((adapter) => adapter.create());
		return new CompositeDependency(dependencies);
	}

	/**
	 * Check if currently inside any reactive scope.
	 *
	 * Returns true if ANY adapter reports being in scope. This ensures
	 * tracking happens when at least one runtime is active.
	 *
	 * Adapters without an `isInScope` method are assumed to always be in scope.
	 *
	 * @returns true if any adapter is in a reactive scope
	 */
	isInScope(): boolean {
		// If any adapter is in scope (or has no isInScope method), we should track
		return this.adapters.some((adapter) => {
			// If adapter has no isInScope method, assume always in scope
			if (!adapter.isInScope) return true;
			return adapter.isInScope();
		});
	}

	/**
	 * Register a cleanup callback for when the reactive scope ends.
	 *
	 * Registers the callback with all adapters that support onDispose.
	 *
	 * @param callback - Function to call when the scope is disposed
	 * @param dep - The dependency this cleanup is associated with
	 */
	onDispose(callback: () => void, dep: Dependency): void {
		// Only register with adapters that support onDispose
		// and only if the dependency is a CompositeDependency
		if (!(dep instanceof CompositeDependency)) {
			return;
		}

		const dependencies = dep.getDependencies();
		for (let i = 0; i < dependencies.length; i++) {
			const adapter = this.adapters[i];
			const subDep = dependencies[i];
			if (adapter.onDispose) {
				adapter.onDispose(callback, subDep);
			}
		}
	}

	/**
	 * Get the underlying adapters (for testing/debugging).
	 */
	getAdapters(): readonly ScopeAdapter[] {
		return this.adapters;
	}
}

/**
 * Helper function to create a MultiAdapter with a more concise API.
 *
 * @param adapters - Array of scope adapters to combine
 * @returns A new MultiAdapter instance
 *
 * @example
 * ```ts
 * import { createMultiAdapter } from '@unisig/tracker'
 * import { solidAdapter } from '@unisig/solid'
 * import { svelteAdapter } from '@unisig/svelte'
 *
 * const multiAdapter = createMultiAdapter(solidAdapter, svelteAdapter)
 * ```
 */
export function createMultiAdapter(...adapters: ScopeAdapter[]): MultiAdapter {
	return new MultiAdapter(adapters);
}
