import { router, Stack } from "expo-router"
import { useEffect, useRef } from "react"
import { ActivityIndicator, Alert, Pressable, View } from "react-native"

import { useMutation } from "@tanstack/react-query"

import { Text } from "@/components/ui/text"
import { Button } from "@/components/ui/button"
import { Screen } from "@/components/ui/screen"
import { AssessmentProvider } from "@/features/assessment/assessment-context"
import { useAssessmentApi, useCurrentContent } from "@/features/assessment/api"

function close() {
  router.dismissTo("/")
}

function confirmClose() {
  Alert.alert("Leave the assessment?", "Your answers won't count until you finish. You can start again any time.", [
    { text: "Keep going", style: "cancel" },
    { text: "Leave", style: "destructive", onPress: close },
  ])
}

function CloseButton() {
  return (
    <Pressable role="button" accessibilityLabel="Close the assessment" onPress={confirmClose} hitSlop={12}>
      <Text className="font-semibold text-accent">Close</Text>
    </Pressable>
  )
}

/**
 * The assessment flow: the body map, one question per screen, then the
 * result. Loads the current content and starts an assessment first; every
 * step reads and writes the same AssessmentProvider state.
 */
export default function AssessmentLayout() {
  const content = useCurrentContent()
  const api = useAssessmentApi()
  const start = useMutation({ mutationFn: api.start })
  const startedRef = useRef(false)

  useEffect(() => {
    if (content.data !== undefined && !startedRef.current) {
      startedRef.current = true
      start.mutate(content.data)
    }
  }, [content.data, start])

  if (content.isError || start.isError) {
    return (
      <Screen
        footer={(
          <>
            <Button
              onPress={() => {
                startedRef.current = false
                start.reset()
                void content.refetch()
              }}
            >
              Try again
            </Button>
            <Button variant="ghost" onPress={close}>Close</Button>
          </>
        )}
      >
        <View className="gap-2">
          <Text variant="title">Couldn't start the assessment</Text>
          <Text tone="muted">Check your connection and try again.</Text>
        </View>
      </Screen>
    )
  }

  if (content.data === undefined || start.data === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator accessibilityLabel="Starting the assessment" />
      </View>
    )
  }

  return (
    <AssessmentProvider content={content.data} assessmentId={start.data.id}>
      <Stack screenOptions={{ headerBackButtonDisplayMode: "minimal", title: "Assessment", headerRight: CloseButton }}>
        <Stack.Screen name="body-map" />
        <Stack.Screen name="question/[id]" />
        {/* The outcome is final once shown: no going back into the questions, and no Close. */}
        <Stack.Screen
          name="result"
          options={{
            title: "Your result",
            headerBackVisible: false,
            gestureEnabled: false,
            headerRight: () => null,
          }}
        />
      </Stack>
    </AssessmentProvider>
  )
}
