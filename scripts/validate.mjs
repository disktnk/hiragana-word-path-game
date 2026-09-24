import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const puzzleDirectory = path.join(root, "puzzles");
const hiraPattern = /^[ぁ-ゔー]+$/u;
const unsupportedPattern = /[ぁぃぅぇぉゎゕゖっ]/u;
const equivalent = new Map([["ゃ", "や"], ["ゅ", "ゆ"], ["ょ", "よ"], ["っ", "つ"]]);

export function segment(value) {
  const normalized = value.normalize("NFC");
  if (typeof Intl.Segmenter === "function") {
    return [...new Intl.Segmenter("ja", { granularity: "grapheme" }).segment(normalized)].map((part) => part.segment);
  }
  return Array.from(normalized);
}

export function comparisonForm(value) {
  return segment(value).map((part) => equivalent.get(part) ?? part).join("");
}

function error(id, message) {
  throw new Error(`Puzzle ${id}: ${message}`);
}

function key(row, column) {
  return `${row},${column}`;
}

function validatePath(puzzle, answer, rawPath, label) {
  if (!Array.isArray(rawPath) || rawPath.length !== segment(answer).length) error(puzzle.id, `${label} has an invalid length`);
  const cells = new Set();
  const letters = [];
  rawPath.forEach(([row, column], index) => {
    if (!Number.isInteger(row) || !Number.isInteger(column)) error(puzzle.id, `${label}[${index}] is not a coordinate`);
    const token = puzzle.grid[row]?.[column];
    if (typeof token !== "string" || token === "#") error(puzzle.id, `${label}[${index}] does not point to a character cell`);
    const coordinate = key(row, column);
    if (cells.has(coordinate)) error(puzzle.id, `${label} repeats ${coordinate}`);
    cells.add(coordinate);
    letters.push(token);
    if (index > 0) {
      const [previousRow, previousColumn] = rawPath[index - 1];
      if (Math.abs(row - previousRow) + Math.abs(column - previousColumn) !== 1) error(puzzle.id, `${label} is not orthogonally connected`);
    }
  });
  if (comparisonForm(letters.join("")) !== comparisonForm(answer)) error(puzzle.id, `${label} does not spell ${answer}`);
  return cells;
}

export function validatePuzzle(puzzle) {
  const id = puzzle?.id ?? "unknown";
  if (puzzle?.schemaVersion !== 1) error(id, "schemaVersion must be 1");
  if (!/^\d+$/.test(puzzle.id) || !Number.isInteger(puzzle.revision) || puzzle.revision < 1) error(id, "invalid id or revision");
  if (!Array.isArray(puzzle.grid) || puzzle.grid.length < 1 || puzzle.grid.length > 7) error(id, "grid must contain 1 to 7 rows");
  if (!Array.isArray(puzzle.answers) || puzzle.answers.length < 2 || puzzle.answers.length > 7) error(id, "answers must contain 2 to 7 words");
  if (!Array.isArray(puzzle.solution) || puzzle.solution.length !== puzzle.answers.length) error(id, "solution must match answers");
  const characters = new Map();
  const present = new Set();
  puzzle.grid.forEach((row, rowIndex) => {
    if (!Array.isArray(row) || row.length > 7) error(id, `grid row ${rowIndex} is invalid`);
    row.forEach((token, columnIndex) => {
      if (token === null) return;
      const coordinate = key(rowIndex, columnIndex);
      if (token === "#") { present.add(coordinate); return; }
      if (typeof token !== "string" || segment(token).length !== 1 || !hiraPattern.test(token) || unsupportedPattern.test(token)) error(id, `invalid cell at ${coordinate}`);
      characters.set(coordinate, token);
      present.add(coordinate);
    });
  });
  const starting = present.values().next().value;
  const reached = new Set(starting ? [starting] : []);
  const queue = starting ? [starting] : [];
  while (queue.length) {
    const [row, column] = queue.shift().split(",").map(Number);
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = key(row + dr, column + dc);
      if (present.has(next) && !reached.has(next)) { reached.add(next); queue.push(next); }
    }
  }
  if (reached.size !== present.size) error(id, "board shape is not connected");
  const normalizedAnswers = new Set();
  puzzle.answers.forEach((answer, index) => {
    if (typeof answer !== "string" || !hiraPattern.test(answer) || unsupportedPattern.test(answer)) error(id, `invalid answer at ${index}`);
    const length = segment(answer).length;
    if (length < 2 || length > 10) error(id, `answer ${answer} has an invalid length`);
    const normalized = comparisonForm(answer);
    if (normalizedAnswers.has(normalized)) error(id, `duplicate normalized answer ${answer}`);
    normalizedAnswers.add(normalized);
    validatePath(puzzle, answer, puzzle.solution[index], `solution[${index}]`);
  });
  if (characters.size !== puzzle.answers.reduce((sum, answer) => sum + segment(answer).length, 0)) error(id, "answer lengths do not cover character cells");
  const covered = new Set();
  puzzle.solution.forEach((solution, index) => {
    const cells = validatePath(puzzle, puzzle.answers[index], solution, `solution[${index}]`);
    for (const cell of cells) {
      if (covered.has(cell)) error(id, `solutions overlap at ${cell}`);
      covered.add(cell);
    }
  });
  if (covered.size !== characters.size) error(id, "solutions do not cover every character cell");
  return puzzle;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const files = fs.readdirSync(puzzleDirectory).filter((file) => file.endsWith(".json")).sort();
  const ids = new Set();
  for (const file of files) {
    const puzzle = JSON.parse(fs.readFileSync(path.join(puzzleDirectory, file), "utf8"));
    if (ids.has(puzzle.id)) throw new Error(`Duplicate puzzle id ${puzzle.id}`);
    ids.add(puzzle.id);
    validatePuzzle(puzzle);
  }
  console.log(`Validated ${files.length} puzzle${files.length === 1 ? "" : "s"}.`);
}
