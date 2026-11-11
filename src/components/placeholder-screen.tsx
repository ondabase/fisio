import type { ReactNode } from "react"

import { View } from "react-native"

import { Text } from "@/components/ui/text"
import { Screen } from "@/components/ui/screen"

type PlaceholderScreenProps = {
  title: string
  description: string
  /**
   * The screen sits under a native stack header that already shows the title,
   * so the large in-page title is left out.
   */
  hasHeader?: boolean
  /** Actions below the description, such as buttons to the next screen. */
  children?: ReactNode
}

/** A titled screen for routes that aren't built yet. */
function PlaceholderScreen({ title, description, hasHeader = false, children }: PlaceholderScreenProps) {
  return (
    <Screen hasHeader={hasHeader}>
      <View className="gap-2">
        {!hasHeader && <Text variant="display">{title}</Text>}
        <Text tone="muted">{description}</Text>
      </View>
      {children !== undefined && (
        <View className="gap-3">
          {children}
        </View>
      )}
    </Screen>
  )
}

export {
  PlaceholderScreen,
  type PlaceholderScreenProps,
}
