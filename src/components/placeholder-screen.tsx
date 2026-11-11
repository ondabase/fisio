import { ScrollView, Text } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

type PlaceholderScreenProps = {
  title: string
  description: string
}

/** A titled screen for tabs that aren't built yet. */
function PlaceholderScreen({ title, description }: PlaceholderScreenProps) {
  const insets = useSafeAreaInsets()

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-2 px-6 pb-12"
      contentContainerStyle={{ paddingTop: insets.top + 16 }}
    >
      <Text role="heading" className="text-[34px] font-bold tracking-tight text-foreground">
        {title}
      </Text>
      <Text className="text-[17px] leading-[24px] text-muted-foreground">
        {description}
      </Text>
    </ScrollView>
  )
}

export {
  PlaceholderScreen,
  type PlaceholderScreenProps,
}
