/**
 * Svelte 5 adapter for unisig.
 * Uses the @signaldb/svelte adapter directly for fine-grained reactivity.
 */
import svelteReactivityAdapter from '@signaldb/svelte'
import type { ReactivityAdapter } from 'unisig'

// Re-export the @signaldb/svelte adapter as a ReactivityAdapter
export const svelteAdapter: ReactivityAdapter = svelteReactivityAdapter