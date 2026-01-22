# @unisig/solid-js

Solid.js adapter for [unisig](https://github.com/wighawag/unisig) - Universal Signals for reactive state management.

## Installation

```bash
npm install unisig @unisig/solid-js
# or
pnpm add unisig @unisig/solid-js
# or
yarn add unisig @unisig/solid-js
```

## Usage

### Basic Setup


```ts
import solidAdapter from '@unisig/solid-js';
import unisig from 'unisig';

const {reactive, signal, effect} = unisig(solidAdapter);
```



## Acknowledgments

This adapter is derived from [@signaldb/svelte](https://github.com/maxnowack/signaldb) by [Max Nowack](https://github.com/maxnowack). The core dependency tracking implementation using `createSubscriber` from `svelte/reactivity` originates from his excellent work on signaldb.

## License

MIT - See [LICENSE](./LICENSE) for details.