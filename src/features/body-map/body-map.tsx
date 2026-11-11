import { useEffect, useState } from "react"
import { Pressable, View } from "react-native"
import * as Haptics from "expo-haptics"

import Svg, { Path } from "react-native-svg"
import Animated, { interpolateColor, useAnimatedProps, useSharedValue, withTiming } from "react-native-reanimated"

import { colors } from "@/styles/colors"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { Button } from "@/components/ui/button"
import { useScreenReaderEnabled } from "@/lib/use-screen-reader"
import { ListGroup, ListRow } from "@/components/ui/list-row"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { figureRegions, frontSilhouette, leftSide, RENDERED_HEIGHT, silhouette, VIEW_BOX } from "@/features/body-map/figure"

type Region = {
  id: string
  label: string
}

type BodyMapProps = {
  /** The selectable regions, from the content bundle. */
  regions: ReadonlyArray<Region>
  /** Selected region IDs. */
  value: ReadonlyArray<string>
  onChange: (value: Array<string>) => void
}

const FIGURE_HEIGHT = RENDERED_HEIGHT
const SCALE = FIGURE_HEIGHT / VIEW_BOX.height
const FIGURE_WIDTH = VIEW_BOX.width * SCALE

const AnimatedPath = Animated.createAnimatedComponent(Path)

function RegionShape({ path, selected }: { path: string, selected: boolean }) {
  const progress = useSharedValue(selected ? 1 : 0)

  useEffect(() => {
    // Reanimated skips the animation when the system's Reduce Motion is on.
    progress.set(withTiming(selected ? 1 : 0, { duration: 160 }))
  }, [progress, selected])

  const animatedProps = useAnimatedProps(() => ({
    fill: interpolateColor(progress.get(), [0, 1], [colors.primarySoft, colors.primary]),
  }))

  return (
    <AnimatedPath
      d={path}
      animatedProps={animatedProps}
      stroke={selected ? colors.primaryDeep : colors.primary}
      strokeWidth={1.5}
      strokeOpacity={selected ? 1 : 0.45}
    />
  )
}

function toggle(value: ReadonlyArray<string>, regionId: string) {
  return value.includes(regionId)
    ? value.filter(id => id !== regionId)
    : [...value, regionId]
}

/**
 * Where it hurts: a front and back figure with tappable regions, or the same
 * regions as a checklist. Screen reader users get the checklist by default,
 * since a drawing can't be explored by touch.
 */
function BodyMap({ regions, value, onChange }: BodyMapProps) {
  const screenReader = useScreenReaderEnabled()
  const [view, setView] = useState<"back" | "front">("back")
  const [listChosen, setListChosen] = useState(false)
  const showList = listChosen || screenReader
  const known = new Set(regions.map(region => region.id))
  const shown = figureRegions[view].filter(region => known.has(region.regionId))

  function select(regionId: string) {
    void Haptics.selectionAsync()
    onChange(toggle(value, regionId))
  }

  const selectedLabels = regions.filter(region => value.includes(region.id)).map(region => region.label)

  return (
    <View className="gap-4">
      {showList
        ? (
            <ListGroup>
              {regions.map((region) => {
                const selected = value.includes(region.id)
                return (
                  <ListRow
                    key={region.id}
                    title={region.label}
                    role="checkbox"
                    aria-checked={selected}
                    onPress={() => select(region.id)}
                    trailing={selected
                      ? <Icon name={{ ios: "checkmark", android: "check", web: "check" }} size={18} weight="semibold" className="text-primary" />
                      : null}
                  />
                )
              })}
            </ListGroup>
          )
        : (
            <>
              <SegmentedControl
                accessibilityLabel="Body view"
                options={[
                  { value: "front", label: "Front" },
                  { value: "back", label: "Back" },
                ]}
                value={view}
                onChange={setView}
              />
              <View className="items-center">
                <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                  <Svg width={FIGURE_WIDTH} height={FIGURE_HEIGHT} viewBox={`0 0 ${VIEW_BOX.width} ${VIEW_BOX.height}`}>
                    {silhouette.map(path => <Path key={path} d={path} fill={colors.border} />)}
                    {view === "front" && frontSilhouette.map(path => <Path key={path} d={path} fill={colors.border} />)}
                    {shown.map(region => (
                      <RegionShape key={region.regionId} path={region.path} selected={value.includes(region.regionId)} />
                    ))}
                  </Svg>
                  {/* Invisible tap targets over the drawing, larger than the drawn shapes. */}
                  {shown.map(region => (
                    <Pressable
                      key={region.regionId}
                      testID={`body-map-${view}-${region.regionId}`}
                      onPress={() => select(region.regionId)}
                      className="absolute"
                      style={{
                        left: region.hit.x * SCALE,
                        top: region.hit.y * SCALE,
                        width: region.hit.width * SCALE,
                        height: region.hit.height * SCALE,
                      }}
                    />
                  ))}
                </View>
                <View className="flex-row justify-between" style={{ width: FIGURE_WIDTH }}>
                  <Text variant="caption" tone="muted">
                    {leftSide[view] === "start"
                      ? "Left"
                      : "Right"}
                  </Text>
                  <Text variant="caption" tone="muted">
                    {leftSide[view] === "start"
                      ? "Right"
                      : "Left"}
                  </Text>
                </View>
              </View>
            </>
          )}

      <Text
        variant="callout"
        tone={selectedLabels.length > 0
          ? "primary"
          : "muted"}
        aria-live="polite"
      >
        {selectedLabels.length > 0
          ? `Selected: ${selectedLabels.join(", ")}`
          : "Nothing selected yet."}
      </Text>

      {!screenReader && (
        <Button variant="ghost" size="sm" className="self-start" onPress={() => setListChosen(!listChosen)}>
          {listChosen ? "Use the body map" : "Choose from a list instead"}
        </Button>
      )}
    </View>
  )
}

export {
  BodyMap,
  type BodyMapProps,
  type Region,
}
