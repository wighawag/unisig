import {createTrackerFactory} from '@unisig/tracker';
import svelteAdapter from '@unisig/svelte';
import {createReactivityBundle} from 'unisig';

export type {Tracker, Unsubscribe} from '@unisig/tracker';
export type {ReactivityAdapter, Listener} from 'unisig';

export const {effect} = createReactivityBundle(svelteAdapter);

export const createTracker = createTrackerFactory(svelteAdapter);
