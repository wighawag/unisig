import {createTrackerFactory} from '@unisig/tracker';
import svelteAdapter from '@unisig/svelte';
import {unisig} from 'unisig';

export type {Tracker, Unsubscribe, Listener} from '@unisig/tracker';

export const {effect} = unisig(svelteAdapter);

export const createTracker = createTrackerFactory(svelteAdapter);
