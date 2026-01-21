import {createAdapterBundle} from 'unisig';

export type {Tracker} from 'unisig';
import adapter from '@unisig/svelte';

export const {effect, createTracker} = createAdapterBundle(adapter);
