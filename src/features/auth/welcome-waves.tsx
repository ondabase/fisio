import type { LayoutChangeEvent, ViewProps } from "react-native"

import { useState } from "react"
import { useWindowDimensions, View } from "react-native"

import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg"

import { cn } from "@/lib/utils"

const WIDTH = 680
const HEIGHT = 304

type WelcomeWavesProps = ViewProps

/**
 * Decorative layered waves along the bottom of the welcome screen. Spans the
 * full width and is at least as tall as the artwork's aspect ratio; give it
 * `grow` to stretch it down into any extra height on taller screens.
 */
function WelcomeWaves({ className, style, onLayout, ...props }: WelcomeWavesProps) {
  const { width } = useWindowDimensions()
  const minHeight = (width * HEIGHT) / WIDTH
  // Percentage sizes don't resolve inside a flex-grown parent, so the SVG
  // gets the measured size. Until the first layout, assume the minimum.
  const [size, setSize] = useState({ width, height: minHeight })

  function handleLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout
    setSize({ width, height })
    onLayout?.(event)
  }

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={cn("w-full", className)}
      style={[
        { minHeight },
        style,
      ]}
      onLayout={handleLayout}
      {...props}
    >
      <Svg width={size.width} height={size.height} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="back" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#d6f1f2" />
            <Stop offset="1" stopColor="#e0f5f5" />
          </LinearGradient>
          <LinearGradient id="front" x1="0.7" y1="0.4" x2="0.4" y2="1">
            <Stop offset="0" stopColor="#7ad9d4" />
            <Stop offset="1" stopColor="#bdece9" />
          </LinearGradient>
        </Defs>
        <Path
          fill="url(#back)"
          d="M0 85C7.3 84 30 80.3 44 79C58 77.7 70.7 77 84 77C97.3 77 110.7 77.3 124 79C137.3 80.7 150.7 83.8 164 87C177.3 90.2 190.7 93.8 204 98C217.3 102.2 230.7 107 244 112C257.3 117 270.7 123.2 284 128C297.3 132.8 313 138.2 324 141C335 143.8 343.3 145 350 145C356.7 145 355 147 364 143C373 139 390.7 129 404 121C417.3 113 430.7 103.3 444 95C457.3 86.7 470.7 78.5 484 71C497.3 63.5 510.7 56.3 524 50C537.3 43.7 550.7 37.7 564 33C577.3 28.3 590.7 25 604 22C617.3 19 631.3 16.7 644 15C656.7 13.3 674 12.5 680 12L680 304L0 304Z"
        />
        <Path
          fill="url(#front)"
          d="M0 245C14 248 30 251 44 251C58 251 70.7 251 84 251C97.3 250.7 110.7 249.7 124 248C137.3 246.3 150.7 243.8 164 241C177.3 238.2 190.7 234.7 204 231C217.3 227.3 230.7 223.2 244 219C257.3 214.8 270.7 210.3 284 206C297.3 201.7 310.7 197 324 193C337.3 189 350.7 185.8 364 182C377.3 178.2 390.7 174 404 170C417.3 166 430.7 161.8 444 158C457.3 154.2 470.7 150 484 147C497.3 144 510.7 141.8 524 140C537.3 138.2 550.7 136.5 564 136C577.3 135.5 590.7 135.8 604 137C617.3 138.2 631.3 140.8 644 143C656.7 145.2 674 148.8 680 150L680 304L0 304Z"
        />
      </Svg>
    </View>
  )
}

export {
  WelcomeWaves,
  type WelcomeWavesProps,
}
