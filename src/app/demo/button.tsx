import type { ReactNode } from "react"

import { Stack } from "expo-router"
import { useState } from "react"
import { ScrollView, Text, View } from "react-native"

import { Button, ButtonIcon, ButtonText } from "@/components/ui/button"

function Section({ title, children }: { title: string, children: ReactNode }) {
  return (
    <View className="gap-3">
      <Text className="text-sm font-semibold uppercase tracking-wide text-foreground opacity-60">
        {title}
      </Text>
      {children}
    </View>
  )
}

export default function ButtonDemo() {
  const [saving, setSaving] = useState(false)

  function save() {
    setSaving(true)
    setTimeout(setSaving, 2000, false)
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-8 p-5 pb-12"
      contentInsetAdjustmentBehavior="automatic"
    >
      <Stack.Screen options={{ title: "Button" }} />
      <Section title="Variants">
        <Button>Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
      </Section>
      <Section title="Sizes">
        <View className="flex-row flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button>Default</Button>
          <Button size="lg">Large</Button>
          <Button size="icon" variant="outline" accessibilityLabel="Settings">
            <ButtonIcon name={{ ios: "gearshape", android: "settings", web: "settings" }} />
          </Button>
        </View>
      </Section>
      <Section title="Icons">
        <Button>
          <ButtonIcon name={{ ios: "plus", android: "add", web: "add" }} />
          <ButtonText>New session</ButtonText>
        </Button>
        <Button variant="outline">
          <ButtonText>Continue</ButtonText>
          <ButtonIcon name={{ ios: "chevron.right", android: "chevron_right", web: "chevron_right" }} />
        </Button>
        <Button variant="destructive" size="sm">
          <ButtonIcon name={{ ios: "trash", android: "delete", web: "delete" }} />
          <ButtonText>Delete</ButtonText>
        </Button>
      </Section>
      <Section title="States">
        <Button loading={saving} onPress={save}>
          {saving ? "Saving" : "Tap to save"}
        </Button>
        <Button variant="secondary" loading>Loading</Button>
        <Button disabled>Disabled</Button>
        <Button variant="outline" disabled>Disabled outline</Button>
      </Section>
      <Section title="Custom className">
        <Button className="rounded-full">Rounded full</Button>
        <Button variant="secondary" className="self-start">Fits content</Button>
      </Section>
    </ScrollView>
  )
}
