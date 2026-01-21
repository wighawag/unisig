<script lang="ts">
	import {onMount, onDestroy} from 'svelte';
	import {
		getScoreTracker,
		resetScoreTracker,
		type ScoreTrackerData,
	} from './ScoreTracker';

	// The data from our plain TypeScript ScoreTracker class
	let data = $state<ScoreTrackerData | null>(null);
	let unsubscribe: (() => void) | null = null;

	onMount(() => {
		// Get the singleton ScoreTracker instance
		const tracker = getScoreTracker();

		// Subscribe to updates
		unsubscribe = tracker.subscribe((newData) => {
			data = newData;
		});
	});

	onDestroy(() => {
		unsubscribe?.();
		// Optionally reset on destroy
		// resetScoreTracker();
	});
</script>

<div class="score-tracker-panel">
	<h3>📊 Score Tracker</h3>
	<p class="subtitle">
		<em>This data comes from a plain .ts file using effect()</em>
	</p>

	{#if data}
		<div class="stats">
			<div class="stat">
				<span class="label">Total Score</span>
				<span class="value">{data.totalScore}</span>
			</div>
			<div class="stat">
				<span class="label">Player Count</span>
				<span class="value">{data.playerCount}</span>
			</div>
			<div class="stat">
				<span class="label">Average Score</span>
				<span class="value">{data.averageScore.toFixed(1)}</span>
			</div>
			<div class="stat">
				<span class="label">Highest Score</span>
				<span class="value">
					{data.highestScore}
					{#if data.highestScorerId}
						<small>({data.highestScorerId})</small>
					{/if}
				</span>
			</div>
			<div class="stat highlight">
				<span class="label">Effect Run Count</span>
				<span class="value">{data.effectRunCount}</span>
			</div>
		</div>

		<p class="note">
			👆 Watch the "Effect Run Count" - it increments whenever the effect
			re-runs!<br />
			Try adding players, changing scores, or removing players.
		</p>

		<p class="last-update">
			Last update: {data.lastUpdate.toLocaleTimeString()}
		</p>
	{:else}
		<p>Loading...</p>
	{/if}
</div>

<style>
	.score-tracker-panel {
		background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
		border: 1px solid #81c784;
		border-radius: 12px;
		padding: 16px;
		margin-bottom: 16px;
	}

	h3 {
		margin: 0 0 4px 0;
		color: #2e7d32;
	}

	.subtitle {
		margin: 0 0 16px 0;
		color: #558b2f;
		font-size: 0.85em;
	}

	.stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: 12px;
	}

	.stat {
		background: white;
		padding: 12px;
		border-radius: 8px;
		text-align: center;
	}

	.stat.highlight {
		background: #fff3e0;
		border: 2px solid #ff9800;
	}

	.label {
		display: block;
		font-size: 0.75em;
		color: #666;
		margin-bottom: 4px;
	}

	.value {
		display: block;
		font-size: 1.5em;
		font-weight: bold;
		color: #333;
	}

	.value small {
		font-size: 0.5em;
		font-weight: normal;
		color: #666;
	}

	.note {
		margin-top: 16px;
		padding: 12px;
		background: rgba(255, 255, 255, 0.7);
		border-radius: 8px;
		font-size: 0.9em;
		color: #555;
		line-height: 1.5;
	}

	.last-update {
		margin-bottom: 0;
		font-size: 0.75em;
		color: #888;
		text-align: right;
	}
</style>