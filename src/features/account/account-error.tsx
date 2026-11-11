import { View } from "react-native"

import { Text } from "@/components/ui/text"
import { Button } from "@/components/ui/button"
import { Screen } from "@/components/ui/screen"

type AccountErrorProps = {
  retrying: boolean
  onRetry: () => void
  onSignOut: () => void
}

/**
 * Shown when the signed-in user's record can't be loaded, so the app can't
 * tell whether they've consented yet. Nothing past this point is reachable
 * until it loads.
 */
function AccountError({ retrying, onRetry, onSignOut }: AccountErrorProps) {
  return (
    <Screen
      footer={(
        <>
          <Button loading={retrying} onPress={onRetry}>Try again</Button>
          <Button variant="ghost" onPress={onSignOut}>Sign out</Button>
        </>
      )}
    >
      <View className="gap-2">
        <Text variant="title">Couldn't load your account</Text>
        <Text tone="muted">Check your connection and try again.</Text>
      </View>
    </Screen>
  )
}

export {
  AccountError,
  type AccountErrorProps,
}
