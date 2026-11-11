import type { ScrollViewProps } from "react-native"
import type { ReactNode } from "react"

import { createContext, use } from "react"
import { Platform, ScrollView, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { cn } from "@/lib/utils"

/*
 * iOS insets a scroll view for the status bar inside native tabs, but not
 * inside a stack screen without a header. So a screen needs to know which
 * one it's in. The tabs layout provides this; modals and stacks opened from
 * a tab render outside the tab navigator, so they don't receive it.
 */
const InTabsContext = createContext(false)

type ScreenTabsProviderProps = {
  children: ReactNode
}

/** Wrap the tab navigator in this, so its screens' `<Screen>`s inset correctly. */
function ScreenTabsProvider({ children }: ScreenTabsProviderProps) {
  return <InTabsContext value>{children}</InTabsContext>
}

type ScreenProps = ScrollViewProps & {
  /**
   * The screen sits under a native stack header. Without one, the screen
   * pads itself below the status bar.
   */
  hasHeader?: boolean
  /** Pinned below the scrolling content, such as a Continue button. */
  footer?: ReactNode
}

/* Space between the safe area and the content, in points. */
const CONTENT_TOP = 16
const CONTENT_BOTTOM = 40

/**
 * The scrolling body of a screen: background, gutters, section spacing, and
 * safe areas. On iOS the scroll view insets itself for a header and the tab
 * bar, and inside tabs for the status bar too; elsewhere the screen pads
 * itself below the status bar. Android has no automatic insets, so both
 * safe areas are padded.
 *
 * Top and bottom padding are set here, so `contentContainerClassName` is for
 * gaps and horizontal spacing.
 */
function Screen({
  hasHeader = false,
  footer,
  className,
  contentContainerClassName,
  children,
  ...props
}: ScreenProps) {
  const insets = useSafeAreaInsets()
  const inTabs = use(InTabsContext)
  const isIOS = Platform.OS === "ios"
  const hasFooter = footer !== undefined
  const topInset = hasHeader || (isIOS && inTabs)
    ? 0
    : insets.top
  const bottomInset = !isIOS && !hasFooter
    ? insets.bottom
    : 0

  return (
    <View className={cn("flex-1 bg-background", className)}>
      <ScrollView
        className="flex-1"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName={cn("gap-section px-screen", contentContainerClassName)}
        contentContainerStyle={{
          paddingTop: topInset + CONTENT_TOP,
          paddingBottom: bottomInset + CONTENT_BOTTOM,
        }}
        {...props}
      >
        {children}
      </ScrollView>
      {hasFooter && (
        <View
          className="gap-3 bg-background px-screen pt-3"
          style={{
            paddingBottom: Math.max(insets.bottom, 16),
          }}
        >
          {footer}
        </View>
      )}
    </View>
  )
}

export {
  Screen,
  type ScreenProps,
  ScreenTabsProvider,
  type ScreenTabsProviderProps,
}
