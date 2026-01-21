/**
 * ScoreTracker - A PLAIN TypeScript class demonstrating the use of
 * framework-agnostic effects from unisig.
 *
 * This file is NOT a .svelte.ts file - it's a regular .ts file!
 * Yet it can use reactive effects through the adapter's effect function.
 */

import {effect} from './svelteAdapter.svelte';
import {playerStore} from './playerStore';

/**
 * Event emitter for notifying UI about changes
 */
type ScoreTrackerListener = (data: ScoreTrackerData) => void;

export interface ScoreTrackerData {
	totalScore: number;
	playerCount: number;
	highestScore: number;
	highestScorerId: string | null;
	averageScore: number;
	lastUpdate: Date;
	effectRunCount: number;
}

/**
 * A plain TypeScript class that tracks player scores using reactive effects.
 *
 * This demonstrates that you can use unisig's effect function in regular
 * .ts files - you don't need .svelte.ts files for every reactive class!
 *
 * The effect automatically re-runs when:
 * - Players are added or removed
 * - Any player's score changes
 */
export class ScoreTracker {
	private data: ScoreTrackerData = {
		totalScore: 0,
		playerCount: 0,
		highestScore: 0,
		highestScorerId: null,
		averageScore: 0,
		lastUpdate: new Date(),
		effectRunCount: 0,
	};

	private listeners = new Set<ScoreTrackerListener>();
	private cleanup: (() => void) | null = null;

	constructor() {
		// Start tracking - the effect function works in plain .ts files!
		this.startTracking();
	}

	/**
	 * Start the reactive effect that tracks player scores.
	 * This effect automatically re-runs when any tracked dependency changes.
	 */
	private startTracking(): void {
		// This is the magic: effect() works in a plain .ts file!
		// It automatically tracks dependencies from playerStore calls.
		this.cleanup = effect(() => {
			// Get all players - this tracks the 'players' collection
			const players = playerStore.getAll();

			// Calculate statistics
			const totalScore = players.reduce((sum, p) => sum + p.score, 0);
			const playerCount = players.length;
			const averageScore = playerCount > 0 ? totalScore / playerCount : 0;

			// Find highest scorer
			let highestScore = 0;
			let highestScorerId: string | null = null;

			for (const player of players) {
				// This tracks individual player scores
				const score = playerStore.getScore(player.id);
				if (score !== undefined && score > highestScore) {
					highestScore = score;
					highestScorerId = player.id;
				}
			}

			// Update our data
			this.data = {
				totalScore,
				playerCount,
				highestScore,
				highestScorerId,
				averageScore,
				lastUpdate: new Date(),
				effectRunCount: this.data.effectRunCount + 1,
			};

			// Log to console to show the effect is running
			console.log(
				'📊 ScoreTracker effect ran!',
				`Run #${this.data.effectRunCount}:`,
				{
					totalScore,
					playerCount,
					highestScorerId,
				},
			);

			// Notify listeners
			this.notifyListeners();
		});
	}

	/**
	 * Get current tracker data
	 */
	getData(): ScoreTrackerData {
		return this.data;
	}

	/**
	 * Subscribe to data changes
	 */
	subscribe(listener: ScoreTrackerListener): () => void {
		this.listeners.add(listener);
		// Call immediately with current data
		listener(this.data);
		return () => this.listeners.delete(listener);
	}

	/**
	 * Stop tracking and clean up
	 */
	destroy(): void {
		if (this.cleanup) {
			this.cleanup();
			this.cleanup = null;
			console.log('📊 ScoreTracker destroyed');
		}
		this.listeners.clear();
	}

	private notifyListeners(): void {
		for (const listener of this.listeners) {
			listener(this.data);
		}
	}
}

// Export a singleton instance
// In a real app, you might want to create instances as needed
let scoreTrackerInstance: ScoreTracker | null = null;

/**
 * Get the singleton ScoreTracker instance.
 * Creates it on first access.
 */
export function getScoreTracker(): ScoreTracker {
	if (!scoreTrackerInstance) {
		scoreTrackerInstance = new ScoreTracker();
	}
	return scoreTrackerInstance;
}

/**
 * Reset the singleton (useful for testing or reinitialization)
 */
export function resetScoreTracker(): void {
	if (scoreTrackerInstance) {
		scoreTrackerInstance.destroy();
		scoreTrackerInstance = null;
	}
}