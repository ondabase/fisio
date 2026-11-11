# Lower back pain content 0.1.0-draft.1: clinical review

- Content: `lbp`
- Version: `0.1.0-draft.1` (draft)
- Checksum (SHA-256): `fbd30a6693d67a7a56fd4332a56005ff19330c2f3b64256d848c9a8a853858fe`
- Generated: 2026-11-11
- Vignettes: 32 of 32 passed

> **DRAFT. Not clinically approved.** This version may contain placeholder content.

## Sign-off

I have reviewed every question, rule, track, exercise, and vignette in this document and approve this content version, identified by the checksum above, for use.

- Name and credentials: ______________________
- Signature: ______________________
- Date: ______________________

Record the approval with `npm run content:approve`.

## Body regions

- `lower-back`: Lower back
- `buttock-left`: Left buttock
- `buttock-right`: Right buttock
- `thigh-back-left`: Back of left thigh
- `thigh-back-right`: Back of right thigh
- `below-knee-left`: Left leg below the knee
- `below-knee-right`: Right leg below the knee

## Assessment

Starts at `pain-regions`.

#### `pain-regions`

> Where does it hurt?

Help: Tap the areas where you're feeling pain.

- Answers: Body regions: `lower-back`, `buttock-left`, `buttock-right`, `thigh-back-left`, `thigh-back-right`, `below-knee-left`, `below-knee-right`
- Then → `saddle-numbness`

#### `saddle-numbness`

> Since your back pain started, have you had new numbness or tingling in your groin, genitals, inner thighs, or around your bottom?

Help: This is the area that would touch a bicycle saddle.

- Answers: Yes or no
- Then → `bladder-bowel`

#### `bladder-bowel`

> Have you had new trouble starting or controlling urination, or new loss of bowel control?

- Answers: Yes or no
- Then → `leg-weakness`

#### `leg-weakness`

> Do you have new or worsening weakness in a leg or foot, such as your foot catching or dragging when you walk?

- Answers: Yes or no
- Then → `fever`

#### `fever`

> Have you had a fever or chills, or felt generally unwell, along with your back pain?

- Answers: Yes or no
- Then → `cancer-history`

#### `cancer-history`

> Have you ever been diagnosed with cancer?

- Answers: Yes or no
- Then → `weight-loss`

#### `weight-loss`

> Have you lost weight recently without trying?

- Answers: Yes or no
- Then → `trauma`

#### `trauma`

> Did your pain start after a significant fall, accident, or injury?

- Answers: Yes or no
- Then → `night-pain`

#### `night-pain`

> Is your pain constant and severe at night, without easing in any position?

- Answers: Yes or no
- Then → `duration`

#### `duration`

> How long have you had this back pain?

- Answers: One of: Less than 6 weeks (`under-6-weeks`), 6 to 12 weeks (`6-to-12-weeks`), More than 12 weeks (`over-12-weeks`)
- Then → `pain-intensity`

#### `pain-intensity`

> On average, how intense has your back pain been in the last 7 days?

- Answers: 0 (No pain) to 10 (Worst pain imaginable)
- If `pain-regions` includes any of below-knee-left, below-knee-right → `leg-symptoms`
- Otherwise → `daily-impact`

#### `leg-symptoms`

> Which bothers you more?

- Answers: One of: My back (`back-more`), My leg (`leg-more`), About the same (`about-same`)
- Then → `daily-impact`

#### `daily-impact`

> How much does your pain get in the way of your daily activities?

- Answers: 0 (Not at all) to 10 (Completely)
- Then → finish

### Safety rules

Urgent: seek care now, with a call-911 screen. Refer: see a clinician before starting; the program stays locked. A rule that stops early ends the assessment as soon as it holds.

