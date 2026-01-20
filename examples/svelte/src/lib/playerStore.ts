import {
	Reactive,
	type ReactivityAdapter,
	type Listener,
	type Unsubscribe,
} from 'unisig';
import {svelteAdapter} from './svelteAdapter.svelte';

export interface Player {
	id: string;
	name: string;
	score: number;
	level: number;
}

type PlayerEvents = {
	'player:added': Player;
	'player:removed': string;
	'player:scored': {id: string; score: number};
	'player:levelUp': {id: string; level: number};
	'player:renamed': {id: string; name: string};
};

/**
 * A player store demonstrating all levels of reactivity:
 * - Collection level (all players)
 * - Item level (specific player)
 * - Property level (specific property of a player)
 */
class PlayerStore {
	private $: Reactive<PlayerEvents>;

	constructor(adapter?: ReactivityAdapter) {
		this.$ = new Reactive<PlayerEvents>(adapter);
	}
	private players = new Map<string, Player>();

	/**
	 * Configure the reactivity adapter.
	 * Call this once when setting up the store.
	 */
	setAdapter(adapter: ReactivityAdapter) {
		this.$.setAdapter(adapter);
	}

	/**
	 * Subscribe to events
	 */
	on<K extends keyof PlayerEvents>(
		event: K,
		listener: Listener<PlayerEvents[K]>,
	): Unsubscribe {
		return this.$.on(event, listener);
	}

	// ==================== COLLECTION LEVEL ====================

	/**
	 * Get all player IDs.
	 * Re-runs when players are added or removed.
	 * Use this for iterating and pass IDs to get() for each item.
	 */
	getIds(): string[] {
		this.$.track('players');
		return [...this.players.keys()];
	}

	/**
	 * Get all players with deep proxies.
	 * Each player's property access is tracked.
	 * Re-runs when players are added or removed.
	 */
	getAll(): Player[] {
		this.$.track('players');
		return [...this.players.values()].map((player) =>
			this.$.deepItemProxy(player, 'players', player.id),
		);
	}

	/**
	 * Get player count.
	 * Re-runs when players are added or removed.
	 */
	getCount(): number {
		this.$.track('players');
		return this.players.size;
	}

	// ==================== ITEM LEVEL ====================

	/**
	 * Get a specific player with deep proxy.
	 * Property access is automatically tracked at any nesting level.
	 * Re-runs when this player changes OR is removed.
	 */
	get(id: string): Player | undefined {
		this.$.trackItem('players', id);
		const player = this.players.get(id);
		return player ? this.$.deepItemProxy(player, 'players', id) : undefined;
	}

	/**
	 * Get a raw player object (snapshot, no tracking).
	 * Use this when you need the actual data without reactivity.
	 */
	getRaw(id: string): Player | undefined {
		return this.players.get(id);
	}

	// ==================== PROPERTY LEVEL ====================

	/**
	 * Get only a player's score.
	 * ONLY re-runs when this specific player's score changes.
	 */
	getScore(id: string): number | undefined {
		this.$.trackItemProp('players', id, 'score');
		return this.players.get(id)?.score;
	}

	/**
	 * Get only a player's name.
	 * ONLY re-runs when this specific player's name changes.
	 */
	getName(id: string): string | undefined {
		this.$.trackItemProp('players', id, 'name');
		return this.players.get(id)?.name;
	}

	/**
	 * Get only a player's level.
	 * ONLY re-runs when this specific player's level changes.
	 */
	getLevel(id: string): number | undefined {
		this.$.trackItemProp('players', id, 'level');
		return this.players.get(id)?.level;
	}

	// ==================== MUTATIONS ====================

	/**
	 * Add a new player.
	 * Triggers collection watchers.
	 */
	add(player: Player): void {
		this.players.set(player.id, player);
		this.$.triggerAdd('players', 'player:added', player);
	}

	/**
	 * Remove a player.
	 * Triggers item watchers, collection watchers, and cleans up.
	 */
	remove(id: string): void {
		if (!this.players.has(id)) return;
		this.players.delete(id);
		this.$.triggerRemove('players', id, 'player:removed', id);
	}

	/**
	 * Update a player's score.
	 * ONLY triggers score watchers, not name or level watchers.
	 */
	updateScore(id: string, score: number): void {
		const player = this.players.get(id);
		if (!player) return;
		player.score = score;
		this.$.triggerItemProp('players', id, 'score', 'player:scored', {
			id,
			score,
		});
	}

	/**
	 * Increment a player's score.
	 * ONLY triggers score watchers.
	 */
	incrementScore(id: string, amount: number = 1): void {
		const player = this.players.get(id);
		if (!player) return;
		player.score += amount;
		this.$.triggerItemProp('players', id, 'score', 'player:scored', {
			id,
			score: player.score,
		});
	}

	/**
	 * Update a player's name.
	 * ONLY triggers name watchers, not score or level watchers.
	 */
	updateName(id: string, name: string): void {
		const player = this.players.get(id);
		if (!player) return;
		player.name = name;
		this.$.triggerItemProp('players', id, 'name', 'player:renamed', {id, name});
	}

	/**
	 * Update a player's level.
	 * ONLY triggers level watchers, not score or name watchers.
	 */
	updateLevel(id: string, level: number): void {
		const player = this.players.get(id);
		if (!player) return;
		player.level = level;
		this.$.triggerItemProp('players', id, 'level', 'player:levelUp', {
			id,
			level,
		});
	}

	/**
	 * Level up a player.
	 * ONLY triggers level watchers.
	 */
	levelUp(id: string): void {
		const player = this.players.get(id);
		if (!player) return;
		player.level++;
		this.$.triggerItemProp('players', id, 'level', 'player:levelUp', {
			id,
			level: player.level,
		});
	}

	/**
	 * Update entire player (multiple properties).
	 * Triggers item watchers (and all property watchers for that item).
	 */
	update(id: string, changes: Partial<Omit<Player, 'id'>>): void {
		const player = this.players.get(id);
		if (!player) return;
		Object.assign(player, changes);
		this.$.triggerItem('players', id);
	}

	/**
	 * Clear all players.
	 */
	clear(): void {
		const ids = [...this.players.keys()];
		for (const id of ids) {
			this.remove(id);
		}
	}
}

// Export singleton instance with adapter already configured
export const playerStore = new PlayerStore(svelteAdapter);
