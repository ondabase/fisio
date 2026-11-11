import { Pressable, View } from "react-native"

import { cn } from "@/lib/utils"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"

type OptionRowProps = {
  label: string
  selected: boolean
  /** `radio` for one choice, `checkbox` for several. */
  kind: "radio" | "checkbox"
  onPress: () => void
}

/** One answer option: a full-width card with a radio or checkbox mark. */
function OptionRow({ label, selected, kind, onPress }: OptionRowProps) {
  return (
    <Pressable
      role={kind}
      aria-checked={selected}
      accessibilityLabel={label}
      onPress={onPress}
      className={cn(
        "min-h-[56px] flex-row items-center gap-3 rounded-control border px-4 py-3 ios:active:opacity-70",
        selected ? "border-primary bg-primary-soft" : "border-border bg-card",
      )}
    >
      <View
        className={cn(
          "size-6 items-center justify-center border-2",
          kind === "radio"
            ? "rounded-full"
            : "rounded-md",
          selected ? "border-primary bg-primary" : "border-border bg-card",
        )}
      >
        {selected && <Icon name={{ ios: "checkmark", android: "check", web: "check" }} size={12} weight="bold" className="text-primary-foreground" />}
      </View>
      <Text className="flex-1">{label}</Text>
    </Pressable>
  )
}

export {
  OptionRow,
  type OptionRowProps,
}
