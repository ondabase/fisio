/*
 * Color values for props that take a color rather than a class: native tab
 * tints, Switch tracks, and SVG fills. These repeat tokens from global.css;
 * keep the two in sync. Use classes everywhere else.
 */
const colors = {
  primary: "#077f83",
  primarySoft: "#eaf7f5",
  primaryDeep: "#116b70",
  border: "#e4e4e7",
  card: "#ffffff",
  mutedForeground: "#5f636a",
} as const

export { colors }
