/*
 * The health-data consent shown at onboarding. Shared by the app (to show
 * it) and the API (to accept only the current version).
 *
 * Any change to the text needs a new version: users who agreed to an older
 * version are asked to consent again.
 *
 * TODO(counsel): DRAFT copy, not legally reviewed. Replace before launch (R1, R3).
 */
const CURRENT_CONSENT_VERSION = "2026-11-11.draft-1"

type ConsentSection = {
  id: "wellness" | "not-a-diagnosis" | "health-data" | "get-help"
  title: string
  body: string
}

const consentSections: Array<ConsentSection> = [
  {
    id: "wellness",
    title: "A wellness and education app",
    body: "Fisio offers guided self-care, exercise, and education for lower back pain.",
  },
  {
    id: "not-a-diagnosis",
    title: "Not a medical diagnosis",
    body: "Fisio doesn't diagnose conditions, provide medical treatment, or replace care from a licensed healthcare professional.",
  },
  {
    id: "health-data",
    title: "Your health data",
    body: "To personalize your program, Fisio stores where you feel pain, your assessment answers, pain ratings, and the sessions you complete. It's stored in the US, never sold, and you can export or delete it at any time.",
  },
  {
    id: "get-help",
    title: "Get help if you need it",
    body: "Seek medical care right away for severe or worsening symptoms, or any concerns about your health. In an emergency, call 911.",
  },
]

export {
  type ConsentSection,
  consentSections,
  CURRENT_CONSENT_VERSION,
}
