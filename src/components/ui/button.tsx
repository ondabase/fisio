import type { VariantProps } from "class-variance-authority"
import type { PressableProps, TextProps } from "react-native"
import type { ComponentRef, ReactNode, Ref } from "react"
import type { IconProps } from "@/components/ui/icon"

import { createContext, use } from "react"
import { ActivityIndicator, Pressable, Text, View } from "react-native"

import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Icon } from "@/components/ui/icon"

/*
 * Pressed feedback follows each platform's convention:
 * - iOS and web dim the button while pressed.
 * - Android shows a ripple, clipped to the corner radius by `overflow-hidden`.
 *
 * NativeWind uses a 14px rem, so one spacing step is 3.5px:
 * sm = 35px, default = 45.5px, lg = 52.5px tall.
 * `min-h-*` rather than `h-*` lets the button grow with system font scaling.
 */
const buttonVariants = cva(
  "flex-row items-center justify-center overflow-hidden ios:active:opacity-70 web:active:opacity-70",
  {
    variants: {
      variant: {
        default: "bg-primary android:ripple-highlight-inverse",
        secondary: "bg-secondary android:ripple-highlight",
        outline: "border border-border bg-transparent android:ripple-highlight",
        ghost: "bg-transparent android:ripple-highlight",
        destructive: "bg-destructive android:ripple-highlight-inverse",
      },
      size: {
        sm: "min-h-10 rounded-lg px-3.5 py-1.5",
        default: "min-h-13 rounded-xl px-5 py-2",
        lg: "min-h-15 rounded-2xl px-6 py-2.5",
        icon: "size-13 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

/*
 * Foreground color (`variant`) and type size (`size`). Labels use both;
 * icons and the loading spinner use the color only.
 */
const buttonTextVariants = cva("text-center font-semibold", {
  variants: {
    variant: {
      default: "text-primary-foreground",
      secondary: "text-secondary-foreground",
      outline: "text-foreground",
      ghost: "text-foreground",
      destructive: "text-destructive-foreground",
    },
    size: {
      sm: "text-base",
      default: "text-lg",
      lg: "text-xl",
      icon: "text-lg",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

/* Space between an icon and the label. */
const buttonContentVariants = cva("flex-row items-center justify-center", {
  variants: {
    size: {
      sm: "gap-1.5",
      default: "gap-2",
      lg: "gap-2.5",
      icon: "gap-2",
    },
  },
})

type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>
type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>["size"]>

const iconPointSizes: Record<ButtonSize, number> = {
  sm: 16,
  default: 18,
  lg: 20,
  icon: 20,
}

/* Extends the 35px `sm` button to a 45px touch target without changing its layout. */
const hitSlops: Partial<Record<ButtonSize, number>> = {
  sm: 5,
}

type ButtonContextValue = {
  variant: ButtonVariant
  size: ButtonSize
}

const ButtonContext = createContext<ButtonContextValue | null>(null)

function useButtonContext(component: string) {
  const context = use(ButtonContext)
  if (!context) {
    throw new Error(`<${component}> must be rendered inside <Button>.`)
  }
  return context
}

type ButtonBaseProps = Omit<PressableProps, "children"> & {
  ref?: Ref<ComponentRef<typeof Pressable>>
  /** Visual style. Defaults to `"default"`. */
  variant?: ButtonVariant
  /** Shows a spinner, keeps the button's width, and ignores presses. */
  loading?: boolean
  /**
   * Classes for the row that holds the children. It hugs its content and is
   * centered by default; `flex-1 justify-between` spreads children edge to edge.
   */
  contentClassName?: string
  /**
   * A string is rendered as the label. For icons, compose
   * `<ButtonIcon />` and `<ButtonText />` as children.
   */
  children?: ReactNode
}

/* Icon-only buttons have no visible text, so a screen reader label is required. */
type ButtonProps = ButtonBaseProps & (
  | { size?: Exclude<ButtonSize, "icon"> }
  | { size: "icon", accessibilityLabel: string }
)

function Button({
  variant = "default",
  size = "default",
  loading = false,
  disabled,
  className,
  contentClassName,
  children,
  hitSlop,
  role = "button",
  accessibilityLabel,
  ...props
}: ButtonProps) {
  const isDisabled = disabled === true || loading
  const isTextChild = typeof children === "string" || typeof children === "number"
  // The label stays announced while it is visually hidden for loading.
  const label = accessibilityLabel ?? (isTextChild
    ? String(children)
    : undefined)

  return (
    <ButtonContext value={{ variant, size }}>
      <Pressable
        role={role}
        accessibilityLabel={label}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={loading}
        hitSlop={hitSlop ?? hitSlops[size]}
        className={cn(
          buttonVariants({ variant, size }),
          disabled === true && "opacity-50",
          className,
        )}
        {...props}
      >
        {/* Hidden rather than removed while loading, so the width stays the same. */}
        <View className={cn(buttonContentVariants({ size }), contentClassName, loading && "opacity-0")}>
          {isTextChild
            ? <ButtonText>{children}</ButtonText>
            : children}
        </View>
        {loading && (
          <View className="absolute inset-0 items-center justify-center">
            <ActivityIndicator size="small" className={buttonTextVariants({ variant })} />
          </View>
        )}
      </Pressable>
    </ButtonContext>
  )
}

type ButtonTextProps = TextProps

/** A label that takes its color and type size from the parent `<Button>`. */
function ButtonText({ className, ...props }: ButtonTextProps) {
  const { variant, size } = useButtonContext("ButtonText")

  return <Text className={cn(buttonTextVariants({ variant, size }), className)} {...props} />
}

type ButtonIconProps = Omit<IconProps, "size" | "accessibilityLabel"> & {
  /** Point size. Defaults to a size matched to the button size. */
  size?: number
}

/**
 * An SF Symbol (iOS) or Material Symbol (Android, web) colored to match the
 * parent `<Button>`. Decorative: the button's label is what gets announced.
 */
function ButtonIcon({ className, size, ...props }: ButtonIconProps) {
  const context = useButtonContext("ButtonIcon")

  return (
    <Icon
      size={size ?? iconPointSizes[context.size]}
      className={cn(buttonTextVariants({ variant: context.variant }), className)}
      {...props}
    />
  )
}

export {
  Button,
  ButtonIcon,
  type ButtonIconProps,
  type ButtonProps,
  type ButtonSize,
  ButtonText,
  type ButtonTextProps,
  type ButtonVariant,
}
