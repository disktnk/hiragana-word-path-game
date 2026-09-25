# Hiragana Word Path Game

Product and technical specification for the first playable release.

Visual presentation and state-specific design are defined in
[DESIGN.md](DESIGN.md).

- Status: Ready for MVP implementation
- Specification version: 1.0
- Puzzle schema version: 1
- Working product name: **Hiragana Word Path Game** (final name is TBD)

## 1. Summary

Build a Japanese hiragana word-path puzzle inspired by the interaction model of
LinkedIn Wend. A player drags through orthogonally adjacent character cells to
find a fixed set of hidden words. Every character cell must be used exactly
once across the completed puzzle.

The application must be a static, offline-capable web application. Its release
artifact must open directly in a browser without starting a server. Puzzle
definitions are authored as JSON files and embedded into the application at
build time.

The first release includes one test puzzle. A puzzle authoring UI, automatic
puzzle generation, and full dictionary-based uniqueness checking are explicitly
deferred.

Normative terms such as **MUST**, **SHOULD**, and **MAY** are used in their usual
requirements sense.

## 2. Goals

The MVP MUST:

1. Run from a self-contained `dist/index.html` opened through `file://`.
2. Show a puzzle-number index before opening a puzzle.
3. Support mouse, touch, and keyboard play.
4. Reproduce the essential word-tracing feel of Wend without copying its
   branding or requiring close visual fidelity.
5. Support non-rectangular board outlines and blocked gray cells.
6. Load any number of build-time-bundled puzzle JSON files without application
   code changes.
7. Display the required word lengths before they are found.
8. Accept any legal path that spells one of the target words in the correct
   direction.
9. Use every character cell at most once during play and exactly once on
   completion.
10. Provide Hint, Undo, Reset, a solve timer, and best-effort local progress
    persistence.

## 3. Non-goals for the MVP

The following are out of scope:

- Accounts, sign-in, cloud synchronization, leaderboards, streaks, or social
  sharing.
- A backend or any runtime network request.
- Analytics or telemetry.
- A puzzle editor or graphical authoring interface.
- Automatic puzzle generation.
- A production master dictionary and exhaustive dictionary-based uniqueness
  checker.
- Daily-puzzle scheduling.
- Exact visual reproduction of LinkedIn Wend.
- Kanji or katakana game boards.
- Multiple languages.

## 4. Terminology

### 4.1 Cell types

- **Character cell**: a playable cell containing one hiragana grapheme or the
  prolonged sound mark `ー`.
- **Blocked cell**: a present but unplayable gray cell. This is also informally
  called a "void" cell in project discussion.
- **Absent position**: a coordinate at which no cell exists. It is not rendered
  and receives no padding, background, grid line, or outline of its own.

### 4.2 Word and path terms

- **Target word**: a canonical hiragana string listed in the puzzle JSON's
  `answers` array.
- **Normalized word**: a target word or traced string after the normalization
  rules in Section 7 have been applied.
- **Active path**: the not-yet-submitted sequence of cells currently being
  traced.
- **Locked path**: the exact cells chosen by the player for an accepted target
  word.
- **Answer set**: the unordered set of normalized target words. Path geometry
  is not part of the answer set.

## 5. Application flow

### 5.1 Puzzle index

The initial view MUST show all bundled puzzles as clickable entries identified
by puzzle number. Puzzles MUST be sorted by numeric ID in ascending order.

Each entry SHOULD show:

- Puzzle number.
- Optional title.
- Unplayed, in-progress, or solved status.
- Best completion time when available.

Selecting an entry opens that puzzle. Hash routing MUST be used so navigation
works under `file://`, for example:

- `#/` for the puzzle index.
- `#/puzzles/0001` for puzzle 0001.

### 5.2 Game view

The game view MUST contain, in this general vertical order:

1. Back navigation and puzzle number.
2. Elapsed time.
3. The main board.
4. Word-length slots beneath the board.
5. Controls labeled exactly `Undo`, `Hint`, and `Reset`.
6. Concise Japanese instructions and keyboard help.

