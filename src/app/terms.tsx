import { Stack } from "expo-router"
import { ScrollView, Text } from "react-native"

// TODO: replace with the counsel-reviewed Terms of Service before launch.
export default function Terms() {
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-6"
      contentInsetAdjustmentBehavior="automatic"
    >
      <Stack.Screen options={{ title: "Terms" }} />
      <Text className="text-[17px] leading-[24px] text-muted-foreground">
        The Terms of Service are coming soon.
      </Text>
    </ScrollView>
  )
}
