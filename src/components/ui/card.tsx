import type { VariantProps } from "class-variance-authority"
import type { ViewProps } from "react-native"

import { View } from "react-native"

import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

/*
 * `default` is a white surface. The tinted variants mark state, such as an
 * assessment outcome; pair them with an icon or text that says the same
 * thing, since color alone doesn't reach everyone.
 */
const cardVariants = cva("gap-2 rounded-card border p-card", {
  variants: {
    variant: {
      default: "border-border bg-card shadow-[0_2px_8px_rgba(15,23,42,0.06)]",
      primary: "border-primary/20 bg-primary-soft",
      success: "border-success/25 bg-success-soft",
      caution: "border-caution/25 bg-caution-soft",
      urgent: "border-urgent/25 bg-urgent-soft",
      info: "border-info/20 bg-info-soft",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

type CardVariant = NonNullable<VariantProps<typeof cardVariants>["variant"]>

type CardProps = ViewProps & {
  /** Surface style. Defaults to `"default"`. */
  variant?: CardVariant
}

/** A rounded surface that groups related content. Compose `<Text>` inside. */
function Card({ variant = "default", className, ...props }: CardProps) {
  return <View className={cn(cardVariants({ variant }), className)} {...props} />
}

export {
  Card,
  type CardProps,
  type CardVariant,
}
