import { NativeTabs } from "expo-router/native-tabs"

import { colors } from "@/styles/colors"
import { ScreenTabsProvider } from "@/components/ui/screen"

export default function TabsLayout() {
  return (
    <ScreenTabsProvider>
      <NativeTabs tintColor={colors.primary}>
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: "sun.max", selected: "sun.max.fill" }} md="today" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="program">
          <NativeTabs.Trigger.Label>Program</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: "list.bullet.clipboard", selected: "list.bullet.clipboard.fill" }} md="assignment" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="progress">
          <NativeTabs.Trigger.Label>Progress</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="chart.line.uptrend.xyaxis" md="show_chart" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="profile">
          <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: "person.crop.circle", selected: "person.crop.circle.fill" }} md="account_circle" />
        </NativeTabs.Trigger>
      </NativeTabs>
    </ScreenTabsProvider>
  )
}
