import type { ClassValue } from "clsx"

import { clsx } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/*
 * tailwind-merge only knows Tailwind's default scales. Without the custom
 * tokens from global.css it would read `text-body` as a color and let
 * `text-muted-foreground` remove it. Keep these lists in sync with @theme.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        "display",
        "title",
        "heading",
        "subheading",
        "body",
        "callout",
        "footnote",
        "caption",
      ],
      spacing: ["screen", "section", "card"],
      radius: ["control", "card"],
    },
  },
})

function cn(...inputs: Array<ClassValue>) {
  return twMerge(clsx(inputs))
}

export { cn }
