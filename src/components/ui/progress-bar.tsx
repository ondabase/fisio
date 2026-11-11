import type { ViewProps } from "react-native"

import { View } from "react-native"

import { cn } from "@/lib/utils"

type ProgressBarProps = Omit<ViewProps, "children"> & {
  /** Progress from 0 to 1. Values outside the range are clamped. */
  value: number
  /** What's progressing, announced by screen readers, such as "Assessment progress". */
  accessibilityLabel: string
}

/** A thin bar showing how far through something the user is. */
function ProgressBar({ value, accessibilityLabel, className, ...props }: ProgressBarProps) {
  const clamped = Math.min(1, Math.max(0, value))
  const percent = Math.round(clamped * 100)

  return (
    <View
      role="progressbar"
      accessibilityLabel={accessibilityLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={cn("h-1.5 overflow-hidden rounded-full bg-secondary", className)}
      {...props}
    >
      <View className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
    </View>
  )
}

export {
  ProgressBar,
  type ProgressBarProps,
}
