import { Image } from "expo-image"
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { useClerk, useUser } from "@clerk/expo"

import { Button, ButtonText } from "@/components/ui/button"

const providerNames: Record<string, string> = {
  google: "Google",
  apple: "Apple",
}

// expo-image takes size and corner radius through `style`.
const styles = StyleSheet.create({
  avatar: { width: 88, height: 88, borderRadius: 44 },
})

function formatDate(date: Date | null | undefined) {
  return date
    ? date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
    : "—"
}

function Row({ label, value, last = false }: { label: string, value: string, last?: boolean }) {
  return (
    <View className={last ? "gap-0.5 px-4 py-3" : "gap-0.5 border-b border-border px-4 py-3"}>
      <Text className="text-[13px] text-muted-foreground">{label}</Text>
      <Text className="text-[17px] text-foreground" selectable>{value}</Text>
    </View>
  )
}

export default function Profile() {
  const insets = useSafeAreaInsets()
  const { user } = useUser()
  const { signOut } = useClerk()

  // The tabs only render for a signed-in user, so this is just a type guard.
  if (!user) {
    return null
  }

  const name = user.fullName ?? user.firstName ?? "Your account"
  const email = user.primaryEmailAddress?.emailAddress ?? "—"
  const provider = user.externalAccounts[0]?.provider
  const signInMethod = provider === undefined
    ? "Email"
    : (providerNames[provider] ?? provider)

  function confirmSignOut() {
    Alert.alert("Sign out?", "You can sign back in with Google at any time.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => void signOut(),
      },
    ])
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-6 px-6 pb-12"
      contentContainerStyle={{ paddingTop: insets.top + 16 }}
    >
      <Text role="heading" className="text-[34px] font-bold tracking-tight text-foreground">
        Profile
      </Text>

      <View className="items-center gap-3">
        <Image
          source={{ uri: user.imageUrl }}
          style={styles.avatar}
          contentFit="cover"
          accessibilityLabel={`Profile photo of ${name}`}
        />
        <View className="items-center gap-0.5">
          <Text className="text-[22px] font-semibold text-foreground">{name}</Text>
          <Text className="text-[16px] text-muted-foreground">{email}</Text>
        </View>
      </View>

      <View className="overflow-hidden rounded-2xl border border-border bg-card">
        <Row label="Signed in with" value={signInMethod} />
        <Row label="Member since" value={formatDate(user.createdAt)} />
        <Row label="Last sign-in" value={formatDate(user.lastSignInAt)} />
        <Row label="Account ID" value={user.id} last />
      </View>

      <Button variant="outline" onPress={confirmSignOut} className="bg-card">
        <ButtonText className="text-destructive">Sign out</ButtonText>
      </Button>
    </ScrollView>
  )
}
