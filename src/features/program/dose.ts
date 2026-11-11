/** How a dose reads: "2 × 10 reps", "1 × 10 min", "2 × 20 s hold". */
function describeDose(dose: { sets: number, reps?: number | undefined, holdSeconds?: number | undefined }) {
  const parts: Array<string> = []
  if (dose.reps !== undefined) {
    parts.push(`${dose.reps} reps`)
  }
  if (dose.holdSeconds !== undefined) {
    parts.push(dose.holdSeconds >= 60 && dose.holdSeconds % 60 === 0
      ? `${dose.holdSeconds / 60} min`
      : `${dose.holdSeconds} s hold`)
  }
  return `${dose.sets} × ${parts.join(", ")}`
}

export { describeDose }
