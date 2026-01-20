<script lang="ts">
  import { untrack } from 'svelte'
  import { playerStore } from './playerStore'
  
  interface Props {
    playerId: string
  }
  
  let { playerId }: Props = $props()
  
  let renderCount = $state(0)
  
  // This ONLY tracks the level property
  const level = $derived.by(() => playerStore.getLevel(playerId))
  
  // Track renders - use untrack to prevent infinite loop
  $effect(() => {
    level // Read level to track
    untrack(() => {
      renderCount++
    })
  })
</script>

<div class="level-card">
  <span class="label">Level:</span>
  <span class="value">{level ?? 'N/A'}</span>
  <span class="render-count">(renders: {renderCount})</span>
  <button onclick={() => playerStore.levelUp(playerId)}>⬆️ Level Up</button>
</div>

<style>
  .level-card {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    background: #e8f5e9;
    border-radius: 4px;
    margin: 4px 0;
  }
  .label {
    font-weight: bold;
    color: #388e3c;
  }
  .value {
    font-size: 1.2em;
    min-width: 30px;
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