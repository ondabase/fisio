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

## Design Tokens

Tokens live in `@theme` in `src/styles/global.css`. NativeWind's rem is 14px, so Tailwind's default numeric scales are off-grid (one spacing step is 3.5px). Prefer the named tokens below for type and screen layout.

- **Type:** `text-display`, `text-title`, `text-heading`, `text-subheading`, `text-body`, `text-callout`, `text-footnote`, `text-caption`. Each sets size, line height, and weight. Use them through `<Text variant>` rather than raw classes.
- **Color tones:** `foreground`, `soft-foreground`, `muted-foreground`, plus `primary` / `primary-soft` / `primary-deep` and the semantic `success`, `caution`, `urgent`, `info` (each with a `-soft` background). Safety outcomes use `success` (eligible), `caution` (see a clinician), and `urgent` (seek care now). Always pair a tone with an icon or text.
- **Layout:** `px-screen` (gutter), `gap-section` (between sections), `p-card` (inside cards).
- **Radii:** `rounded-card`, `rounded-control`.

When adding a token:

- Add any new `text-*`, spacing, or radius name to `extendTailwindMerge` in `src/lib/utils.ts`. Otherwise `cn()` misreads it (for example, as a color) and drops it.
- Write `--text-*--line-height` as a unitless ratio of the font size. react-native-css multiplies a line height read from a variable by the font size, so `24px` renders as 24 × the font size.

## Primitives

- `Text` (`ui/text.tsx`): type scale and tone. The `display`, `title`, and `heading` styles get the heading role automatically.
- `Screen` (`ui/screen.tsx`): the scrolling body of a screen, with gutters and safe areas. Pass `hasHeader` under a native header, and `footer` for a pinned action. Tab screens must sit inside `ScreenTabsProvider`; the tabs layout already sets this up.
- `Card` (`ui/card.tsx`): a surface, tinted by `variant` for states.
- `ListRow` and `ListGroup` (`ui/list-row.tsx`): rows for settings and details. A row is a button only when it has `onPress`.
- `Icon` (`ui/icon.tsx`): SF / Material symbols colored with a `text-*` class. Decorative unless given an `accessibilityLabel`.
- `Button` (`ui/button.tsx`).
- `SegmentedControl` (`ui/segmented-control.tsx`): a pill choice between a few options, announced as a radio group.

Props that take a color value rather than a class (native tab tints, `Switch` tracks, SVG fills) use `src/styles/colors.ts`, which mirrors the tokens. Keep the two in sync.

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
- Light mode only for now. Do not add dark-mode tokens or `dark:` classes.
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
