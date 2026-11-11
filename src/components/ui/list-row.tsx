import type { PressableProps, ViewProps } from "react-native"
import type { ComponentRef, ReactNode, Ref } from "react"

import { Pressable, View } from "react-native"
import { createContext, use } from "react"

import { cn } from "@/lib/utils"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"

const chevron = { ios: "chevron.right", android: "chevron_right", web: "chevron_right" } as const

/* True inside a `<ListGroup>`, where each row draws the separator below it. */
const ListGroupContext = createContext(false)

type ListRowProps = Omit<PressableProps, "children"> & {
  ref?: Ref<ComponentRef<typeof Pressable>>
  title: string
  /** Supporting text under the title. */
  description?: string
  /** A value on the trailing side, such as "4 weeks". */
  value?: string
  /** Content before the text, usually an `<Icon>`. */
  leading?: ReactNode
  /** Content after the text. Defaults to a chevron when the row is pressable. */
  trailing?: ReactNode
}

/**
 * One row of a list: settings, program details, or a link to another screen.
 * With `onPress` it's a button with pressed feedback and a chevron;
 * otherwise it's static. Group rows with `<ListGroup>`.
 */
function ListRow({
  title,
  description,
  value,
  leading,
  trailing,
  onPress,
  disabled,
  className,
  role,
  ...props
}: ListRowProps) {
  const inGroup = use(ListGroupContext)
  const pressable = onPress !== undefined && onPress !== null
  const defaultRole = pressable
    ? "button"
    : undefined

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled === true || !pressable}
      role={role ?? defaultRole}
      aria-disabled={pressable && disabled === true}
      className={cn(
        // Taller than the 44pt minimum touch target, even for a title-only row.
        "min-h-[52px] flex-row items-center gap-3 px-card py-3",
        inGroup && "border-b border-border",
        pressable && "ios:active:bg-highlight android:ripple-highlight",
        disabled === true && "opacity-50",
        className,
      )}
      {...props}
    >
      {leading}
      <View className="flex-1 gap-0.5">
        <Text variant="body">{title}</Text>
        {description !== undefined && (
          <Text variant="footnote" tone="muted">{description}</Text>
        )}
      </View>
      {value !== undefined && (
        <Text variant="body" tone="muted">{value}</Text>
      )}
      {trailing ?? (pressable && (
        <Icon name={chevron} size={14} weight="semibold" className="text-muted-foreground opacity-60" />
      ))}
    </Pressable>
  )
}

type ListGroupProps = ViewProps

/**
 * A card of `<ListRow>`s with separators between them. Each row draws a
 * border below itself; the inner `-mb-px` pulls the last one under the
 * card's clipped edge, so it doesn't double the card border.
 */
function ListGroup({ className, children, ...props }: ListGroupProps) {
  return (
    <View className={cn("overflow-hidden rounded-card border border-border bg-card", className)} {...props}>
      <View className="-mb-px">
        <ListGroupContext value>
          {children}
        </ListGroupContext>
      </View>
    </View>
  )
}

export {
  ListGroup,
  type ListGroupProps,
  ListRow,
  type ListRowProps,
}