The board and interaction clarity matter more than decorative design. Native
controls and simple framework-default styling are acceptable.

### 5.3 Completion

The puzzle is complete when every target word has been accepted using mutually
disjoint locked paths. Because the sum of target-word lengths MUST equal the
number of character cells, this also means that every character cell is used
exactly once.

On completion, the application MUST:

- Stop the timer.
- Persist solved status and the best completion time.
- Show the final elapsed time.
- Offer navigation back to the puzzle index.
- Show a `Replay` control in place of `Reset`.
- The `Replay` control clears the current puzzle and starts a new attempt. Once
  the replay starts, the control label MUST return to `Reset`.

## 6. Core game rules

1. A path starts on an unused character cell.
2. Consecutive cells MUST share an edge: up, down, left, or right.
3. Diagonal moves are invalid.
4. Blocked cells and absent positions cannot be entered.
5. A cell cannot occur twice in one active path.
6. A cell in a locked path cannot be used by another word unless that locked
   path is first removed through Undo or Reset.
7. Direction matters. For the target word `あめ`, the trace `あ` then `め` is
   valid, while `め` then `あ` is not.
8. On submission, the traced string is normalized and compared with the
   normalized form of each unsolved target word.
9. If it matches an unsolved target word, the path is accepted and locked.
10. If the same target word can be formed by multiple legal paths, every such
    path MUST be accepted. Puzzle JSON MAY designate one model path for Hint
    behavior, but that path is not canonical for answer acceptance.
11. A locally valid placement MAY make the remaining words impossible to
    place. It is still accepted; the player must use Undo and choose another
    path.
12. The runtime game MUST NOT use the master dictionary to accept arbitrary
    words. Only strings in the puzzle JSON's `answers` array are accepted.
13. Each target word can be accepted once. Duplicate normalized target words
    within one puzzle are prohibited in schema version 1.

## 7. Japanese text model and normalization

### 7.1 Character counting

- One board cell represents one Unicode grapheme cluster.
- Strings MUST first be normalized to Unicode NFC.
- Grapheme segmentation SHOULD use `Intl.Segmenter` with locale `ja` and
  granularity `grapheme`, with a tested fallback for supported browsers that do
  not expose it.
- A word's clue length is its grapheme count after NFC normalization. The
  equivalence mapping below does not change the count.
- Answers are hiragana readings, not kanji. For example, `あめ` occupies two
  cells.

### 7.2 Comparison normalization

For comparison only, apply the following symmetric equivalences:

| Characters | Comparison form |
| --- | --- |
| `ゃ`, `や` | `や` |
| `ゅ`, `ゆ` | `ゆ` |
| `ょ`, `よ` | `よ` |
| `っ`, `つ` | `つ` |

Consequences:

- The canonical answer `きゅうしょく` matches board cells displaying
  `きゆうしよく`.
- The canonical string from JSON, including its small kana, MUST be shown in
  the solved word slot.

### 7.3 Characters that remain distinct

- Voiced and semi-voiced kana remain distinct. For example, `は`, `ば`, and
  `ぱ` are three different characters.
- `じ` and `ぢ` remain distinct; `ず` and `づ` remain distinct.
- `ー` matches only `ー`. It MUST NOT be expanded to or matched against a vowel.
  Therefore, `ぱわー` does not match `ぱわあ`.
- No other phonetic, spelling, or semantic normalization is performed.

### 7.4 Allowed input repertoire

Puzzle data MUST use hiragana plus `ー`. Kanji, katakana, Latin letters,
digits, spaces, and punctuation are invalid. Small `ぁぃぅぇぉゎ`, `ゕ`, `ゖ`,
and iteration marks are unsupported in schema version 1 and MUST be rejected by
the validator. They may be introduced by a later normalization version.

## 8. Board representation and rendering

### 8.1 Logical geometry

