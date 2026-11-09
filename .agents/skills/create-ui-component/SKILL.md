---
name: create-ui-component
description: Create or modify custom React Native UI components using the project's native-first, shadcn-inspired design system and NativeWind.
---

# Create UI Component

## Purpose

Implement reusable, production-quality UI components for this Expo application.

## Required Context

Before implementing a component:

1. Read `AGENTS.md`.
2. Read `docs/ui-components.md`.
3. Inspect existing components in `src/components/ui/`.
4. Inspect relevant NativeWind configuration, design tokens, and utilities.
5. Review the equivalent shadcn/ui component when relevant and accessible.

Follow the project's existing conventions.

## Implementation Workflow

### 1. Design the API

- Identify the component's intended use.
- Define its public props and native behavior.
- Determine appropriate variants and sizes.
- Prefer shadcn-inspired composition patterns.
- Keep the API simple and type-safe.

### 2. Implement

- Use appropriate React Native primitives.
- Style with NativeWind.
- Reuse shared design tokens and utilities.
- Support `className` customization.
- Implement appropriate interaction states.
- Preserve relevant native props and accessibility behavior.
- Support light and dark themes.

### 3. Validate

- Check TypeScript types.
- Check variant and size behavior.
- Check pressed, disabled, and loading states where relevant.
- Check accessibility.
- Consider both iOS and Android.
- Run available lint, typecheck, and relevant tests.
- Report checks that could not be completed.

### 4. Deliver

Briefly summarize:

- Files created or modified.
- Public component API.
- Supported variants and states.
- Important native-specific decisions.
- Example usage.

## Constraints

- Do not install third-party UI component libraries.
- Do not introduce another styling framework.
- Do not copy web-only shadcn implementations.
- Do not create unrelated components.
- Do not introduce unnecessary abstractions.
- Ask before adding new dependencies.
- Follow `docs/ui-components.md` as the source of truth.
