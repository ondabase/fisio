# UI Component Design System

## Philosophy

Build a custom, reusable, native-first component system for Expo and React Native.

Use shadcn/ui as inspiration for architecture, APIs, variants, composition, and developer experience.

Do not recreate shadcn's web appearance. Components should feel polished, modern, and native on iOS and Android.

All components are owned and maintained within this codebase.

## Technology

- React Native and Expo
- TypeScript
- NativeWind for styling
- React Native primitives for native interactions

Do not introduce third-party UI component libraries.

## Component Architecture

- Store reusable UI primitives in `src/components/ui/`.
- Use lowercase kebab-case filenames.
- Prefer named exports.
- Extend appropriate React Native prop types.
- Prefer composition over excessive configuration.
- Use typed variants and sizes when appropriate.
- Forward refs when useful and supported.
- Keep public APIs predictable and minimal.
- Avoid unnecessary abstractions.

## Styling

NativeWind is the standard styling solution.

- Prefer `className` for component styling.
- Use NativeWind's configured styling and theme conventions.
- Use shared design tokens for colors, spacing, typography, and radii.
- Avoid arbitrary values when existing tokens are appropriate.
- Support `className` customization on public components.
- Merge default, variant, and consumer classes with `cn()` from `src/lib/utils.ts` (`clsx` + `tailwind-merge`). NativeWind resolves conflicting classes by stylesheet order, not `className` order, so merging is what lets later classes win.
- Ensure consumer classes can override component defaults predictably.
- Use React Native's `style` prop when necessary for dynamic or unsupported styles.
- Do not introduce competing styling frameworks.

## Component Variants

Use shadcn-inspired variant patterns when appropriate.

For example:

- `variant`: default, secondary, outline, ghost, destructive
- `size`: sm, default, lg

Variants must be type-safe, consistent, and easy to extend.

Define variants with `cva` from `class-variance-authority`, and derive variant and size types from it with `VariantProps`.

## Native-First Design

- Prefer React Native primitives over web abstractions.
- Use `Pressable` for interactive elements when appropriate.
- Provide tactile visual feedback for pressed states.
- Respect iOS and Android interaction conventions.
- Design for touch rather than mouse interaction.
- Use platform-specific behavior when beneficial.
- Respect safe areas, font scaling, and accessibility preferences.
- Avoid web-specific behavior such as hover-dependent interactions.

## Visual Design

Aim for a premium, minimal, modern mobile experience.

- Consistent typography, spacing, colors, and corner radii.
- Clear visual hierarchy.
- Comfortable touch targets.
- Subtle, responsive interaction feedback.
- Consistent disabled and loading states.
- Light and dark mode support.
- Avoid unnecessary visual complexity.

## Accessibility

- Use appropriate accessibility roles, labels, and states.
- Ensure accessible touch target sizes.
- Support screen readers.
- Respect system font scaling.
- Do not communicate state through color alone.
- Respect reduced-motion settings when applicable.

## Code Quality

- Use strict TypeScript.
- Avoid `any` and unnecessary type assertions.
- Preserve native component props where appropriate.
- Prefer simple, readable implementations.
- Keep styling conventions consistent.
- Avoid unnecessary dependencies.
- Do not create unrelated components or abstractions.

## Reference

shadcn/ui is an architectural reference, not a dependency.

When adapting a shadcn component:

1. Preserve useful API and composition patterns.
2. Translate HTML and DOM behavior into native primitives.
3. Adapt visual design and interactions for mobile.
4. Reuse existing project tokens and conventions.
5. Prioritize native usability over web parity.
