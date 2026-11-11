import { Stack } from "expo-router"
import { ScrollView, Text } from "react-native"

// TODO: replace with the counsel-reviewed Privacy Policy before launch.
export default function Privacy() {
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-6"
      contentInsetAdjustmentBehavior="automatic"
    >
      <Stack.Screen options={{ title: "Privacy Policy" }} />
      <Text className="text-[17px] leading-[24px] text-muted-foreground">
        The Privacy Policy is coming soon.
      </Text>
    </ScrollView>
  )
}
