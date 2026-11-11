import type { VariantProps } from "class-variance-authority"
import type { TextProps as NativeTextProps } from "react-native"

import { Text as NativeText } from "react-native"

import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

/* Sizes come from the type scale in global.css. */
const textVariants = cva("", {
  variants: {
    variant: {
      display: "text-display",
      title: "text-title",
      heading: "text-heading",
      subheading: "text-subheading",
      body: "text-body",
      callout: "text-callout",
      footnote: "text-footnote",
      caption: "text-caption",
    },
    tone: {
      default: "text-foreground",
      soft: "text-soft-foreground",
      muted: "text-muted-foreground",
      primary: "text-primary-deep",
      success: "text-success",
      caution: "text-caution",
      urgent: "text-urgent",
      info: "text-info",
      inverse: "text-primary-foreground",
    },
  },
  defaultVariants: {
    variant: "body",
    tone: "default",
  },
})

type TextVariant = NonNullable<VariantProps<typeof textVariants>["variant"]>
type TextTone = NonNullable<VariantProps<typeof textVariants>["tone"]>

/* Screen readers navigate by headings, so the larger styles are announced as one. */
const headingVariants = new Set<TextVariant>(["display", "title", "heading"])

type TextProps = NativeTextProps & {
  /** Type style from the scale. Defaults to `"body"`. */
  variant?: TextVariant
  /** Color. Defaults to `"default"` (foreground). */
  tone?: TextTone
}

/**
 * Text on the app's type scale. `display`, `title`, and `heading` get the
 * heading role by default; pass `role` to override it.
 */
function Text({ variant = "body", tone = "default", role, className, ...props }: TextProps) {
  return (
    <NativeText
      role={role ?? (headingVariants.has(variant)
        ? "heading"
        : undefined)}
      className={cn(textVariants({ variant, tone }), className)}
      {...props}
    />
  )
}

export {
  Text,
  type TextProps,
  type TextTone,
  type TextVariant,
}
