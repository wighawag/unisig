/**
 * Re-exports from @unisig/svelte.
 *
 * This file exists to provide a single import point for the Svelte adapter.
 * Since @unisig/svelte uses .svelte.ts files, importing from it directly
 * works in .svelte and .svelte.ts files.
 *
 * For plain .ts files, import from this file instead.
 */
export {
	svelteAdapter,
	svelteBundle,
	createTracker,
	effect,
	state,
	ref,
	adapter,
	SvelteDependency,
} from '@unisig/svelte';

// Default export is the adapter
export {default} from '@unisig/svelte';