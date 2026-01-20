# Contributing to unisig

Thank you for your interest in contributing to unisig! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Code Style](#code-style)
- [Testing](#testing)
- [Documentation](#documentation)
- [Submitting Changes](#submitting-changes)

## Development Setup

### Prerequisites

- Node.js 18 or higher
- pnpm (preferred) or npm

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/unisig.git
cd unisig

# Install dependencies
pnpm install

# Build the package
pnpm build

# Run tests
pnpm test
```

## Project Structure

```
unisig/
├── packages/
│   └── unisig/
│       ├── src/
│       │   ├── index.ts           # Main entry point and exports
│       │   ├── types.ts           # Type definitions
│       │   ├── Emitter.ts         # Event emitter implementation
│       │   ├── Scope.ts           # Signal scope implementation
│       │   ├── Reactive.ts        # Combined Reactive class
│       │   ├── standalone.ts      # Standalone state/ref functions
│       │   └── *.spec.ts          # Test files
│       ├── package.json
│       ├── tsconfig.json
│       └── vitest.config.ts
├── examples/
│   └── svelte/                    # Svelte example application
├── README.md
├── PATTERNS.md                    # Usage patterns guide
└── CONTRIBUTING.md                # This file
```

## Code Style

### TypeScript

- Use strict TypeScript settings
- Prefer `type` over `interface` for event maps
- Use JSDoc comments for all public APIs
- Follow the existing naming conventions:
  - Classes: `PascalCase`
  - Functions/Methods: `camelCase`
  - Constants: `UPPER_SNAKE_CASE`
  - Private properties: `camelCase` with `#` prefix or `private` keyword

### Code Organization

- Keep files focused on a single responsibility
- Group related exports together
- Use clear, descriptive names
- Add inline comments for complex logic

### Example

```typescript
/**
 * Create a dependency for tracking.
 * @returns A new dependency instance
 */
export function createDependency(): Dependency {
	// Implementation
}
```

## Testing

### Writing Tests

- Use Vitest for all tests
- Place test files next to source files with `.spec.ts` suffix
- Write descriptive test names
- Test both happy paths and edge cases
- Use `describe` blocks to group related tests

### Test Structure

```typescript
import {describe, it, expect, vi} from 'vitest';
import {MyClass} from './MyClass';

describe('MyClass', () => {
	describe('myMethod()', () => {
		it('should do something', () => {
			const instance = new MyClass();
			const result = instance.myMethod();
			expect(result).toBe(expected);
		});

		it('should handle edge case', () => {
			const instance = new MyClass();
			expect(() => instance.myMethod()).not.toThrow();
		});
	});
});
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test -- --coverage
```

### Test Coverage

We aim for high test coverage. When adding new features:

1. Write tests for the new functionality
2. Ensure edge cases are covered
3. Test error conditions
4. Verify the tests pass locally

## Documentation

### Code Documentation

- All public APIs must have JSDoc comments
- Include parameter types and return types
- Provide usage examples for complex APIs
- Document thrown errors

### Example

```typescript
/**
 * Subscribe to an event.
 *
 * @param event - The event name to listen for
 * @param listener - Callback function to invoke when event is emitted
 * @returns Unsubscribe function to remove the listener
 *
 * @example
 * ```ts
 * const unsub = emitter.on('item:added', (item) => {
 *   console.log('Added:', item)
 * })
 *
 * // Later, to stop listening:
 * unsub()
 * ```
 */
on<K extends keyof Events>(
	event: K,
	listener: Listener<Events[K]>,
): Unsubscribe
```

### README Documentation

- Keep README.md up to date with new features
- Add examples for new functionality
- Update API documentation
- Maintain the beginner-friendly guide

### PATTERNS Documentation

- Document common usage patterns in PATTERNS.md
- Include performance considerations
- Provide code examples
- Explain trade-offs

## Submitting Changes

### Commit Messages

Follow conventional commits format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Test changes
- `refactor`: Code refactoring
- `chore`: Build process or auxiliary tool changes

### Example

```
feat(reactive): add deep proxy support

Adds deepProxy() and deepItemProxy() methods to automatically
track nested property access using dot notation paths.

Closes #123
```

### Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes
4. Run tests: `pnpm test`
5. Commit your changes: `git commit -m 'feat: add my feature'`
6. Push to the branch: `git push origin feat/my-feature`
7. Open a Pull Request

### PR Checklist

- [ ] Tests pass locally
- [ ] New tests added for new features
- [ ] Documentation updated
- [ ] Code follows project style
- [ ] Commit messages follow conventional commits
- [ ] PR description clearly explains changes

## Development Workflow

### Adding a New Feature

1. Create a new branch
2. Implement the feature with tests
3. Update documentation
4. Run tests and ensure they pass
5. Open a PR for review

### Fixing a Bug

1. Create a branch with descriptive name
2. Write a failing test that reproduces the bug
3. Fix the bug
4. Ensure all tests pass
5. Open a PR

### Performance Optimization

1. Profile the code to identify bottlenecks
2. Implement optimizations
3. Add benchmarks if necessary
4. Document the improvement
5. Open a PR

## Best Practices

### Reactive State Management

- Use `track()` for read operations
- Use `trigger()` for write operations
- Emit events after triggering signals
- Use granular tracking (`trackItem`, `trackProp`) for better performance

### Error Handling

- Throw descriptive errors
- Use custom error classes for library-specific errors
- Document error conditions
- Test error paths

### Performance Considerations

- Minimize dependency creation
- Use WeakMap for proxy caching
- Avoid unnecessary re-renders with granular tracking
- Document performance implications of APIs

## Questions?

Feel free to open an issue for questions about contributing or to discuss potential changes before implementing them.

## License

By contributing to unisig, you agree that your contributions will be licensed under the MIT License.