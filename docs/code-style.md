# Code Style

Conventions for TypeScript files in this project. ESLint does not enforce them: they are agreed guidelines, so follow them when writing new code and when touching existing files.

ESLint (`npm run check`) still covers formatting and hard rules such as top-level `import type` and sorted named imports. This document covers what it does not.

## Imports

Group imports in this order, with a blank line between groups:

1. **Types**: every `import type` statement.
2. **Framework**: `react`, `react-native`, `expo`, and `expo-*` packages.
3. **Other libraries**: all remaining third-party packages.
4. **Internal**: project modules imported through the `@/` alias.
5. **Side effects**: imports with no bindings, such as stylesheets.

Within each group, put the shortest list of imported names first, so each line is no longer than the one below it. This keeps a group easy to scan. Leave out groups a file does not need.

```tsx
import type { VariantProps } from "class-variance-authority"
import type { PressableProps } from "react-native"
import type { ComponentRef, ReactNode } from "react"

import { SymbolView } from "expo-symbols"
import { Pressable, Text } from "react-native"
import { createContext, use } from "react"

import { cva } from "class-variance-authority"
import { styled } from "react-native-css"

import { cn } from "@/lib/utils"

import "@/styles/global.css"
```

Framework imports get their own group because nearly every file has them. Keeping them apart makes a file's real dependencies easy to see in the next group.

## Exports

Declare functions, components, constants, and types without `export`. Export them from a single block at the end of the file, sorted alphabetically, with types marked inline:

```tsx
function Button(props: ButtonProps) {
  // ...
}

function ButtonText(props: ButtonTextProps) {
  // ...
}

export {
  Button,
  type ButtonProps,
  ButtonText,
  type ButtonTextProps,
}
```

The block at the end shows a module's public API in one place, and keeps everything else private by default.

**Exception: route files.** In `src/app/`, the screen component is exported inline with `export default function`, because Expo Router requires a default export for each screen. Everything else in a route file follows the rule above.

```tsx
function Section(props: SectionProps) {
  // ...
}

export default function Index() {
  // ...
}
```

## Types

Use the generic array syntax:

```ts
function cn(...inputs: Array<ClassValue>) {}
```

Not `ClassValue[]`.