- Coordinates are zero-based `[row, column]` pairs.
- The maximum supported bounding box in v1 is 7 rows by 7 columns.
- A puzzle has 2 to 7 target words.
- A target word has 2 to 10 graphemes.
- A puzzle has at most 49 character cells.
- The union of character and blocked cells MUST be orthogonally connected, so
  the board has one coherent outer shape.

### 8.2 Visual rules

- Character cells are square and display one centered character.
- Blocked cells use a clearly gray fill and are visibly unplayable.
- The outer boundary of the union of character and blocked cells is drawn with
  a thick line.
- For an irregular board, the thick boundary follows the actual cell shape,
  including protrusions and notches. It is not a rectangular wrapper around the
  bounding box.
- Absent positions are not rendered. In particular, a short row does not gain
  placeholder boxes, padding, or border segments.
- Internal grid lines are thinner than the outer boundary.
- The board MUST scale to the available viewport while preserving square cells.
- Interactive cells SHOULD provide an effective pointer target of at least
  44 by 44 CSS pixels on supported mobile layouts.

The recommended implementation computes per-cell outer-edge classes by checking
whether each orthogonal neighboring coordinate is present. This avoids adding
visual boxes for absent positions.

Detailed colors, layout, path styling, controls, and responsive presentation
are specified in DESIGN.md.

### 8.3 Path rendering

- An active path MUST be visibly continuous across cell centers and around
  right-angle turns.
- An active path uses a neutral preview color.
- Each accepted word is assigned a stable color based on its word-slot order.
- A locked path uses that word's color on both the board and its solved slot.
- The UI MUST NOT rely on color alone; selected cells and connecting segments
  must also provide shape or contrast cues.
- SVG overlay rendering is recommended for path segments and directional
  chevrons, but is not mandatory. Direction chevrons MUST remain visibly above
  the cell borders, while path bands and character labels retain clear
  contrast.

## 9. Pointer and touch interaction

Use Pointer Events so mouse, pen, and touch share one interaction model.

1. `pointerdown` on an unused character cell records the path start and starts
   the timer if necessary. The path remains visually unselected until the
   pointer moves into an unused orthogonally adjacent character cell.
2. Moving into an unused orthogonally adjacent character cell starts the active
   path with the recorded cell and appends the destination cell. Further moves
   append additional cells.
3. Moving back into the immediately previous cell removes the current tail
   cell. This is in-drag backtracking.
4. Moving into any other cell already present in the active path is ignored.
5. Moving diagonally, across a gap, into a blocked cell, into an absent position,
   into a locked cell, or into a non-adjacent cell is ignored.
6. If the pointer physically leaves the board, the active path is preserved but
   not extended. No line is drawn outside the last selected cell. Re-entering
   the board may continue the same path.
7. Releasing the pointer anywhere ends and submits the active path.
8. Releasing without moving to an adjacent cell clears the recorded one-cell
   start silently.
9. An invalid submission of two or more cells briefly shows an error state,
   then clears.
10. A valid submission locks immediately.
11. The application MUST NOT reveal whether an active path is correct before
    submission.
12. Native page scrolling and text selection MUST be suppressed while a pointer
    is actively tracing inside the board, for example with pointer capture and
    appropriate `touch-action` behavior.
13. `pointercancel` clears the active path without submitting it.

## 10. Keyboard interaction and accessibility

The board MUST support keyboard-assisted play. Pointer input is not required
for every individual path after a character cell has been focused.

- Character cells MUST NOT be individual Tab stops.
- The board MUST be reachable through the normal Tab order. When focus enters
  the board through Tab, focus MUST be placed on the first character cell in
  row-major order (top to bottom, then left to right). The initial puzzle view
  MUST NOT focus a cell automatically.
- Arrow keys move focus to the immediately adjacent character cell in that
  direction. Movement into a blocked or absent position does nothing.
