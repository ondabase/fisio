import type { ViewProps } from "react-native"

import { Pressable, Text, View } from "react-native"

import { cn } from "@/lib/utils"

type SegmentedOption<T extends string> = {
  value: T
  label: string
}

type SegmentedControlProps<T extends string> = Omit<ViewProps, "children"> & {
  options: ReadonlyArray<SegmentedOption<T>>
  value: T
  onChange: (value: T) => void
  /** What the choice is about, announced by screen readers, such as "Body view". */
  accessibilityLabel: string
}

/**
 * A pill-shaped choice between a few options, such as Front and Back.
 * Announced as a radio group, so screen readers say which one is selected.
 */
function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  className,
  ...props
}: SegmentedControlProps<T>) {
  return (
    <View
      role="radiogroup"
      accessibilityLabel={accessibilityLabel}
      className={cn("flex-row rounded-full bg-secondary p-1", className)}
      {...props}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <Pressable
            key={option.value}
            role="radio"
            aria-checked={selected}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.value)}
            className={cn(
              "min-h-[44px] flex-1 items-center justify-center rounded-full px-4",
              selected ? "bg-primary" : "ios:active:opacity-70",
            )}
          >
            <Text className={cn("text-callout font-semibold", selected ? "text-primary-foreground" : "text-foreground")}>
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export {
  SegmentedControl,
  type SegmentedControlProps,
  type SegmentedOption,
}
