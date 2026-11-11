import type { SymbolViewProps } from "expo-symbols"

import { SymbolView } from "expo-symbols"

import { styled } from "react-native-css"

/* Maps a `text-*` color class to the symbol's tint, so icons color like text. */
const StyledSymbolView = styled(SymbolView, {
  className: {
    target: "style",
    nativeStyleMapping: { color: "tintColor" },
  },
})

type IconProps = Omit<SymbolViewProps, "tintColor"> & {
  /** Color with a `text-*` class, such as `text-muted-foreground`. */
  className?: string
}

/**
 * An SF Symbol (iOS) or Material Symbol (Android, web). Decorative by
 * default: hidden from screen readers, since the surrounding control or
 * text carries the meaning. Pass `accessibilityLabel` for a standalone icon.
 */
function Icon({ accessibilityLabel, ...props }: IconProps) {
  const decorative = accessibilityLabel === undefined

  return (
    <StyledSymbolView
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? "no-hide-descendants" : "auto"}
      {...props}
    />
  )
}

export {
  Icon,
  type IconProps,
}
