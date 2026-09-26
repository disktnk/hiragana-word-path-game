# Hiragana Word Path Game Design

Visual design specification for the first playable release.

This document defines presentation and visual behavior. Functional rules,
validation, persistence, and input semantics remain defined by [SPEC.md](SPEC.md).

## 1. Design direction

The interface should feel like a calm, compact word puzzle rather than a
decorative game. The board is the visual focus, with a pale neutral page
background, white cards, dark typography, thin internal grid lines, and thick
outlines around the board shape.

The intended layout and visual hierarchy are defined below. The application
continues to use Japanese instructions and accessible names where required by
SPEC.md.

## 2. Page layout

- The page uses a pale warm-gray background.
- The game content is contained in a light card with rounded corners.
- The board is centered horizontally and appears before the word slots and
  controls.
- The layout is optimized for a narrow mobile viewport and should remain
  usable on wider desktop viewports without making the board excessively large.
- Controls are arranged in three equal-width columns for `Undo`, `Hint`, and
  `Reset`.
- Instruction groups appear below the controls as bordered, rounded accordion
  cards. The groups are:
  - How to play
  - Keyboard controls
- The board, slots, controls, and instruction cards should have consistent
  horizontal insets within the content card.

## 3. Visual tokens

The implementation MAY use equivalent values, but should preserve the same
contrast and visual relationships.

| Token | Intended use | Suggested value |
| --- | --- | --- |
| Page background | Outer page | `#f3f3f1` |
| Content background | Main card | `#fbfcff` |
| Primary text | Board letters and headings | `#111111` |
| Muted text | Secondary instructions | `#555555` |
| Grid line | Internal board lines | `#d9dde0` |
| Board outline | Outer boundary and blocked-cell outline | `#444444` |
| Blocked cell, idle | Unplayable cell | `#b8b8b8` |
| Blocked cell, dimmed | Unplayable cell under completion/path overlay | `#4b4b4b` |
| Placeholder tile | Unsolved word slot | `#e0e2e5` |
| Disabled control | Disabled button | `#dfe2e5` |
| Error / alert | Invalid path or warning | `#a33b4e` |

Use a system font stack such as `system-ui, -apple-system, "Segoe UI",
"Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, sans-serif`.

## 4. Board

- Character cells are square and have a light, nearly white fill in the idle
  state.
- Characters are centered, black, and large enough to remain legible at the
  smallest supported board size.
- Internal cell boundaries are thin and low contrast.
- The outer boundary is a dark, rounded line visibly thicker than internal
  grid lines.
- The outer boundary follows the actual union of present cells. Absent cells do
  not receive a background, grid line, padding, or rectangular placeholder.
- Blocked cells are visibly gray and use the same strong boundary treatment as
  the surrounding board geometry.
- The board must preserve square cells while scaling down to the available
  viewport width.
- The board's overall aspect ratio follows its grid dimensions, so rectangular
  puzzles remain rectangular while each individual cell stays square.
- Pointer interaction must preserve the board's rounded outer shape and must
  not introduce browser selection or scrolling during tracing.

## 5. Path rendering

Every accepted word receives one stable color based on its answer-slot order.
The default palette should be distinguishable without relying on color alone:

| Slot order | Suggested color | Reference use |
| --- | --- | --- |
| 1 | Golden yellow `#e5bd35` | First completed path |
| 2 | Purple `#9256df` | Second completed path and Hint |
| 3 | Rose `#d85272` | Third completed path |
| 4 | Blue `#5c93dc` | Fourth completed path |
| 5+ | Additional high-contrast colors | Later paths |

Paths should use rounded, semi-opaque bands connecting cell centers. They may be
implemented with an SVG overlay or an equivalent DOM/CSS layer.

- The band follows the selected cells and turns at right angles.
- Direction is visible through small chevrons or arrow markers inside the
  path. Direction markers are supplementary and must not replace accessible
  text or state cues.
- Direction is shown with black `>`-shaped chevrons placed above the cell
  borders. The design does not require circular start or end markers.
- Selected cells remain visually identifiable even when a path crosses a
  multi-cell area.
