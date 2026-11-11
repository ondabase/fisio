import { router, useLocalSearchParams } from "expo-router"

import { Button } from "@/components/ui/button"
import { PlaceholderScreen } from "@/components/placeholder-screen"

export default function Question() {
  const { id } = useLocalSearchParams<{ id: string }>()

  return (
    <PlaceholderScreen
      hasHeader
      title="Assessment"
      description={`Question "${id}" will go here. The clinical engine picks the next question from the answers so far (M2, M4).`}
    >
      {/* The result replaces the questions, so back from the result can't reopen them. */}
      <Button onPress={() => router.replace("/assessment/result")}>See result</Button>
    </PlaceholderScreen>
  )
}