| Rule | Severity | Stops early | When | Why |
|---|---|---|---|---|
| `saddle-numbness` | urgent | yes | `saddle-numbness` is yes | New saddle numbness can be a sign of cauda equina syndrome. |
| `bladder-bowel-change` | urgent | yes | `bladder-bowel` is yes | New bladder or bowel dysfunction can be a sign of cauda equina syndrome. |
| `progressive-weakness` | urgent | yes | `leg-weakness` is yes | New or worsening leg weakness can mean nerve compression that needs urgent assessment. |
| `possible-infection` | refer | no | `fever` is yes | Fever or feeling unwell with back pain can be a sign of infection. |
| `cancer-history` | refer | no | `cancer-history` is yes | A history of cancer needs a clinician to rule out spread to the spine. |
| `unexplained-weight-loss` | refer | no | `weight-loss` is yes | Unexplained weight loss with back pain needs medical assessment. |
| `significant-trauma` | refer | no | `trauma` is yes | Pain after significant trauma needs a clinician to rule out a fracture. |
| `constant-night-pain` | refer | no | `night-pain` is yes | Constant, severe night pain that no position eases needs medical assessment. |

### Track selection

For eligible users only (no safety rule held). The first rule that holds picks the track and starting phase.

1. If all of (`pain-regions` includes any of below-knee-left, below-knee-right; `leg-symptoms` is one of leg-more, about-same) → `leg-symptoms`, phase `calm`
2. If all of (`duration` is over-12-weeks; `pain-intensity` is at most 4; `daily-impact` is at most 4) → `general`, phase `build`
3. Otherwise → `general`, phase `calm`

## Tracks

### Back mobility and strength (`general`)

Gentle movement first, then strength and control for everyday activities.

#### Phase 1: Calm and move (`calm`)

Ease pain with gentle, regular movement.

- **Gentle mobility** (`calm-a`)
  - Pelvic tilt: 2 sets, 10 reps
  - Knee to chest: 2 sets, 20 s hold
  - Cat-cow: 2 sets, 8 reps
  - Walking: 1 set, 600 s hold

#### Phase 2: Build (`build`)

Add control and endurance for your back and hips.

- **Core and hips** (`build-a`)
  - Cat-cow: 1 set, 8 reps
  - Glute bridge: 3 sets, 10 reps
  - Bird dog: 2 sets, 8 reps
  - Walking: 1 set, 900 s hold

#### Phase 3: Strengthen (`strengthen`)

Build strength so everyday tasks feel easier.

- **Strength and stability** (`strengthen-a`)
  - Glute bridge: 3 sets, 12 reps
  - Bird dog: 3 sets, 10 reps
  - Dead bug: 3 sets, 8 reps
  - Side plank on knees: 2 sets, 20 s hold

### Back and leg symptoms (`leg-symptoms`)

Gentle movement that's kind to irritated nerves, then a gradual return to strength.

#### Phase 1: Calm (`calm`)

Settle leg symptoms with gentle movement and short walks.

- **Gentle start** (`leg-calm-a`)
  - Pelvic tilt: 2 sets, 10 reps
  - Seated nerve glide: 2 sets, 8 reps
  - Walking: 1 set, 300 s hold

#### Phase 2: Build (`build`)

Add hip and core control as leg symptoms settle.

- **Control** (`leg-build-a`)
  - Seated nerve glide: 2 sets, 10 reps
  - Glute bridge: 2 sets, 10 reps
  - Bird dog: 2 sets, 6 reps
  - Walking: 1 set, 600 s hold

#### Phase 3: Strengthen (`strengthen`)

Return to full strength work.

- **Strength** (`leg-strengthen-a`)
  - Glute bridge: 3 sets, 12 reps
  - Bird dog: 3 sets, 10 reps
  - Dead bug: 2 sets, 8 reps
  - Walking: 1 set, 900 s hold

## Exercises

### Pelvic tilt (`pelvic-tilt`)

Video: not recorded yet

Cues:
- Lie on your back with your knees bent.
- Gently flatten your lower back into the floor, then relax.

Stop rules:
- Stop if pain spreads further down your leg.
- Stop if you feel new numbness, tingling, or weakness.
- Stop if pain goes above 5 out of 10 and doesn't settle within a minute of resting.

### Knee to chest (`knee-to-chest`)

Video: not recorded yet

Cues:
- Lie on your back.
- Bring one knee toward your chest and hold, then switch sides.

Stop rules:
- Stop if pain spreads further down your leg.
- Stop if you feel new numbness, tingling, or weakness.
- Stop if pain goes above 5 out of 10 and doesn't settle within a minute of resting.

### Cat-cow (`cat-cow`)

Video: not recorded yet

Cues:
- Start on hands and knees.
- Slowly round your back up, then let it sag gently. Move within a comfortable range.