- Locked paths are visually stronger than an active path.
- An active path uses a neutral preview treatment until submission.

The design must continue to communicate selection, direction, and completion
when viewed in grayscale or by users who cannot distinguish the path colors.

## 6. Word slots

- Slots appear directly beneath the board with a compact 2px vertical gap.
- An unsolved slot is represented by one small square gray tile per grapheme;
  the tile count communicates the answer length without a separate numeric
  label. Tile gaps are 2px both horizontally and vertically.
- A solved slot displays the canonical answer string from JSON, one colored
  tile per grapheme, followed by a check mark.
- The slot uses the same color as its locked board path.
- The slot order remains the stable answer-slot order defined by SPEC.md.
- In the Hint state, newly revealed letters may use the same color family as
  the hinted answer while unrevealed slots remain gray.

## 7. Controls

- Controls use a rounded pill shape with a minimum effective target size of 44
  CSS pixels on mobile layouts.
- During an active or in-progress puzzle, the visible labels are exactly
  `Undo`, `Hint`, and `Reset`.
- After completion, the `Reset` label changes to `Replay`. Once replay starts,
  it changes back to `Reset`.
- Enabled secondary controls use a white or near-white fill with a dark thin
  outline.
- Disabled controls use a pale gray fill, muted text, and no visually strong
  emphasis.
- Hint should receive a clear focus/pressed treatment while a hint is being
  displayed.
- Reset confirmation may use the browser's native confirmation dialog in the
  MVP.

## 8. State-specific presentation

### 8.1 Initial state

- All character cells show their dark characters on the light board.
- Blocked cells are medium gray.
- All word slots are gray placeholder tiles.
- Undo is disabled because no word is locked.
- Hint is enabled with a light fill and dark outline.
- Reset may be enabled only when progress exists; otherwise it is disabled or
  omitted according to the implementation choice.

### 8.2 Hint state

- The board may be dimmed behind the current locked paths and hint marker so
  the newly revealed cell is visually prominent.
- The hinted cell is marked with a circular emphasis marker.
- Repeated Hint presses reveal the next cell in the model path and preserve
  previous hint markers for that unchanged hint state.
- A compact alert/banner appears below the board or slots with a short message
  equivalent to “Next letter revealed!” and a dismiss control when appropriate.
- If the hinted model path is blocked by the current locked paths, show the
  undo guidance defined in SPEC.md instead of marking a misleading cell.

### 8.3 Completed state

- Every board character cell belongs to a colored locked path.
- Completed paths, direction markers, endpoint checks, and solved word slots
  remain visible together.
- Immediately when completion is detected, all locked path bands perform a
  subtle completion pulse: their stroke width becomes thicker and returns to
  normal twice, then remains at the normal width.
- The completion pulse MUST run exactly twice, MUST NOT loop, and MUST finish
  quickly without changing the path colors or board geometry.
- The pulse should be implemented as a restrained visual acknowledgment rather
  than a flashy celebration. It should be disabled or reduced for users who
  request reduced motion.
- Word slots show their colored canonical answers and completion check marks.
- Undo and Hint are visually disabled after completion. The Reset control is
  relabeled `Replay` and remains available as the replay action.
- The final time and completion affordance should be visible without requiring
  the player to infer completion from board colors alone.

## 9. Interaction and accessibility presentation

- Focus indicators must remain visible on the focused character cell and on
  controls.
- The visual state must not depend on color alone: use position, shape,
  contrast, direction markers, and check marks as additional cues.
- Error and Hint messages should use the live-region behavior specified in
  SPEC.md.
- The board should not shift its geometry when a path, hint marker, or error
  message appears. Reserve space or use an overlay where necessary.

## 10. Responsive behavior

- On narrow screens, the board width is capped by the available content width
  and the cell size remains square.
- Controls remain side by side when each can maintain a 44 CSS pixel target;
  they may stack only when the viewport cannot support that minimum.
- Instruction cards may occupy the full content width.
- On wider screens, the main game card remains comfortably readable rather than
  stretching to the full viewport width.
