/*
 * PLACEHOLDER ARTWORK. A simple figure so the body map can be built and
 * tested; the designer's SVG replaces these paths (PLAN.md A5). Keep the
 * region IDs: they must match the content bundle's regions.
 *
 * Coordinates are in a 200 × 440 viewBox. In the back view the figure faces
 * away, so the user's left is on the left of the screen; the front view is
 * mirrored.
 */

const VIEW_BOX = { width: 200, height: 440 } as const

/** Rendered height in points. At this size every tap target is at least 44pt. */
const RENDERED_HEIGHT = 420

type View = "back" | "front"

type FigureRegion = {
  /** A region ID from the content bundle. */
  regionId: string
  /** The drawn shape. */
  path: string
  /**
   * The tap target: a rectangle at least 44pt square at the rendered size,
   * larger than the drawn shape so narrow regions are easy to hit.
   */
  hit: { x: number, y: number, width: number, height: number }
}

/* The parts of the body that aren't selectable, drawn in both views. */
const silhouette = [
  // Head and neck.
  "M100 12 a22 22 0 1 1 -0.01 0 Z",
  "M92 54 h16 v14 h-16 Z",
  // Arms.
  "M62 72 L46 80 L36 196 L48 199 L58 102 Z",
  "M138 72 L154 80 L164 196 L152 199 L142 102 Z",
  // Upper torso.
  "M62 70 Q100 62 138 70 L142 148 L58 148 Z",
  // Knees.
  "M68 320 L96 320 L95 336 L70 336 Z",
  "M104 320 L132 320 L130 336 L105 336 Z",
]

/* Drawn regions shared by both views; only their region IDs differ by side. */
const shapes = {
  lowerBack: "M58 148 L142 148 L140 190 L60 190 Z",
  hipsLeftSide: "M60 190 L100 190 L100 236 Q80 244 62 232 Z",
  hipsRightSide: "M100 190 L140 190 L138 232 Q120 244 100 236 Z",
  thighLeftSide: "M62 234 Q80 246 99 238 L96 320 L68 320 Z",
  thighRightSide: "M101 238 Q120 246 138 234 L132 320 L104 320 Z",
  shinLeftSide: "M70 336 L95 336 L92 410 L96 424 L72 424 L74 410 Z",
  shinRightSide: "M105 336 L130 336 L126 410 L128 424 L104 424 L108 410 Z",
}

/* Tap targets for the left and right side of the screen. */
const hits = {
  lowerBack: {
    x: 40,
    y: 138,
    width: 120,
    height: 50,
  },
  hipsLeftSide: { x: 40, y: 188, width: 60, height: 48 },
  hipsRightSide: {
    x: 100,
    y: 188,
    width: 60,
    height: 48,
  },
  thighLeftSide: { x: 45, y: 236, width: 55, height: 92 },
  thighRightSide: {
    x: 100,
    y: 236,
    width: 55,
    height: 92,
  },
  shinLeftSide: {
    x: 50,
    y: 328,
    width: 50,
    height: 104,
  },
  shinRightSide: {
    x: 100,
    y: 328,
    width: 50,
    height: 104,
  },
}

const figureRegions: Record<View, Array<FigureRegion>> = {
  // Facing away: screen left is the user's left.
  back: [
    { regionId: "lower-back", path: shapes.lowerBack, hit: hits.lowerBack },
    { regionId: "buttock-left", path: shapes.hipsLeftSide, hit: hits.hipsLeftSide },
    { regionId: "buttock-right", path: shapes.hipsRightSide, hit: hits.hipsRightSide },
    { regionId: "thigh-back-left", path: shapes.thighLeftSide, hit: hits.thighLeftSide },
    { regionId: "thigh-back-right", path: shapes.thighRightSide, hit: hits.thighRightSide },
    { regionId: "below-knee-left", path: shapes.shinLeftSide, hit: hits.shinLeftSide },
    { regionId: "below-knee-right", path: shapes.shinRightSide, hit: hits.shinRightSide },
  ],
  // Facing the user: screen left is the user's right. Only the lower legs
  // are selectable from the front; the other regions are on the back.
  front: [
    { regionId: "below-knee-right", path: shapes.shinLeftSide, hit: hits.shinLeftSide },
    { regionId: "below-knee-left", path: shapes.shinRightSide, hit: hits.shinRightSide },
  ],
}

/* Front-view parts that aren't selectable: the pelvis and front of the thighs. */
const frontSilhouette = [
  shapes.lowerBack,
  shapes.hipsLeftSide,
  shapes.hipsRightSide,
  shapes.thighLeftSide,
  shapes.thighRightSide,
]

/** Which side of the screen is the user's left, per view, for the orientation labels. */
const leftSide: Record<View, "start" | "end"> = {
  back: "start",
  front: "end",
}

export {
  type FigureRegion,
  figureRegions,
  frontSilhouette,
  leftSide,
  RENDERED_HEIGHT,
  silhouette,
  type View,
  VIEW_BOX,
}
