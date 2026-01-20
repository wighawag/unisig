<script lang="ts">
  import { untrack } from 'svelte'
  import { playerStore } from './playerStore'
  import PlayerListItem from './PlayerListItem.svelte'
  
  let renderCount = $state(0)
  
  // Using $derived to automatically track player IDs (collection level)
  const playerIds = $derived.by(() => playerStore.getIds())
  
  // Track renders - use untrack to prevent infinite loop
  $effect(() => {
    playerIds // Read players to track
    untrack(() => {
      renderCount++
    })
  })
</script>

<div class="card">
  <h2>📋 Player List <span class="render-count">(renders: {renderCount})</span></h2>
  <p class="hint">Re-renders when players are added/removed</p>
  
  {#if playerIds.length === 0}
    <p class="empty">No players yet. Add some!</p>
  {:else}
    <ul>
      {#each playerIds as playerId (playerId)}
        <PlayerListItem {playerId} />
      {/each}
    </ul>
  {/if}
</div>

<style>
  .card {
    border: 1px solid #ccc;
    border-radius: 8px;
    padding: 16px;
    margin: 8px;
    background: #f9f9f9;
  }
  h2 {
    margin-top: 0;
    font-size: 1.2em;
  }
  .render-count {
    font-size: 0.7em;
    color: #e91e63;
    font-weight: normal;
  }
  .hint {
    font-size: 0.8em;
    color: #666;
    margin-top: -8px;
  }
  .empty {
    color: #999;
    font-style: italic;
  }
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
</style>