Stop rules:
- Stop if pain spreads further down your leg.
- Stop if you feel new numbness, tingling, or weakness.
- Stop if pain goes above 5 out of 10 and doesn't settle within a minute of resting.

### Walking (`walking`)

Video: not recorded yet

Cues:
- Walk at a comfortable pace on flat ground.
- Shorter, more frequent walks are fine.

Stop rules:
- Stop if pain spreads further down your leg.
- Stop if you feel new numbness, tingling, or weakness.
- Stop if pain goes above 5 out of 10 and doesn't settle within a minute of resting.

### Glute bridge (`glute-bridge`)

Video: not recorded yet

Cues:
- Lie on your back with your knees bent and feet flat.
- Squeeze your glutes and lift your hips until your body forms a straight line, then lower slowly.

Stop rules:
- Stop if pain spreads further down your leg.
- Stop if you feel new numbness, tingling, or weakness.
- Stop if pain goes above 5 out of 10 and doesn't settle within a minute of resting.

### Bird dog (`bird-dog`)

Video: not recorded yet

Cues:
- Start on hands and knees with a flat back.
- Reach one arm forward and the opposite leg back, hold briefly, then switch.

Stop rules:
- Stop if pain spreads further down your leg.
- Stop if you feel new numbness, tingling, or weakness.
- Stop if pain goes above 5 out of 10 and doesn't settle within a minute of resting.

### Dead bug (`dead-bug`)

Video: not recorded yet

Cues:
- Lie on your back with arms up and knees bent over your hips.
- Slowly lower the opposite arm and leg while keeping your lower back still.

Stop rules:
- Stop if pain spreads further down your leg.
- Stop if you feel new numbness, tingling, or weakness.
- Stop if pain goes above 5 out of 10 and doesn't settle within a minute of resting.

### Side plank on knees (`side-plank-knees`)

Video: not recorded yet

Cues:
- Lie on your side propped on your elbow, knees bent.
- Lift your hips so your body is straight from knees to head, and hold.

Stop rules:
- Stop if pain spreads further down your leg.
- Stop if you feel new numbness, tingling, or weakness.
- Stop if pain goes above 5 out of 10 and doesn't settle within a minute of resting.

### Seated nerve glide (`nerve-glide`)

Video: not recorded yet

Cues:
- Sit tall on a chair.
- Straighten one knee while tipping your head back, then bend the knee as you look down. Keep it gentle.

Stop rules:
- Stop if pain spreads further down your leg.
- Stop if you feel new numbness, tingling, or weakness.
- Stop if pain goes above 5 out of 10 and doesn't settle within a minute of resting.

## Weekly check-in

Starts at `checkin-saddle-numbness`.

#### `checkin-saddle-numbness`

> This week, have you had new numbness or tingling in your groin, genitals, inner thighs, or around your bottom?

- Answers: Yes or no
- Then → `checkin-bladder-bowel`

#### `checkin-bladder-bowel`

> This week, have you had new trouble starting or controlling urination, or new loss of bowel control?

- Answers: Yes or no
- Then → `checkin-leg-weakness`

#### `checkin-leg-weakness`

> This week, have you had new or worsening weakness in a leg or foot?

- Answers: Yes or no
- Then → `checkin-new-symptoms`

#### `checkin-new-symptoms`

> Have you had any new symptoms that worry you, such as fever, unexplained weight loss, or constant pain at night?

- Answers: Yes or no
- Then → `checkin-change`

#### `checkin-change`

> Compared with last week, how is your back?

- Answers: One of: Better (`better`), About the same (`same`), Worse (`worse`)
- Then → `checkin-pain`

#### `checkin-pain`

> On average, how intense was your back pain this week?

- Answers: 0 (No pain) to 10 (Worst pain imaginable)
- Then → `checkin-adherence`

#### `checkin-adherence`

> How many of this week's sessions did you do?

- Answers: One of: All or most (`most`), About half (`some`), Few or none (`few`)
- Then → finish

### Red-flag re-screen

Any rule that holds stops the program and refers the user.

