import fs from "node:fs";
import path from "node:path";
import { validatePuzzle } from "./validate.mjs";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const puzzleDirectory = path.join(root, "puzzles");
const sourceDirectory = path.join(root, "src");
const outputDirectory = path.join(root, "dist");
const files = fs.readdirSync(puzzleDirectory).filter((file) => file.endsWith(".json"));
const puzzles = files.map((file) => {
  const puzzle = JSON.parse(fs.readFileSync(path.join(puzzleDirectory, file), "utf8"));
  return validatePuzzle(puzzle);
}).sort((left, right) => Number(left.id) - Number(right.id));

fs.mkdirSync(outputDirectory, { recursive: true });
const template = fs.readFileSync(path.join(sourceDirectory, "index.html"), "utf8");
const style = fs.readFileSync(path.join(sourceDirectory, "styles.css"), "utf8");
const script = fs.readFileSync(path.join(sourceDirectory, "app.js"), "utf8");
const result = template
  .replace("/* BUILD_STYLES */", style)
  .replace("/* BUILD_PUZZLES */", `window.BUNDLED_PUZZLES = ${JSON.stringify(puzzles)};`)
  .replace("/* BUILD_SCRIPT */", script);
fs.writeFileSync(path.join(outputDirectory, "index.html"), result);
console.log(`Built dist/index.html with ${puzzles.length} puzzle${puzzles.length === 1 ? "" : "s"}.`);
