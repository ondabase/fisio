import { Link } from "expo-router"
import { Text, View } from "react-native"

import { Button } from "@/components/ui/button"

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center gap-6 bg-background">
      <Text className="text-xl font-bold text-foreground">
        Welcome to Fisio!
      </Text>
      <Link href="/demo/button" asChild>
        <Button variant="outline">Button demo</Button>
      </Link>
    </View>
  )
}