| Rule | Severity | Stops early | When | Why |
|---|---|---|---|---|
| `checkin-saddle-numbness` | urgent | yes | `checkin-saddle-numbness` is yes | New saddle numbness can be a sign of cauda equina syndrome. |
| `checkin-bladder-bowel-change` | urgent | yes | `checkin-bladder-bowel` is yes | New bladder or bowel dysfunction can be a sign of cauda equina syndrome. |
| `checkin-progressive-weakness` | urgent | yes | `checkin-leg-weakness` is yes | New or worsening leg weakness needs urgent assessment. |
| `checkin-new-symptoms` | refer | no | `checkin-new-symptoms` is yes | New worrying symptoms need a clinician before continuing. |

### Adjustment rules

The first rule that holds proposes a decision.

1. `worse-regress`: if `checkin-change` is worse → regress
2. `low-adherence-hold`: if `checkin-adherence` is few → hold
3. `better-progress`: if all of (`checkin-change` is better; `checkin-adherence` is most; `checkin-pain` is at most 5) → progress
4. `default-hold`: otherwise → hold

The user counts as worse when any of (`checkin-change` is worse; `checkin-pain` is at least 8).

The engine then applies these safety rules, whatever the content says:

1. Any red flag at the re-screen stops the program and refers the user.
2. A user who is worse never progresses: progress becomes hold.
3. A program can't move before its first phase or past its last: those become hold.

## Vignettes

| Vignette | Result | Scenario |
|---|---|---|
| `acute-back-only` | pass | Recent back pain, no red flags, moderate pain: general track from the start. |
| `chronic-mild-low-impact` | pass | Long-standing mild pain with little daily impact: general track, skipping ahead to build. |
| `chronic-mild-high-impact` | pass | Long-standing mild pain that still limits daily life: start gently. |
| `chronic-moderate` | pass | Long-standing moderate pain: start gently. |
| `subacute-mild` | pass | 6 to 12 weeks of mild pain doesn't skip ahead; only long-standing pain does. |
| `leg-dominant` | pass | Pain below the knee that bothers more than the back: leg symptoms track. |
| `leg-about-same` | pass | Leg and back bother about the same: leg symptoms track. |
| `leg-but-back-more` | pass | Pain below the knee, but the back bothers more: general track. |
| `buttock-and-thigh-only` | pass | Pain into the buttock and thigh but not below the knee: no leg question, general track. |
| `unasked-answer-ignored` | pass | An answer to the leg question when no leg region was marked is ignored. |
| `saddle-numbness-stops` | pass | Saddle numbness stops the assessment immediately as urgent. |
| `saddle-numbness-stops-even-with-later-answers` | pass | Saddle numbness stops at that question even if later answers were sent. |
| `bladder-bowel-stops` | pass | New bladder or bowel trouble stops the assessment as urgent. |
| `leg-weakness-stops` | pass | New or worsening leg weakness stops the assessment as urgent. |
| `fever-refers` | pass | Fever with back pain: see a clinician first. |
| `cancer-history-refers` | pass | History of cancer: see a clinician first. |
| `weight-loss-refers` | pass | Unexplained weight loss: see a clinician first. |
| `trauma-refers` | pass | Pain after significant trauma: see a clinician first. |
| `night-pain-refers` | pass | Constant severe night pain: see a clinician first. |
| `several-refer-flags` | pass | Cancer history with weight loss raises both flags. |
| `refer-overrides-track` | pass | A refer flag means no program, even when a track would otherwise match. |
| `checkin-better-progresses` | pass | Better, did most sessions, pain 5 or less: move up a phase. |
| `checkin-better-final-phase-holds` | pass | Better in the final phase: stay there. |
| `checkin-worse-regresses` | pass | Worse: move back a phase. |
| `checkin-worse-first-phase-holds` | pass | Worse in the first phase: stay there. |
| `checkin-same-holds` | pass | About the same: stay in the phase. |
| `checkin-low-adherence-holds` | pass | Better but did few sessions: stay in the phase. |
| `checkin-better-but-high-pain-holds` | pass | Better but pain still above 5: stay in the phase. |
| `checkin-saddle-numbness-stops` | pass | Saddle numbness at check-in stops the program. |
| `checkin-new-symptoms-stops` | pass | New worrying symptoms stop the program and refer. |
| `checkin-bladder-bowel-stops` | pass | New bladder or bowel trouble at check-in stops the program. |
| `checkin-leg-weakness-stops` | pass | New leg weakness at check-in stops the program. |
