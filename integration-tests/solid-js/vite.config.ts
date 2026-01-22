import {defineConfig} from 'vitest/config';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
	plugins: [solidPlugin()],
	test: {
		include: ['test/**/*.spec.ts'],
		environment: 'jsdom',
	},
	resolve: {
		conditions: ['development', 'browser'],
	},
});
