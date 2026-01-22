import {defineConfig} from 'vitest/config';
import {svelte} from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
	plugins: [svelte()],
	test: {
		include: ['test/**/*.spec.svelte.ts'],
		environment: 'happy-dom',
		benchmark: {
			include: ['bench/**/*.bench.svelte.ts'],
		},
	},

	resolve: process.env.VITEST
		? {
				conditions: ['browser'],
			}
		: undefined,
});
