<script lang="ts">
	import {onMount} from 'svelte';
	import {playerStore} from './lib/playerStore';
	import PlayerList from './lib/PlayerList.svelte';
	import PlayerCard from './lib/PlayerCard.svelte';

	// Track selected player
	let selectedPlayerId = $state<string | null>(null);

	// Initialize players on mount
	onMount(() => {
		console.log(`mount`);

		// Add some initial players
		playerStore.add({id: 'p1', name: 'Alice', score: 100, level: 5});
		playerStore.add({id: 'p2', name: 'Bob', score: 250, level: 8});
		playerStore.add({id: 'p3', name: 'Charlie', score: 50, level: 2});

		// Subscribe to events
		playerStore.on('player:added', (player) => {
			console.log('🎮 Player added:', player.name);
		});

		playerStore.on('player:scored', ({id, score}) => {
			console.log('🎯 Score updated:', id, '->', score);
		});

		playerStore.on('player:levelUp', ({id, level}) => {
			console.log('⬆️ Level up:', id, '->', level);
		});
	});

	// Get player IDs for selection
	const playerIds = $derived.by(() => playerStore.getIds());

	// Auto-reset selection when selected player is removed
	$effect(() => {
		if (selectedPlayerId && !playerStore.get(selectedPlayerId)) {
			selectedPlayerId = null;
		}
	});

	// Add new player
	let newPlayerName = $state('');
	function addPlayer() {
		if (!newPlayerName.trim()) return;
		const id = 'p' + Date.now();
		playerStore.add({
			id,
			name: newPlayerName.trim(),
			score: 0,
			level: 1,
		});
		newPlayerName = '';
	}
</script>

<main>
	<h1>🎮 unisig Svelte Demo</h1>
	<p class="subtitle">
		Demonstrating fine-grained reactivity with property-level tracking
	</p>

	<div class="layout">
		<div class="sidebar">
			<PlayerList />

			<div class="add-player">
				<h3>Add Player</h3>
				<input
					bind:value={newPlayerName}
					placeholder="Player name"
					onkeydown={(e) => e.key === 'Enter' && addPlayer()}
				/>
				<button onclick={addPlayer}>Add</button>
			</div>

			<div class="select-player">
				<h3>Select Player to Inspect</h3>
				{#if playerIds.length === 0}
					<p class="empty">No players available</p>
				{:else}
					<div class="player-buttons">
						{#each playerIds as id}
							<button
								class:selected={selectedPlayerId === id}
								onclick={() => (selectedPlayerId = id)}
							>
								{id}
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<div class="main-content">
			{#if selectedPlayerId}
				<PlayerCard playerId={selectedPlayerId} />

				<div class="explanation">
					<h3>🔬 What's happening?</h3>
					<ul>
						<li>
							<strong>Each property has its own render count</strong> - Watch them
							carefully!
						</li>
						<li>Click <strong>+10</strong> on Score - only Score re-renders</li>
						<li>Click <strong>Level Up</strong> - only Level re-renders</li>
						<li>Edit the <strong>Name</strong> - only Name re-renders</li>
						<li>
							The Player List only re-renders when you <strong
								>add/remove</strong
							> players
						</li>
					</ul>
					<p class="note">
						This granular reactivity is achieved using <code
							>trackItemProp()</code
						>
						and
						<code>triggerItemProp()</code> - each property has its own signal!
					</p>
				</div>
			{:else}
				<div class="placeholder">
					<p>
						👈 Select a player from the list to see property-level reactivity in
						action
					</p>
				</div>
			{/if}
		</div>
	</div>

	<footer>
		<p>Check the browser console for event logs!</p>
	</footer>
</main>

<style>
	button {
		color: black;
	}
	:global(body) {
		font-family:
			-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu,
			sans-serif;
		margin: 0;
		padding: 20px;
		background: #f5f5f5;
	}

	main {
		max-width: 1000px;
		margin: 0 auto;
	}

	h1 {
		color: #673ab7;
		margin-bottom: 0;
	}

	.subtitle {
		color: #666;
		margin-top: 4px;
		margin-bottom: 24px;
	}

	.layout {
		display: grid;
		grid-template-columns: 300px 1fr;
		gap: 20px;
	}

	.sidebar {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.add-player,
	.select-player {
		background: white;
		border: 1px solid #ddd;
		border-radius: 8px;
		padding: 16px;
	}

	.add-player h3,
	.select-player h3 {
		margin-top: 0;
		font-size: 1em;
		color: #333;
	}

	.add-player input {
		width: 100%;
		padding: 8px;
		border: 1px solid #ccc;
		border-radius: 4px;
		margin-bottom: 8px;
		box-sizing: border-box;
	}

	.add-player button {
		width: 100%;
		padding: 8px;
		background: #673ab7;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
	}

	.add-player button:hover {
		background: #5e35b1;
	}

	.player-buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.player-buttons button {
		padding: 8px 12px;
		border: 1px solid #ccc;
		border-radius: 4px;
		background: white;
		cursor: pointer;
	}

	.player-buttons button:hover {
		background: #f0f0f0;
	}

	.player-buttons button.selected {
		background: #673ab7;
		color: white;
		border-color: #673ab7;
	}

	.main-content {
		min-height: 400px;
	}

	.placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 300px;
		background: white;
		border: 2px dashed #ccc;
		border-radius: 12px;
		color: #666;
		font-size: 1.1em;
	}

	.explanation {
		background: #f3e5f5;
		border-radius: 8px;
		padding: 16px;
		margin-top: 16px;
	}

	.explanation h3 {
		margin-top: 0;
		color: #673ab7;
	}

	.explanation ul {
		margin: 0;
		padding-left: 20px;
	}

	.explanation li {
		margin: 8px 0;
	}

	.explanation .note {
		margin-top: 12px;
		padding: 8px;
		background: white;
		border-radius: 4px;
		font-size: 0.9em;
	}

	.explanation code {
		background: #e8e8e8;
		padding: 2px 6px;
		border-radius: 3px;
		font-size: 0.9em;
	}

	.empty {
		color: #999;
		font-style: italic;
	}

	footer {
		margin-top: 24px;
		text-align: center;
		color: #666;
		font-size: 0.9em;
	}
</style>