- Arrow-key focus movement without Shift never changes the active path.
- Shift + an arrow key appends the destination character cell to the active
  path. If no active path exists, the currently focused cell becomes the first
  cell of the active path. If the destination is blocked, absent, locked,
  non-adjacent, or otherwise illegal, neither focus nor the active path
  changes.
- Releasing Shift submits the active path. A one-cell path is cleared silently;
  valid paths lock immediately; and invalid paths briefly show an error before
  being cleared.
- Backspace removes the active path's last cell. If no active path exists and a
  locked path is focused, Backspace removes that locked word.
- Escape clears an active path without submitting it.
- Every character cell MUST expose an accessible label containing its character,
  row, column, and current state.
- Controls MUST have Japanese accessible names.
- Focus indicators MUST remain visible.
- Completion and error messages SHOULD be announced through an ARIA live region.

## 11. Word-length slots

- The slot list is derived from `answers`; lengths are not stored separately.
- Slots are sorted by ascending grapheme count.
- Equal-length slots retain their original order in the JSON `answers` array.
- Before discovery, a slot shows one blank tile per character cell.
- After discovery, it shows the canonical answer string from JSON, not the
  normalized board spelling.
- Slot order and color assignment remain stable throughout a play session.

## 12. Hint behavior

Hint reveals the next cell of the selected target word's model path. It never
reveals the entire word at once.

1. Select the shortest unsolved target word. Break equal-length ties by JSON
   `answers` order.
2. Read the model path for that answer from the puzzle JSON.
3. On the first Hint press for that answer, mark its first cell. Each later
   Hint press for the same unchanged answer marks the next cell in that model
   path. Previously revealed markers remain visible.
4. If the player solves the hinted word, or a lock, Undo, or Reset changes the
   board state, clear the hint state. The next Hint press starts again at the
   first cell of the newly selected target word.
5. If the next model-path cell is unavailable because of the current locked
   paths, Hint MUST NOT show a misleading cell. It instead displays a short
   Japanese instruction to undo a prior word and visually emphasizes the Undo
   control. It MUST NOT automatically mutate game state.
6. Hint is disabled after completion.

Hint uses only the fixed model paths in the puzzle JSON. It does not use the
future master dictionary or perform a runtime path search.

The model path is used for Hint regardless of which legal path the player used
to solve earlier target words. A target word solved through a different legal
path is still fully solved and is no longer eligible for Hint.

## 13. Undo and Reset

### 13.1 Undo

- Undo removes the most recently locked word and returns its cells to the unused
  state.
- Repeated Undo operations continue in reverse lock order.
- Undo is disabled when no word is locked.
- There is no Redo requirement.

### 13.2 Reset

- Reset asks for confirmation when progress exists.
- On confirmation, it clears locked paths, the active path, hint state, current
  elapsed time, and in-progress persistence for that puzzle.
- It does not delete the puzzle's historical best time.

## 14. Timer and local persistence

### 14.1 Timer

- The timer starts on the first click or touch on a character cell, the first
  Shift + Arrow path-selection action, or the first Hint press. Merely opening
  a puzzle or moving keyboard focus does not start it.
- The displayed timer format MUST be `MM:SS`, with minutes and seconds padded
  to two digits.
- It stops on completion.
- It measures active play time, not time while the page is hidden or closed.
- It pauses when `document.visibilityState` becomes `hidden` and resumes when the
  puzzle becomes visible again.
- It must be based on timestamps plus accumulated elapsed time, not on assuming
  timer callbacks fire at exact intervals.

### 14.2 Persistence

Persistence is best effort and MUST NOT be required for basic play.

Use versioned `localStorage` records to save:

- Puzzle ID and revision.
- Locked answer IDs, their player-selected coordinate paths, and lock order.
- Elapsed active time.
- Timer started/completed state.
- Solved status and best time.

The active, unsubmitted path is not persisted. Save after every lock, Undo,
Reset, completion, and visibility transition. On reload, restore only after
validating the stored state against the current puzzle ID, revision, and rules.
Discard incompatible or corrupt saved data safely.

