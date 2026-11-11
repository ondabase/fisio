import { Pressable, View } from "react-native"

import { cn } from "@/lib/utils"
import { Text } from "@/components/ui/text"

type ScalePickerProps = {
  min: number
  max: number
  minLabel: string
  maxLabel: string
  value: number | undefined
  onChange: (value: number) => void
  /** What's being rated, announced by screen readers, such as the question. */
  accessibilityLabel: string
}

/**
 * A whole-number rating, such as pain from 0 to 10: the chosen number shown
 * large, with a 48pt button per number. Announced as a radio group, with the
 * end labels read on the first and last numbers.
 */
function ScalePicker({ min, max, minLabel, maxLabel, value, onChange, accessibilityLabel }: ScalePickerProps) {
  const steps = [
    ...Array.from({ length: max - min + 1 }).keys(),
  ].map(offset => min + offset)

  return (
    <View className="gap-4">
      <View className="flex-row items-baseline justify-center gap-1" aria-live="polite">
        <Text variant="display" role="none">
          {value === undefined
            ? "–"
            : String(value)}
        </Text>
        <Text variant="heading" tone="muted" role="none">{`/${max}`}</Text>
      </View>
      <View role="radiogroup" accessibilityLabel={accessibilityLabel} className="flex-row flex-wrap justify-center gap-2">
        {steps.map((step) => {
          const selected = value === step
          const label = step === min
            ? `${step}, ${minLabel}`
            : step === max
              ? `${step}, ${maxLabel}`
              : String(step)
          return (
            <Pressable
              key={step}
              role="radio"
              aria-checked={selected}
              accessibilityLabel={label}
              onPress={() => onChange(step)}
              className={cn(
                "size-[48px] items-center justify-center rounded-full border ios:active:opacity-70",
                selected ? "border-primary bg-primary" : "border-border bg-card",
              )}
            >
              <Text variant="subheading" tone={selected ? "inverse" : "default"}>{String(step)}</Text>
            </Pressable>
          )
        })}
      </View>
      <View className="flex-row justify-between">
        <Text variant="footnote" tone="muted">{`${min}: ${minLabel}`}</Text>
        <Text variant="footnote" tone="muted" className="text-right">{`${max}: ${maxLabel}`}</Text>
      </View>
    </View>
  )
}

export {
  ScalePicker,
  type ScalePickerProps,
}
