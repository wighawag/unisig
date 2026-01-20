<script lang="ts">
	import {untrack} from 'svelte';
	import {playerStore} from './playerStore';

	interface Props {
		playerId: string;
	}

	let {playerId}: Props = $props();

	let renderCount = $state(0);
	let editing = $state(false);
	let inputValue = $state('');

	// This ONLY tracks the name property
	const name = $derived.by(() => playerStore.getName(playerId));

	// Track renders - use untrack to prevent infinite loop
	$effect(() => {
		name; // Read name to track
		untrack(() => {
			renderCount++;
		});
	});

	function startEdit() {
		inputValue = name ?? '';
		editing = true;
	}

	function save() {
		if (inputValue.trim()) {
			playerStore.updateName(playerId, inputValue.trim());
		}
		editing = false;
	}
</script>

<div class="name-card">
	<span class="label">Name:</span>
	{#if editing}
		<input
			bind:value={inputValue}
			onkeydown={(e) => e.key === 'Enter' && save()}
			onblur={save}
		/>
	{:else}
		<span class="value">{name ?? 'N/A'}</span>
		<button onclick={startEdit}>✏️</button>
	{/if}
	<span class="render-count">(renders: {renderCount})</span>
</div>

<style>
	.name-card {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px;
		background: #fff3e0;
		border-radius: 4px;
		margin: 4px 0;
	}
	.label {
		font-weight: bold;
		color: #f57c00;
	}
	.value {
		font-size: 1.1em;
		min-width: 80px;
	}
	.render-count {
		font-size: 0.7em;
		color: #e91e63;
	}
	input {
		padding: 4px;
		border: 1px solid #ccc;
		border-radius: 4px;
		width: 100px;
	}
	button {
		padding: 2px 6px;
		cursor: pointer;
		background: none;
		border: none;
	}
</style>