Clearing browser site data is expected to reset all progress. No account-based
or cross-device persistence is required. Browsers may vary in their handling of
storage for `file://` URLs; storage failure must degrade gracefully to a
session-only game.

## 15. Puzzle JSON schema

### 15.1 Source format

Each puzzle is one JSON file in the puzzle source directory. The schema is:

```json
{
  "schemaVersion": 1,
  "id": "0001",
  "revision": 1,
  "title": "テストもんだい",
  "grid": [
    ["た", "つ", "ん", "ば", "い"],
    ["か", "む", "は", "う", "き"],
    ["ー", "り", "#", "ど", "じ"],
    ["わ", "き", "し", "よ", "く"],
    ["ぱ", "ゆ", "う"]
  ],
  "answers": [
    "ぱわー",
    "かたつむり",
    "きゅうしょく",
    "じどうはんばいき"
  ],
  "solution": [
    [[4, 0], [3, 0], [2, 0]],
    [[1, 0], [0, 0], [0, 1], [1, 1], [2, 1]],
    [[3, 1], [4, 1], [4, 2], [3, 2], [3, 3], [3, 4]],
    [[2, 4], [2, 3], [1, 3], [1, 2], [0, 2], [0, 3], [0, 4], [1, 4]]
  ]
}
```

### 15.2 Grid tokens

Within `grid`:

- A valid one-grapheme string is a character cell.
- `"#"` is a blocked gray cell.
- `null` is an absent position.
- Missing trailing array elements are also absent positions. A short row is
  therefore represented by a shorter JSON array rather than padded cells.

Use explicit `null` for an absent position before or between later cells in the
same row. Do not use empty strings or spaces.

### 15.3 Field requirements

- `schemaVersion` MUST be the integer `1`.
- `id` MUST be a unique numeric string. Leading zeros are allowed and retained
  for display.
- `revision` MUST be a positive integer and MUST increase when a published
  puzzle changes in a way that invalidates saved progress.
- `title` is optional and, when present, is a short Japanese string.
- `grid` MUST obey Sections 7 and 8.
- `answers` MUST contain 2 to 7 canonical hiragana strings.
- `solution` MUST contain one coordinate path for each `answers` entry, in the
  same array order. It is used only for Hint behavior and MUST NOT restrict
  legal player paths.
- Each solution path MUST spell its corresponding answer after comparison
  normalization, use valid character cells, be orthogonally connected, and
  contain no repeated cell.
- The solution paths MUST be mutually disjoint and cover every character cell
  exactly once.
- Word-length hints are derived from `answers` and MUST NOT be duplicated in the
  source data.

Future authoring metadata MAY add fields such as `dictionaryVersion` and
`normalizationVersion`, but the MVP runtime must ignore unknown optional fields
for forward compatibility while still rejecting unknown required schema
versions.

## 16. Build-time puzzle validation

The MVP build MUST fail with a clear puzzle ID and location when any structural
validation fails.

Validate at least the following:

1. JSON syntax and required field types.
2. Unique puzzle IDs.
3. Supported schema version and positive revision.
4. Board and answer-count limits.
5. Valid cell tokens and one grapheme per character cell.
6. A single orthogonally connected present board shape, counting character and
   blocked cells as present.
7. Valid answer characters and lengths.
8. Unique normalized answers.
9. Sum of answer grapheme counts equals the number of character cells.
10. Every target word has at least one directed legal path on the board.
11. The `solution` field contains one valid path for every target word.
12. The solution paths are mutually disjoint and cover every character cell
    exactly once.
13. There is at least one mutually disjoint assignment of paths for all target
    words that covers every character cell exactly once.

Multiple full path assignments for the same target answer set are valid and
MUST NOT cause validation failure.

The build-time validator does not need the master dictionary and does not prove
that a different dictionary-derived answer set is impossible. That is Phase 2.

## 17. Future authoring and answer-set uniqueness checks

