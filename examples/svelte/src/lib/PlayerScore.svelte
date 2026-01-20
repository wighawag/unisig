<script lang="ts">
	import {untrack} from 'svelte';
	import {playerStore} from './playerStore';

	interface Props {
		playerId: string;
	}

	let {playerId}: Props = $props();

	let renderCount = $state(0);

	// This ONLY tracks the score property
	const score = $derived.by(() => playerStore.getScore(playerId));

	// Track renders - use untrack to prevent infinite loop
	$effect(() => {
		score; // Read score to track
		untrack(() => {
			renderCount++;
		});
	});
</script>

<div class="score-card">
	<span class="label">Score:</span>
	<span class="value">{score ?? 'N/A'}</span>
	<span class="render-count">(renders: {renderCount})</span>
	<button onclick={() => playerStore.incrementScore(playerId, 10)}>+10</button>
</div>

<style>
	.score-card {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px;
		background: #e3f2fd;
		border-radius: 4px;
		margin: 4px 0;
	}
	.label {
		font-weight: bold;
		color: #1976d2;
	}
	.value {
		font-size: 1.2em;
		min-width: 50px;
	}
	.render-count {
		font-size: 0.7em;
		color: #e91e63;
	}
	button {
		padding: 4px 8px;
		cursor: pointer;
	}
</style>
