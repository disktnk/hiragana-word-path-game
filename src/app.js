(() => {
  const puzzles = window.BUNDLED_PUZZLES || [];
  const colors = ["#e5bd35", "#9256df", "#d85272", "#5c93dc", "#46a88e", "#e17839", "#6877c7"];
  const equivalent = new Map([["ゃ", "や"], ["ゅ", "ゆ"], ["ょ", "よ"], ["っ", "つ"]]);
  const segmenter = typeof Intl.Segmenter === "function" ? new Intl.Segmenter("ja", { granularity: "grapheme" }) : null;
  const storageKey = "hiragana-word-path-game:v1";
  const app = document.querySelector("#app");
  let state = null;
  let timerInterval = null;

  const segment = (value) => segmenter ? [...segmenter.segment(value.normalize("NFC"))].map((part) => part.segment) : Array.from(value.normalize("NFC"));
  const compare = (value) => segment(value).map((part) => equivalent.get(part) || part).join("");
  const coord = (row, column) => `${row},${column}`;
  const parseCoord = (value) => value.split(",").map(Number);
  const isAdjacent = (first, second) => Math.abs(first[0] - second[0]) + Math.abs(first[1] - second[1]) === 1;
  const currentPuzzle = () => puzzles.find((puzzle) => puzzle.id === state?.puzzleId);
  const cells = (puzzle) => puzzle.grid.flatMap((row, rowIndex) => row.map((token, columnIndex) => ({ row: rowIndex, column: columnIndex, token })).filter((cell) => cell.token !== null && cell.token !== undefined));
  const characterCells = (puzzle) => cells(puzzle).filter((cell) => cell.token !== "#");
  const hasProgress = () => state.locked.length > 0 || state.elapsed > 0 || state.timerStarted;
  const formatTime = (milliseconds) => { const seconds = Math.floor(milliseconds / 1000); return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`; };
  const answerOrder = (puzzle) => puzzle.answers.map((answer, index) => ({ answer, index, length: segment(answer).length })).sort((a, b) => a.length - b.length || a.index - b.index);

  function defaultState(puzzle) {
    return { puzzleId: puzzle.id, revision: puzzle.revision, locked: [], active: [], pointerStart: null, elapsed: 0, timerStarted: false, completed: false, best: null, hint: null, message: "", messageType: "" };
  }

  function readSaved(puzzle) {
    try {
      const records = JSON.parse(localStorage.getItem(storageKey) || "{}");
      const saved = records[puzzle.id];
      if (!saved || saved.revision !== puzzle.revision || !Array.isArray(saved.locked)) return null;
      const restored = defaultState(puzzle);
      restored.elapsed = Number.isFinite(saved.elapsed) && saved.elapsed >= 0 ? saved.elapsed : 0;
      restored.timerStarted = Boolean(saved.timerStarted);
      restored.completed = Boolean(saved.completed);
      restored.best = Number.isFinite(saved.best) ? saved.best : null;
      restored.locked = saved.locked.filter((entry) => Number.isInteger(entry.answerIndex) && puzzle.answers[entry.answerIndex] && Array.isArray(entry.path) && entry.path.length === segment(puzzle.answers[entry.answerIndex]).length);
      const used = new Set();
      restored.locked = restored.locked.filter((entry) => {
        const path = entry.path;
        if (path.some((point) => !Array.isArray(point) || point.length !== 2 || typeof puzzle.grid[point[0]]?.[point[1]] !== "string" || puzzle.grid[point[0]][point[1]] === "#" || used.has(coord(...point)))) return false;
        if (compare(path.map((point) => puzzle.grid[point[0]][point[1]]).join("")) !== compare(puzzle.answers[entry.answerIndex])) return false;
        for (let i = 1; i < path.length; i += 1) if (!isAdjacent(path[i - 1], path[i])) return false;
        path.forEach((point) => used.add(coord(...point)));
        return true;
      });
      restored.completed = restored.locked.length === puzzle.answers.length;
      return restored;
    } catch { return null; }
  }

  function saveState() {
    if (!state) return;
    try {
      const records = JSON.parse(localStorage.getItem(storageKey) || "{}");
      records[state.puzzleId] = { revision: state.revision, locked: state.locked.map(({ answerIndex, path }) => ({ answerIndex, path })), elapsed: state.elapsed, timerStarted: state.timerStarted, completed: state.completed, best: state.best };
      localStorage.setItem(storageKey, JSON.stringify(records));
    } catch { /* Storage is optional for offline play. */ }
  }

  function setMessage(message, type = "") { state.message = message; state.messageType = type; }
  function startTimer() { if (!state || state.completed || state.timerStarted) return; state.timerStarted = true; state.lastTick = Date.now(); clearInterval(timerInterval); timerInterval = setInterval(tickTimer, 250); saveState(); }
  function tickTimer() { if (!state?.timerStarted || state.completed) return; if (document.visibilityState === "visible") { state.elapsed += Date.now() - (state.lastTick || Date.now()); state.lastTick = Date.now(); renderTimer(); } else state.lastTick = Date.now(); }
  function stopTimer() { if (state?.timerStarted) tickTimer(); clearInterval(timerInterval); timerInterval = null; }
  function renderTimer() { const timer = document.querySelector("#timer"); if (timer) timer.textContent = formatTime(state.elapsed); }
  function usedCoordinates() { return new Set(state.locked.flatMap((entry) => entry.path.map((point) => coord(...point)))); }

  function beginPath(point) { if (state.completed || point.token === "#" || usedCoordinates().has(coord(point.row, point.column))) return; startTimer(); state.active = [[point.row, point.column]]; state.pointerStart = null; state.hint = null; setMessage(""); render(); }
  function extendPath(point) {
    if (point.token === "#" || usedCoordinates().has(coord(point.row, point.column))) return;
    if (!state.active.length && state.pointerStart) {
      if (!isAdjacent(state.pointerStart, [point.row, point.column])) return;
      state.active = [state.pointerStart, [point.row, point.column]];
      state.pointerStart = null;
      state.hint = null;
      setMessage("");
      render();
      return;
    }
    if (!state.active.length) return;
    const last = state.active[state.active.length - 1];
    if (!isAdjacent(last, [point.row, point.column])) return;
    const pointKey = coord(point.row, point.column);
    const previousKey = coord(...state.active[state.active.length - 2] || []);
    if (state.active.some((entry) => coord(...entry) === pointKey)) {
      if (pointKey === previousKey) state.active.pop();
    } else state.active.push([point.row, point.column]);
    render();
  }
  function submitPath() {
    state.pointerStart = null;
    if (!state.active.length) return;
    if (state.active.length === 1) { state.active = []; render(); return; }
    const puzzle = currentPuzzle();
    const traced = state.active.map(([row, column]) => puzzle.grid[row][column]).join("");
    const answerIndex = puzzle.answers.findIndex((answer, index) => !state.locked.some((entry) => entry.answerIndex === index) && compare(answer) === compare(traced));
    if (answerIndex < 0) { setMessage("そのつなぎ方は答えではありません", "error"); state.active = []; render(); window.setTimeout(() => { if (state?.messageType === "error") { setMessage(""); render(); } }, 1100); return; }
    state.locked.push({ answerIndex, path: state.active }); state.active = []; state.hint = null; setMessage("", "");
    if (state.locked.length === puzzle.answers.length) completePuzzle();
    saveState(); render();
  }
  function completePuzzle() { tickTimer(); state.completed = true; state.timerStarted = false; stopTimer(); if (state.best === null || state.elapsed < state.best) state.best = state.elapsed; setMessage("", ""); saveState(); }
  function undo() { if (!state.locked.length || state.completed) return; state.locked.pop(); state.hint = null; setMessage(""); saveState(); render(); }
  function reset(replay = false) { if (!replay && hasProgress() && !window.confirm("この問題の進行状況をリセットしますか？")) return; const puzzle = currentPuzzle(); const best = state.best; state = defaultState(puzzle); state.best = best; saveState(); render(); }
  function hint() {
    if (state.completed) return;
    startTimer();
    const puzzle = currentPuzzle();
    const solved = new Set(state.locked.map((entry) => entry.answerIndex));
    const selected = answerOrder(puzzle).find((entry) => !solved.has(entry.index));
    if (!selected) return;
    if (!state.hint || state.hint.answerIndex !== selected.index) state.hint = { answerIndex: selected.index, revealed: 0 };
    const path = puzzle.solution[selected.index];
    const unavailable = path.slice(0, state.hint.revealed + 1).some((point) => usedCoordinates().has(coord(...point)));
    if (unavailable) { setMessage("先に前の答えをUndoしてください", "error"); document.querySelector("#undo")?.focus(); render(); return; }
    state.hint.revealed = Math.min(state.hint.revealed + 1, path.length); setMessage("次の文字を表示しました", ""); render();
  }

  function makePathPoints(path, puzzle) { return path.map(([row, column]) => { const cell = document.querySelector(`[data-row="${row}"][data-column="${column}"]`); return cell ? [cell.offsetLeft + cell.offsetWidth / 2, cell.offsetTop + cell.offsetHeight / 2] : null; }).filter(Boolean); }
  function drawPath(svg, path, puzzle, color, active = false) {
    const points = makePathPoints(path, puzzle); if (!points.length) return;
    const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline"); polyline.setAttribute("points", points.map((point) => point.join(",")).join(" ")); polyline.setAttribute("class", `path-line${active ? " active" : ""}`); polyline.style.stroke = color; svg.append(polyline);
  }
  function drawArrows(svg, path, puzzle) {
    const points = makePathPoints(path, puzzle); if (points.length < 2) return;
    points.slice(0, -1).forEach((point, index) => {
        const next = points[index + 1];
        const dx = next[0] - point[0]; const dy = next[1] - point[1]; const distance = Math.hypot(dx, dy); const ux = dx / distance; const uy = dy / distance; const px = -uy; const py = ux; const centerX = point[0] * .5 + next[0] * .5; const centerY = point[1] * .5 + next[1] * .5; const tip = [centerX + ux * 7, centerY + uy * 7]; const base = [centerX - ux * 5, centerY - uy * 5];
        const arrow = document.createElementNS("http://www.w3.org/2000/svg", "path"); arrow.setAttribute("d", `M ${base[0] + px * 5} ${base[1] + py * 5} L ${tip[0]} ${tip[1]} L ${base[0] - px * 5} ${base[1] - py * 5}`); arrow.setAttribute("class", "path-arrow"); svg.append(arrow);
    });
  }

  function renderBoard(puzzle) {
    const wrap = document.createElement("div"); wrap.className = "board-wrap";
    const board = document.createElement("div"); board.className = "board"; board.setAttribute("tabindex", "0"); board.setAttribute("role", "group"); board.setAttribute("aria-label", "ひらがなボード。矢印キーで移動、Shiftと矢印キーでつなぎます");
    board.style.gridTemplateRows = `repeat(${puzzle.grid.length}, 1fr)`; board.style.gridTemplateColumns = "repeat(7, 1fr)";
    const cellMap = new Map(); const lockedByCell = new Map(); state.locked.forEach((entry, order) => entry.path.forEach((point) => lockedByCell.set(coord(...point), order)));
    const present = new Set(cells(puzzle).map((cell) => coord(cell.row, cell.column)));
    cells(puzzle).forEach((cell) => {
      const element = document.createElement("button"); element.className = `cell ${cell.token === "#" ? "blocked" : ""}`; element.dataset.row = cell.row; element.dataset.column = cell.column; element.style.gridRow = cell.row + 1; element.style.gridColumn = cell.column + 1; element.tabIndex = -1; if (cell.token !== "#") { const label = document.createElement("span"); label.className = "cell-label"; label.textContent = cell.token; element.append(label); }
      const edges = [[-1, 0, "edge-top"], [0, 1, "edge-right"], [1, 0, "edge-bottom"], [0, -1, "edge-left"]]; edges.forEach(([dr, dc, className]) => { if (!present.has(coord(cell.row + dr, cell.column + dc))) element.classList.add(className); });
      const lockedOrder = lockedByCell.get(coord(cell.row, cell.column)); if (lockedOrder !== undefined) { element.classList.add("locked"); element.style.setProperty("--path-color", colors[state.locked[lockedOrder].answerIndex % colors.length]); }
      if (state.active.some((point) => coord(...point) === coord(cell.row, cell.column))) element.classList.add("selected");
      if (state.hint && puzzle.solution[state.hint.answerIndex].slice(0, state.hint.revealed).some((point) => coord(...point) === coord(cell.row, cell.column))) element.classList.add("hinted");
      const status = cell.token === "#" ? "ブロック" : lockedOrder !== undefined ? "回答済み" : "未使用"; element.setAttribute("aria-label", `${cell.token === "#" ? "ブロック" : cell.token}、${cell.row + 1}行${cell.column + 1}列、${status}`); element.disabled = cell.token === "#";
      element.addEventListener("pointerdown", (event) => { if (event.button !== undefined && event.button !== 0) return; event.preventDefault(); if (state.completed || cell.token === "#" || usedCoordinates().has(coord(cell.row, cell.column))) return; startTimer(); state.pointerStart = [cell.row, cell.column]; state.active = []; element.setPointerCapture?.(event.pointerId); });
      element.addEventListener("pointerenter", () => { if (board.hasPointerCapture?.(window.activePointerId)) extendPath(cell); });
      element.addEventListener("pointerup", (event) => { if (board.hasPointerCapture?.(event.pointerId)) { board.releasePointerCapture(event.pointerId); submitPath(); } });
      cellMap.set(coord(cell.row, cell.column), element); board.append(element);
    });
    board.addEventListener("pointermove", (event) => { window.activePointerId = event.pointerId; const target = document.elementFromPoint(event.clientX, event.clientY)?.closest?.(".cell"); if (target && target.dataset.row !== undefined) extendPath({ row: Number(target.dataset.row), column: Number(target.dataset.column), token: target.textContent }); });
    board.addEventListener("pointercancel", () => { state.active = []; state.pointerStart = null; render(); });
    board.addEventListener("keydown", (event) => handleKeyboard(event, board, puzzle));
    board.addEventListener("keyup", (event) => { if (event.key === "Shift" && state.active.length) { event.preventDefault(); submitPath(); } });
    board.addEventListener("focus", (event) => { if (event.target !== board) return; board.tabIndex = -1; const first = characterCells(puzzle)[0]; cellMap.get(coord(first.row, first.column))?.focus(); }, true);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.classList.add("path-layer"); svg.setAttribute("aria-hidden", "true"); const arrowSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); arrowSvg.classList.add("path-layer", "arrow-layer"); arrowSvg.setAttribute("aria-hidden", "true");
    wrap.append(board, svg, arrowSvg);
    window.requestAnimationFrame(() => { if (!document.body.contains(wrap)) return; state.locked.forEach((entry) => { drawPath(svg, entry.path, puzzle, colors[entry.answerIndex % colors.length]); drawArrows(arrowSvg, entry.path, puzzle); }); if (state.active.length) { drawPath(svg, state.active, puzzle, "#6d7781", true); drawArrows(arrowSvg, state.active, puzzle); } });
    return wrap;
  }

  function handleKeyboard(event, board, puzzle) {
    const focused = document.activeElement?.closest?.(".cell"); if (!focused) return;
    const row = Number(focused.dataset.row); const column = Number(focused.dataset.column); const moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }; const move = moves[event.key];
    if (move) { event.preventDefault(); const next = [row + move[0], column + move[1]]; let target = document.querySelector(`[data-row="${next[0]}"][data-column="${next[1]}"]`); if (!target || target.disabled) return; if (event.shiftKey) { const point = { row: next[0], column: next[1], token: target.textContent }; if (!state.active.length) beginPath({ row, column, token: focused.textContent }); extendPath(point); target = document.querySelector(`[data-row="${next[0]}"][data-column="${next[1]}"]`); } target?.focus(); return; }
    if (event.key === "Backspace") { event.preventDefault(); if (state.active.length) { state.active.pop(); render(); } else { const entry = state.locked.find((locked) => locked.path.some((point) => point[0] === row && point[1] === column)); if (entry) undo(); } }
    if (event.key === "Escape") { state.active = []; render(); }
  }

  function renderSlots(puzzle) { const list = document.createElement("div"); list.className = "slot-list"; answerOrder(puzzle).forEach(({ answer, index }) => { const entry = state.locked.find((locked) => locked.answerIndex === index); const slot = document.createElement("div"); slot.className = `slot ${entry ? "solved" : ""}`; slot.style.setProperty("--slot-color", colors[index % colors.length]); slot.innerHTML = `<span class="slot-label">${segment(answer).length}</span><span class="slot-tiles"></span>${entry ? "<span class=\"check\" aria-label=\"正解\">✓</span>" : ""}`; const tiles = slot.querySelector(".slot-tiles"); segment(answer).forEach((letter) => { const tile = document.createElement("span"); tile.className = "tile"; tile.textContent = entry ? letter : ""; tiles.append(tile); }); list.append(slot); }); return list; }

  function renderIndex() { stopTimer(); app.innerHTML = `<section class="card"><div class="index-heading"><div><p class="muted">WORD PATH PUZZLE</p><h1>ひらがなつなぎ</h1></div><span class="muted">${puzzles.length}問</span></div><div class="index-list"></div></section>`; const list = app.querySelector(".index-list"); puzzles.forEach((puzzle) => { const saved = readSaved(puzzle); const status = saved?.completed ? `クリア　${formatTime(saved.best ?? saved.elapsed)}` : saved?.locked?.length ? `プレイ中${saved.best ? `　ベスト ${formatTime(saved.best)}` : ""}` : saved?.best ? `未プレイ　ベスト ${formatTime(saved.best)}` : "未プレイ"; const link = document.createElement("button"); link.className = "puzzle-link"; link.innerHTML = `<span class="puzzle-meta"><strong>問題 ${puzzle.id}</strong><span>${puzzle.title || ""}</span></span><span class="puzzle-status">${status}</span>`; link.addEventListener("click", () => openPuzzle(puzzle.id)); list.append(link); }); }
  function openPuzzle(id) { const puzzle = puzzles.find((item) => item.id === id); if (!puzzle) return renderIndex(); state = readSaved(puzzle) || defaultState(puzzle); if (state.timerStarted && !state.completed) { state.lastTick = Date.now(); clearInterval(timerInterval); timerInterval = setInterval(tickTimer, 250); } render(); }
  function render() { const puzzle = currentPuzzle(); if (!puzzle) return renderIndex(); const focusedCell = document.activeElement?.closest?.(".cell"); const focusCoordinate = focusedCell ? coord(Number(focusedCell.dataset.row), Number(focusedCell.dataset.column)) : null; app.innerHTML = ""; const card = document.createElement("section"); card.className = `card ${state.completed ? "completed" : ""}`; card.innerHTML = `<div class="topbar"><div class="game-title"><button class="back-button" id="back">← 戻る</button><h1>問題 ${puzzle.id}</h1></div><time class="timer" id="timer" aria-label="経過時間">${formatTime(state.elapsed)}</time></div>`; card.append(renderBoard(puzzle), renderSlots(puzzle)); const controls = document.createElement("div"); controls.className = "controls"; controls.innerHTML = `<button class="control" id="undo" ${state.locked.length && !state.completed ? "" : "disabled"}>Undo</button><button class="control ${state.hint ? "hint-active" : ""}" id="hint" ${state.completed ? "disabled" : ""}>Hint</button><button class="control" id="reset" ${hasProgress() || state.completed ? "" : "disabled"}>${state.completed ? "Replay" : "Reset"}</button>`; card.append(controls); const message = document.createElement("p"); message.className = `message ${state.messageType}`; message.setAttribute("aria-live", "polite"); message.textContent = state.message; card.append(message); const instructions = document.createElement("div"); instructions.className = "instructions"; instructions.innerHTML = `<details open><summary>遊び方</summary><p>となり合う文字を順番につないで、答えの言葉を見つけましょう。斜めには進めません。すべての文字を一度ずつ使うとクリアです。</p></details><details><summary>キーボード操作</summary><p>Tabでボードへ移動し、矢印キーで移動します。Shift＋矢印キーで文字をつなぎ、Shiftを離すと決定します。Backspaceで戻り、Escで取り消せます。</p></details>`; card.append(instructions); app.append(card); if (focusCoordinate) document.querySelector(`[data-row="${focusCoordinate.split(",")[0]}"][data-column="${focusCoordinate.split(",")[1]}"]`)?.focus(); document.querySelector("#back").addEventListener("click", () => { location.hash = "#/"; }); document.querySelector("#undo").addEventListener("click", undo); document.querySelector("#hint").addEventListener("click", hint); document.querySelector("#reset").addEventListener("click", () => reset(state.completed)); renderTimer(); }

  document.addEventListener("visibilitychange", () => { if (state) { if (document.visibilityState === "hidden") { tickTimer(); saveState(); } else if (state.timerStarted) state.lastTick = Date.now(); } });
  document.addEventListener("pointermove", (event) => { if (!state?.pointerStart && !state?.active.length) return; const target = document.elementFromPoint(event.clientX, event.clientY)?.closest?.(".cell"); if (target && target.dataset.row !== undefined) extendPath({ row: Number(target.dataset.row), column: Number(target.dataset.column), token: target.textContent }); });
  document.addEventListener("pointerup", () => { if (state?.pointerStart || state?.active.length) submitPath(); });
  document.addEventListener("pointercancel", () => { if (state?.pointerStart || state?.active.length) { state.active = []; state.pointerStart = null; render(); } });
  document.addEventListener("keyup", (event) => { if (event.key === "Shift" && state?.active.length) submitPath(); });
  window.addEventListener("hashchange", route); window.addEventListener("resize", () => { if (state) render(); });
  function route() { const match = location.hash.match(/^#\/puzzles\/(\d+)$/); if (match) openPuzzle(match[1].padStart(4, "0")); else renderIndex(); }
  route();
})();