This section defines future behavior so the MVP data model does not block it.
It is not an MVP implementation requirement.

### 17.1 Master dictionary policy

The future master dictionary SHOULD contain modern, commonly understood words
appropriate for elementary and lower-secondary-school learners. It SHOULD:

- Store canonical hiragana readings.
- Cover common nouns, dictionary forms of verbs and adjectives, and familiar
  loanwords represented in hiragana.
- Exclude proper nouns, personal names, brands, unexplained abbreviations,
  archaic vocabulary, adult terms, slurs, and highly specialized words.
- Cover normalized lengths of 2 to 10 cells.
- Record source, license, dictionary version, part of speech, and an optional
  grade or familiarity band.
- Collapse entries that have the same normalized reading for path-search
  purposes while retaining lexical metadata for author review.

The dictionary source and license must be selected before this phase is
implemented.

### 17.2 Definition of answer-set uniqueness

A puzzle is answer-set-unique when, given only the visible board, the clue-length
multiset, the pinned dictionary version, and the normalization rules, the only
dictionary-derived complete word set is the normalized set in JSON `answers`.

The checker MUST treat:

- Different path assignments for the same target word set as the same answer.
- A permutation of equal-length answers as the same answer.
- A different word set or word multiset as a different answer.
- Normalization-equivalent spellings as the same word.

It MUST verify that the target answer set has at least one complete path
assignment. It MUST reject a puzzle when a different dictionary word set can
also cover every character cell under the game rules.

### 17.3 Ambiguity diagnostics

The authoring checker SHOULD distinguish:

- **Error**: a different dictionary-derived word set can fully solve the board.
- **Warning**: a non-answer dictionary word matching an available clue length
  can be traced but does not participate in a full alternative solution.
- **Warning**: overlapping candidates such as `ろんぶん`, `ぶんちょう`, and
  `ろんぶんちょう` could make the intended vocabulary feel arbitrary even if
  only the JSON answer set completes the board.

Warnings are reviewed by the puzzle author rather than automatically rejected.
At runtime, only JSON target words are accepted regardless of these diagnostics.

## 18. Offline packaging and project structure

### 18.1 Runtime artifact

- The production deliverable MUST be a self-contained `dist/index.html`.
- It MUST work when opened directly from the filesystem in current desktop
  Chrome, Edge, Firefox, and Safari. Only current browser versions are in
  scope.
- It MUST make no runtime HTTP requests.
- JavaScript, CSS, puzzles, icons, and fonts required for play MUST be inlined or
  otherwise embedded in the single file. The MVP MUST use `system-ui` with
  Japanese system-font fallbacks and MUST NOT depend on a remote font.
- If `Intl.Segmenter` is unavailable, the application MUST use its tested
  grapheme-segmentation fallback.
- No service worker is required.

### 18.2 Puzzle plugability

Puzzle JSON is pluggable at source/build time:

1. Add a JSON file to the puzzle directory.
2. Run validation and the production build.
3. The puzzle automatically appears in the puzzle index.

Adding a puzzle MUST NOT require modifying application source code. Runtime
discovery of arbitrary neighboring JSON files is not required. Puzzle files
MUST be stored under `puzzles/*.json`, for example `puzzles/0001.json` and
`puzzles/0002.json`. The filename stem is the display and routing ID and MUST
match the JSON `id` field.

### 18.3 Recommended stack

Use a small TypeScript web project with:

- Vanilla TypeScript, HTML, and CSS by default.
- Vite or an equivalent build tool.
- A single-file bundling step such as `vite-plugin-singlefile` or an equivalent
  custom inlining step.
- Vitest or an equivalent unit-test runner.
- Playwright or an equivalent browser test runner for pointer and end-to-end
  tests.

A JavaScript UI framework MAY be used, but it must not change the single-file,
offline, or interaction requirements. Avoid unnecessary state-management or UI
component dependencies.

Recommended commands:

