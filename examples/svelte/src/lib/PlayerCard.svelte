<script lang="ts">
  import { playerStore } from './playerStore'
  import PlayerScore from './PlayerScore.svelte'
  import PlayerName from './PlayerName.svelte'
  import PlayerLevel from './PlayerLevel.svelte'
  
  interface Props {
    playerId: string
  }
  
  let { playerId }: Props = $props()
</script>

<div class="player-card">
  <h3>Player: {playerId}</h3>
  <p class="hint">Each property has its own render count - watch them!</p>
  
  <div class="properties">
    <PlayerName {playerId} />
    <PlayerScore {playerId} />
    <PlayerLevel {playerId} />
  </div>
  
  <div class="actions">
    <button class="danger" onclick={() => playerStore.remove(playerId)}>
      🗑️ Remove Player
    </button>
  </div>
</div>

<style>
  .player-card {
    border: 2px solid #673ab7;
    border-radius: 12px;
    padding: 16px;
    margin: 12px 0;
    background: white;
  }
  h3 {
    margin-top: 0;
    color: #673ab7;
  }
  .hint {
    font-size: 0.8em;
    color: #666;
    margin-top: -8px;
    margin-bottom: 12px;
  }
  .properties {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .actions {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #eee;
  }
  .danger {
    background: #f44336;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
  }
  .danger:hover {
    background: #d32f2f;
  }
</style>