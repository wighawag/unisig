// Types
export type {Dependency, ScopeAdapter, ReactivityAdapter} from './types.js';

// Scope - granular dependency tracking with proxies
export {Scope} from './Scope.js';

// ProxyFactory - create proxies for auto-tracking (can be used independently)
export {createProxyFactory} from './ProxyFactory.js';
export type {ProxyFactory} from './ProxyFactory.js';
