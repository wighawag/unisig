import {defineConfig} from 'vitest/config';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
	plugins: [solidPlugin()],
	test: {
		include: ['test/**/*.spec.ts'],
		environment: 'jsdom',
		benchmark: {
			include: ['bench/**/*.bench.ts'],
		},
	},
	resolve: process.env.VITEST
		? {
				conditions: ['browser'],
			}
		: {
				conditions: ['development', 'browser'],
			},
});