```text
npm run dev
npm run validate:puzzles
npm test
npm run test:e2e
npm run build
```

## 19. Test puzzle

The JSON example in Section 15 is the required MVP test puzzle. It exercises:

- A non-rectangular bottom edge.
- An internal blocked cell.
- A prolonged sound mark.
- A semi-voiced kana.
- Small-kana comparison through `きゅうしょく` versus displayed
  `きゆうしよく`.
- Paths with multiple turns.
- Answer lengths 3, 5, 6, and 8.

The following zero-based paths are the required model paths and MUST be included
in the production puzzle JSON's `solution` field:

```text
ぱわー:
  [4,0] -> [3,0] -> [2,0]

かたつむり:
  [1,0] -> [0,0] -> [0,1] -> [1,1] -> [2,1]

きゅうしょく:
  [3,1] -> [4,1] -> [4,2] -> [3,2] -> [3,3] -> [3,4]

じどうはんばいき:
  [2,4] -> [2,3] -> [1,3] -> [1,2] -> [0,2] -> [0,3] -> [0,4] -> [1,4]
```

Other legal paths that spell the same target word MUST also be accepted.

## 20. Required tests

### 20.1 Unit tests

Normalization tests MUST include:

- `きゅうしょく` equals traced `きゆうしよく`.
- `ゃ/や`, `ゅ/ゆ`, `ょ/よ`, and `っ/つ` compare equal.
- `ぱ` does not equal `は` or `ば`.
- `じ` does not equal `ぢ`; `ず` does not equal `づ`.
- `ぱわー` does not equal `ぱわあ`.
- NFC-equivalent source strings compare consistently.

Path tests MUST include:

- Orthogonal movement succeeds.
- Diagonal movement fails.
- Entering a blocked or absent position fails.
- Reusing a cell fails.
- Entering a locked cell fails.
- In-drag movement to the immediately previous cell removes the tail.
- `あ -> め` can match `あめ`, while `め -> あ` cannot.
- Multiple legal paths spelling the same target word are each accepted.
- A target-word path that later causes a dead end can be locked and then undone.

Puzzle validation tests MUST include:

- The required test puzzle passes.
- Incorrect letter totals fail.
- A target set with no full disjoint placement fails.
- Duplicate normalized answers fail.
- Multiple full path assignments for the same answer set pass.

### 20.2 End-to-end tests

At minimum, verify:

1. The built file opens directly through `file://` without a server.
2. Puzzle 0001 appears on the index and opens through hash navigation.
3. The test puzzle can be completed using mouse-style pointer events.
4. The same core trace can be entered using touch-style pointer events.
5. After focus enters the board through Tab, the puzzle can be completed using
   arrow keys and Shift-based tracing without individually tabbing through cells.
6. Hint reveals successive cells from the selected answer's model path.
7. Undo frees the last locked path.
8. Reset clears current progress but preserves a prior best time.
9. Timer starts on the first character-cell click, the first Shift-based path
   selection, or the first Hint press; pauses when hidden, resumes when visible,
   and stops on completion.
10. Reload restores locked paths and elapsed time when browser storage is
    available.
11. Completion is impossible until every target word has been found with
    disjoint paths.

## 21. MVP acceptance criteria

The MVP is complete when all of the following are true:

- `npm run validate:puzzles`, unit tests, and end-to-end tests pass.
- `npm run build` produces a single self-contained `dist/index.html`.
- That file runs offline when opened without a server.
- The puzzle index and game view satisfy Sections 5 and 18.
- The supplied test puzzle is playable to completion by mouse and touch.
- Direction, adjacency, no-reuse, normalization, Hint, Undo, Reset, timer,
  and persistence behavior conform to this specification.
- Puzzle JSON contains target words and model paths for Hint behavior, while
  accepting any legal path for each target word.
- Adding another valid puzzle JSON file and rebuilding makes it appear in the
  index without application code changes.
- There are no runtime network calls, account features, rankings, or social
  features.
