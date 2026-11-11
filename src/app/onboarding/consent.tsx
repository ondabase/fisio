import type { ConsentSection } from "@/lib/consent"
import type { IconProps } from "@/components/ui/icon"

import { useState } from "react"
import { Alert, Switch, View } from "react-native"

import { colors } from "@/styles/colors"
import { Card } from "@/components/ui/card"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { Button } from "@/components/ui/button"
import { Screen } from "@/components/ui/screen"
import { ApiError } from "@/lib/api"
import { ListGroup, ListRow } from "@/components/ui/list-row"
import { useRecordConsent } from "@/features/account/use-me"
import { consentSections, CURRENT_CONSENT_VERSION } from "@/lib/consent"

const sectionIcons: Record<ConsentSection["id"], IconProps["name"]> = {
  "wellness": { ios: "checkmark.shield", android: "verified_user", web: "verified_user" },
  "not-a-diagnosis": { ios: "stethoscope", android: "stethoscope", web: "stethoscope" },
  "health-data": { ios: "lock.shield", android: "lock", web: "lock" },
  "get-help": { ios: "cross.case", android: "emergency", web: "emergency" },
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError && error.code === "conflict") {
    return "This text was updated. Restart the app to review the latest version."
  }
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again."
}

export default function Consent() {
  const [adult, setAdult] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const recordConsent = useRecordConsent()

  function submit() {
    // On success the root layout's guard moves the user into the app.
    recordConsent.mutate(undefined, {
      onError: error => Alert.alert("Couldn't save your consent", errorMessage(error)),
    })
  }

  return (
    <Screen
      hasHeader
      footer={(
        <Button disabled={!adult || !agreed} loading={recordConsent.isPending} onPress={submit}>
          Agree and continue
        </Button>
      )}
    >
      <View className="gap-2">
        <Text variant="title">A few important details</Text>
        <Text tone="muted">Please read these before you start.</Text>
      </View>

      <View className="gap-3">
        {consentSections.map(section => (
          <Card key={section.id} className="flex-row gap-3">
            <Icon name={sectionIcons[section.id]} size={22} className="mt-0.5 text-primary" />
            <View className="flex-1 gap-1">
              <Text variant="subheading">{section.title}</Text>
              <Text variant="callout" tone="soft">{section.body}</Text>
            </View>
          </Card>
        ))}
      </View>

      <ListGroup>
        <ListRow
          title="I'm 18 or older"
          trailing={(
            <Switch
              value={adult}
              onValueChange={setAdult}
              trackColor={{ true: colors.primary }}
              accessibilityLabel="I'm 18 or older"
            />
          )}
        />
        <ListRow
          title="I agree to Fisio storing and using my health data as described above"
          trailing={(
            <Switch
              value={agreed}
              onValueChange={setAgreed}
              trackColor={{ true: colors.primary }}
              accessibilityLabel="I agree to Fisio storing and using my health data as described above"
            />
          )}
        />
      </ListGroup>

      <Text variant="caption" tone="muted">
        Consent version
        {" "}
        {CURRENT_CONSENT_VERSION}
      </Text>
    </Screen>
  )
}
