<script lang="ts">
	import {playerStore} from './playerStore';

	interface Props {
		playerId: string;
	}

	const {playerId}: Props = $props();

	// Using deep proxy - property access is automatically tracked
	const player = $derived.by(() => playerStore.get(playerId));
</script>

{#if player}
	<li>
		{player.name} - Score: {player.score}, Level: {player.level}
		<button class="small" onclick={() => playerStore.remove(playerId)}>×</button
		>
	</li>
{/if}

<style>
	li {
		padding: 4px 0;
		display: flex;
		align-items: center;
		gap: 8px;
		color: #333;
	}
	button.small {
		padding: 2px 6px;
		font-size: 0.8em;
		cursor: pointer;
	}
</style>
