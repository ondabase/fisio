import type { BundleInput } from "@/clinical/schema/bundle"

/*
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ DRAFT — NOT CLINICALLY APPROVED.                                     │
 * │ Placeholder content drafted from common published low back pain      │
 * │ red-flag and self-management guidance, so the engine, vignettes, and │
 * │ UI can be built. The PT replaces or signs every question, rule,      │
 * │ track, and exercise before any user sees it (PLAN.md, M2 and R2).    │
 * └──────────────────────────────────────────────────────────────────────┘
 */

/** A single unconditional edge to the next question. */
function then(goto: string) {
  return [
    { goto },
  ]
}

const commonStopRules = [
  "Stop if pain spreads further down your leg.",
  "Stop if you feel new numbness, tingling, or weakness.",
  "Stop if pain goes above 5 out of 10 and doesn't settle within a minute of resting.",
]

const lbpContent = {
  schemaVersion: 1,
  id: "lbp",
  version: "0.1.0-draft.1",
  title: "Lower back pain",

  // IDs match the body-map SVG paths (M3).
  regions: [
    { id: "lower-back", label: "Lower back" },
    { id: "buttock-left", label: "Left buttock" },
    { id: "buttock-right", label: "Right buttock" },
    { id: "thigh-back-left", label: "Back of left thigh" },
    { id: "thigh-back-right", label: "Back of right thigh" },
    { id: "below-knee-left", label: "Left leg below the knee" },
    { id: "below-knee-right", label: "Right leg below the knee" },
  ],

  assessment: {
    start: "pain-regions",
    questions: [
      {
        id: "pain-regions",
        type: "body-map",
        prompt: "Where does it hurt?",
        help: "Tap the areas where you're feeling pain.",
        next: then("saddle-numbness"),
      },
      {
        id: "saddle-numbness",
        type: "yes-no",
        prompt: "Since your back pain started, have you had new numbness or tingling in your groin, genitals, inner thighs, or around your bottom?",
        help: "This is the area that would touch a bicycle saddle.",
        next: then("bladder-bowel"),
      },
      {
        id: "bladder-bowel",
        type: "yes-no",
        prompt: "Have you had new trouble starting or controlling urination, or new loss of bowel control?",
        next: then("leg-weakness"),
      },
      {
        id: "leg-weakness",
        type: "yes-no",
        prompt: "Do you have new or worsening weakness in a leg or foot, such as your foot catching or dragging when you walk?",
        next: then("fever"),
      },
      {
        id: "fever",
        type: "yes-no",
        prompt: "Have you had a fever or chills, or felt generally unwell, along with your back pain?",
        next: then("cancer-history"),
      },
      {
        id: "cancer-history",
        type: "yes-no",
        prompt: "Have you ever been diagnosed with cancer?",
        next: then("weight-loss"),
      },
      {
        id: "weight-loss",
        type: "yes-no",
        prompt: "Have you lost weight recently without trying?",
        next: then("trauma"),
      },
      {
        id: "trauma",
        type: "yes-no",
        prompt: "Did your pain start after a significant fall, accident, or injury?",
        next: then("night-pain"),
      },
      {
        id: "night-pain",
        type: "yes-no",
        prompt: "Is your pain constant and severe at night, without easing in any position?",
        next: then("duration"),
      },
      {
        id: "duration",
        type: "single",
        prompt: "How long have you had this back pain?",
        options: [
          { id: "under-6-weeks", label: "Less than 6 weeks" },
          { id: "6-to-12-weeks", label: "6 to 12 weeks" },
          { id: "over-12-weeks", label: "More than 12 weeks" },
        ],
        next: then("pain-intensity"),
      },
      {
        id: "pain-intensity",
        type: "scale",
        prompt: "On average, how intense has your back pain been in the last 7 days?",
        min: 0,
        max: 10,
        minLabel: "No pain",
        maxLabel: "Worst pain imaginable",
        next: [
          // Only ask about leg symptoms when the user marked a leg below the knee.
          {
            when: {
              op: "includes",
              question: "pain-regions",
              anyOf: ["below-knee-left", "below-knee-right"],
            },
            goto: "leg-symptoms",
          },
          { goto: "daily-impact" },
        ],
      },
      {
        id: "leg-symptoms",
        type: "single",
        prompt: "Which bothers you more?",
        options: [
          { id: "back-more", label: "My back" },
          { id: "leg-more", label: "My leg" },
          { id: "about-same", label: "About the same" },
        ],
        next: then("daily-impact"),
      },
      {
        id: "daily-impact",
        type: "scale",
        prompt: "How much does your pain get in the way of your daily activities?",
        min: 0,
        max: 10,
        minLabel: "Not at all",
        maxLabel: "Completely",
        next: [
          { goto: "complete" },
        ],
      },
    ],
  },

  safetyRules: [
    {
      id: "saddle-numbness",
      severity: "urgent",
      earlyStop: true,
      when: { op: "eq", question: "saddle-numbness", value: true },
      summary: "New saddle numbness can be a sign of cauda equina syndrome.",
    },
    {
      id: "bladder-bowel-change",
      severity: "urgent",
      earlyStop: true,
      when: { op: "eq", question: "bladder-bowel", value: true },
      summary: "New bladder or bowel dysfunction can be a sign of cauda equina syndrome.",
    },
    {
      id: "progressive-weakness",
      severity: "urgent",
      earlyStop: true,
      when: { op: "eq", question: "leg-weakness", value: true },
      summary: "New or worsening leg weakness can mean nerve compression that needs urgent assessment.",
    },
    {
      id: "possible-infection",
      severity: "refer",
      earlyStop: false,
      when: { op: "eq", question: "fever", value: true },
      summary: "Fever or feeling unwell with back pain can be a sign of infection.",
    },
    {
      id: "cancer-history",
      severity: "refer",
      earlyStop: false,
      when: { op: "eq", question: "cancer-history", value: true },
      summary: "A history of cancer needs a clinician to rule out spread to the spine.",
    },
    {
      id: "unexplained-weight-loss",
      severity: "refer",
      earlyStop: false,
      when: { op: "eq", question: "weight-loss", value: true },
      summary: "Unexplained weight loss with back pain needs medical assessment.",
    },
    {
      id: "significant-trauma",
      severity: "refer",
      earlyStop: false,
      when: { op: "eq", question: "trauma", value: true },
      summary: "Pain after significant trauma needs a clinician to rule out a fracture.",
    },
    {
      id: "constant-night-pain",
      severity: "refer",
      earlyStop: false,
      when: { op: "eq", question: "night-pain", value: true },
      summary: "Constant, severe night pain that no position eases needs medical assessment.",
    },
  ],

  trackRules: [
    {
      // Leg symptoms that bother the user as much as or more than the back.
      when: {
        op: "all",
        of: [
          {
            op: "includes",
            question: "pain-regions",
            anyOf: ["below-knee-left", "below-knee-right"],
          },
          {
            op: "in",
            question: "leg-symptoms",
            values: ["leg-more", "about-same"],
          },
        ],
      },
      track: "leg-symptoms",
      phase: "calm",
    },
    {
      // Long-standing but mild pain with little daily impact can skip ahead.
      when: {
        op: "all",
        of: [
          { op: "eq", question: "duration", value: "over-12-weeks" },
          { op: "lte", question: "pain-intensity", value: 4 },
          { op: "lte", question: "daily-impact", value: 4 },
        ],
      },
      track: "general",
      phase: "build",
    },
    { track: "general", phase: "calm" },
  ],

  tracks: [
    {
      id: "general",
      title: "Back mobility and strength",
      summary: "Gentle movement first, then strength and control for everyday activities.",
      phases: [
        {
          id: "calm",
          title: "Calm and move",
          summary: "Ease pain with gentle, regular movement.",
          sessions: [
            {
              id: "calm-a",
              title: "Gentle mobility",
              doses: [
                { exercise: "pelvic-tilt", sets: 2, reps: 10 },
                { exercise: "knee-to-chest", sets: 2, holdSeconds: 20 },
                { exercise: "cat-cow", sets: 2, reps: 8 },
                { exercise: "walking", sets: 1, holdSeconds: 600 },
              ],
            },
          ],
        },
        {
          id: "build",
          title: "Build",
          summary: "Add control and endurance for your back and hips.",
          sessions: [
            {
              id: "build-a",
              title: "Core and hips",
              doses: [
                { exercise: "cat-cow", sets: 1, reps: 8 },
                { exercise: "glute-bridge", sets: 3, reps: 10 },
                { exercise: "bird-dog", sets: 2, reps: 8 },
                { exercise: "walking", sets: 1, holdSeconds: 900 },
              ],
            },
          ],
        },
        {
          id: "strengthen",
          title: "Strengthen",
          summary: "Build strength so everyday tasks feel easier.",
          sessions: [
            {
              id: "strengthen-a",
              title: "Strength and stability",
              doses: [
                { exercise: "glute-bridge", sets: 3, reps: 12 },
                { exercise: "bird-dog", sets: 3, reps: 10 },
                { exercise: "dead-bug", sets: 3, reps: 8 },
                { exercise: "side-plank-knees", sets: 2, holdSeconds: 20 },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "leg-symptoms",
      title: "Back and leg symptoms",
      summary: "Gentle movement that's kind to irritated nerves, then a gradual return to strength.",
      phases: [
        {
          id: "calm",
          title: "Calm",
          summary: "Settle leg symptoms with gentle movement and short walks.",
          sessions: [
            {
              id: "leg-calm-a",
              title: "Gentle start",
              doses: [
                { exercise: "pelvic-tilt", sets: 2, reps: 10 },
                { exercise: "nerve-glide", sets: 2, reps: 8 },
                { exercise: "walking", sets: 1, holdSeconds: 300 },
              ],
            },
          ],
        },
        {
          id: "build",
          title: "Build",
          summary: "Add hip and core control as leg symptoms settle.",
          sessions: [
            {
              id: "leg-build-a",
              title: "Control",
              doses: [
                { exercise: "nerve-glide", sets: 2, reps: 10 },
                { exercise: "glute-bridge", sets: 2, reps: 10 },
                { exercise: "bird-dog", sets: 2, reps: 6 },
                { exercise: "walking", sets: 1, holdSeconds: 600 },
              ],
            },
          ],
        },
        {
          id: "strengthen",
          title: "Strengthen",
          summary: "Return to full strength work.",
          sessions: [
            {
              id: "leg-strengthen-a",
              title: "Strength",
              doses: [
                { exercise: "glute-bridge", sets: 3, reps: 12 },
                { exercise: "bird-dog", sets: 3, reps: 10 },
                { exercise: "dead-bug", sets: 2, reps: 8 },
                { exercise: "walking", sets: 1, holdSeconds: 900 },
              ],
            },
          ],
        },
      ],
    },
  ],

  exercises: [
    {
      id: "pelvic-tilt",
      name: "Pelvic tilt",
      cues: ["Lie on your back with your knees bent.", "Gently flatten your lower back into the floor, then relax."],
      stopRules: commonStopRules,
      videoId: null,
    },
    {
      id: "knee-to-chest",
      name: "Knee to chest",
      cues: ["Lie on your back.", "Bring one knee toward your chest and hold, then switch sides."],
      stopRules: commonStopRules,
      videoId: null,
    },
    {
      id: "cat-cow",
      name: "Cat-cow",
      cues: ["Start on hands and knees.", "Slowly round your back up, then let it sag gently. Move within a comfortable range."],
      stopRules: commonStopRules,
      videoId: null,
    },
    {
      id: "walking",
      name: "Walking",
      cues: ["Walk at a comfortable pace on flat ground.", "Shorter, more frequent walks are fine."],
      stopRules: commonStopRules,
      videoId: null,
    },
    {
      id: "glute-bridge",
      name: "Glute bridge",
      cues: ["Lie on your back with your knees bent and feet flat.", "Squeeze your glutes and lift your hips until your body forms a straight line, then lower slowly."],
      stopRules: commonStopRules,
      videoId: null,
    },
    {
      id: "bird-dog",
      name: "Bird dog",
      cues: ["Start on hands and knees with a flat back.", "Reach one arm forward and the opposite leg back, hold briefly, then switch."],
      stopRules: commonStopRules,
      videoId: null,
    },
    {
      id: "dead-bug",
      name: "Dead bug",
      cues: ["Lie on your back with arms up and knees bent over your hips.", "Slowly lower the opposite arm and leg while keeping your lower back still."],
      stopRules: commonStopRules,
      videoId: null,
    },
    {
      id: "side-plank-knees",
      name: "Side plank on knees",
      cues: ["Lie on your side propped on your elbow, knees bent.", "Lift your hips so your body is straight from knees to head, and hold."],
      stopRules: commonStopRules,
      videoId: null,
    },
    {
      id: "nerve-glide",
      name: "Seated nerve glide",
      cues: ["Sit tall on a chair.", "Straighten one knee while tipping your head back, then bend the knee as you look down. Keep it gentle."],
      stopRules: commonStopRules,
      videoId: null,
    },
  ],

  checkIn: {
    questionnaire: {
      start: "checkin-saddle-numbness",
      questions: [
        {
          id: "checkin-saddle-numbness",
          type: "yes-no",
          prompt: "This week, have you had new numbness or tingling in your groin, genitals, inner thighs, or around your bottom?",
          next: then("checkin-bladder-bowel"),
        },
        {
          id: "checkin-bladder-bowel",
          type: "yes-no",
          prompt: "This week, have you had new trouble starting or controlling urination, or new loss of bowel control?",
          next: then("checkin-leg-weakness"),
        },
        {
          id: "checkin-leg-weakness",
          type: "yes-no",
          prompt: "This week, have you had new or worsening weakness in a leg or foot?",
          next: then("checkin-new-symptoms"),
        },
        {
          id: "checkin-new-symptoms",
          type: "yes-no",
          prompt: "Have you had any new symptoms that worry you, such as fever, unexplained weight loss, or constant pain at night?",
          next: then("checkin-change"),
        },
        {
          id: "checkin-change",
          type: "single",
          prompt: "Compared with last week, how is your back?",
          options: [
            { id: "better", label: "Better" },
            { id: "same", label: "About the same" },
            { id: "worse", label: "Worse" },
          ],
          next: then("checkin-pain"),
        },
        {
          id: "checkin-pain",
          type: "scale",
          prompt: "On average, how intense was your back pain this week?",
          min: 0,
          max: 10,
          minLabel: "No pain",
          maxLabel: "Worst pain imaginable",
          next: then("checkin-adherence"),
        },
        {
          id: "checkin-adherence",
          type: "single",
          prompt: "How many of this week's sessions did you do?",
          options: [
            { id: "most", label: "All or most" },
            { id: "some", label: "About half" },
            { id: "few", label: "Few or none" },
          ],
          next: [
            { goto: "complete" },
          ],
        },
      ],
    },
    safetyRules: [
      {
        id: "checkin-saddle-numbness",
        severity: "urgent",
        earlyStop: true,
        when: { op: "eq", question: "checkin-saddle-numbness", value: true },
        summary: "New saddle numbness can be a sign of cauda equina syndrome.",
      },
      {
        id: "checkin-bladder-bowel-change",
        severity: "urgent",
        earlyStop: true,
        when: { op: "eq", question: "checkin-bladder-bowel", value: true },
        summary: "New bladder or bowel dysfunction can be a sign of cauda equina syndrome.",
      },
      {
        id: "checkin-progressive-weakness",
        severity: "urgent",
        earlyStop: true,
        when: { op: "eq", question: "checkin-leg-weakness", value: true },
        summary: "New or worsening leg weakness needs urgent assessment.",
      },
      {
        id: "checkin-new-symptoms",
        severity: "refer",
        earlyStop: false,
        when: { op: "eq", question: "checkin-new-symptoms", value: true },
        summary: "New worrying symptoms need a clinician before continuing.",
      },
    ],
    worsening: {
      op: "any",
      of: [
        { op: "eq", question: "checkin-change", value: "worse" },
        { op: "gte", question: "checkin-pain", value: 8 },
      ],
    },
    rules: [
      {
        id: "worse-regress",
        when: { op: "eq", question: "checkin-change", value: "worse" },
        decision: "regress",
      },
      {
        id: "low-adherence-hold",
        when: { op: "eq", question: "checkin-adherence", value: "few" },
        decision: "hold",
      },
      {
        id: "better-progress",
        when: {
          op: "all",
          of: [
            { op: "eq", question: "checkin-change", value: "better" },
            { op: "eq", question: "checkin-adherence", value: "most" },
            { op: "lte", question: "checkin-pain", value: 5 },
          ],
        },
        decision: "progress",
      },
      { id: "default-hold", decision: "hold" },
    ],
  },
} satisfies BundleInput

export { lbpContent }
