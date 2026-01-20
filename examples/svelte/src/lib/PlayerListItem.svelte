<script lang="ts">
  import { playerStore } from './playerStore'
  
  interface Props {
    playerId: string
  }
  
  const { playerId }: Props = $props()
  
  // Using specific property getters for fine-grained reactivity
  // Each property is tracked independently
  const name = $derived.by(() => playerStore.getName(playerId))
  const score = $derived.by(() => playerStore.getScore(playerId))
  const level = $derived.by(() => playerStore.getLevel(playerId))
</script>

{#if name !== undefined}
  <li>
    {name} - Score: {score}, Level: {level}
    <button class="small" onclick={() => playerStore.remove(playerId)}>×</button>
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