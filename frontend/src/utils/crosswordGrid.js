/**
 * Build a crossword board from clue items.
 * Auto-places words so they cross on shared letters like a typical crossword.
 * Letter-box count always follows normalizeAnswer(answer).length.
 */

const WORK_SIZE = 40;

/** Keep only characters students can type into the grid (letters + digits). */
export function normalizeAnswer(value) {
  return String(value || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

/**
 * Merge items/clues. Prefer items when they have an answer (editor source of truth).
 */
export function resolveCrosswordClues(gameData = {}) {
  const items = Array.isArray(gameData.items) ? gameData.items : [];
  const clues = Array.isArray(gameData.clues) ? gameData.clues : [];
  const len = Math.max(items.length, clues.length);
  if (!len) return [];

  const merged = [];
  for (let i = 0; i < len; i += 1) {
    const fromItems = items[i] || null;
    const fromClues = clues[i] || null;
    if (!fromItems && !fromClues) continue;

    const itemAnswer = String(fromItems?.answer || fromItems?.word || '').trim();
    const clueAnswer = String(fromClues?.answer || fromClues?.word || '').trim();
    const preferItems = Boolean(itemAnswer) || (!clueAnswer && fromItems);
    const primary = (preferItems ? fromItems : fromClues) || {};
    const secondary = (preferItems ? fromClues : fromItems) || {};
    const answer = (preferItems ? itemAnswer : clueAnswer) || itemAnswer || clueAnswer;

    merged.push({
      ...secondary,
      ...primary,
      id: primary.id || secondary.id || `cw_${i}`,
      answer,
      word: answer,
      clue: primary.clue || primary.prompt || secondary.clue || secondary.prompt || '',
      prompt: primary.prompt || primary.clue || secondary.prompt || secondary.clue || '',
      direction: primary.direction || secondary.direction || 'across',
      row: primary.row ?? secondary.row,
      col: primary.col ?? secondary.col,
      hint: primary.hint || secondary.hint || '',
    });
  }

  return merged;
}

/** Snapshot used by play/preview so edits cannot leave dual collections out of sync. */
export function syncCrosswordGameData(gameData = {}) {
  const clues = resolveCrosswordClues(gameData).map((item) => {
    const answer = normalizeAnswer(item.answer || item.word);
    return {
      ...item,
      answer,
      word: answer,
      clue: item.clue || item.prompt || '',
      prompt: item.prompt || item.clue || '',
      direction: String(item.direction || 'across').toLowerCase() === 'down' ? 'down' : 'across',
    };
  }).filter((item) => item.answer);

  return {
    ...gameData,
    items: clues,
    clues: clues.map((item) => ({ ...item })),
  };
}

function normalizeDirection(value) {
  return String(value || 'across').trim().toLowerCase() === 'down' ? 'down' : 'across';
}

function cellKey(row, col) {
  return `${row}:${col}`;
}

function entryCells(entry) {
  const cells = [];
  for (let i = 0; i < entry.answer.length; i += 1) {
    const row = entry.direction === 'down' ? entry.row + i : entry.row;
    const col = entry.direction === 'across' ? entry.col + i : entry.col;
    cells.push({ row, col, letter: entry.answer[i] });
  }
  return cells;
}

function scorePlacement(letterMap, answer, row, col, direction, { requireCross = false } = {}) {
  if (row < 0 || col < 0) return null;
  const endRow = direction === 'down' ? row + answer.length - 1 : row;
  const endCol = direction === 'across' ? col + answer.length - 1 : col;
  if (endRow >= WORK_SIZE || endCol >= WORK_SIZE) return null;

  let crosses = 0;
  for (let i = 0; i < answer.length; i += 1) {
    const r = direction === 'down' ? row + i : row;
    const c = direction === 'across' ? col + i : col;
    const existing = letterMap.get(cellKey(r, c));
    if (existing && existing !== answer[i]) return null;
    if (existing === answer[i]) crosses += 1;
  }

  if (direction === 'across') {
    if (letterMap.has(cellKey(row, col - 1))) return null;
    if (letterMap.has(cellKey(row, col + answer.length))) return null;
  } else {
    if (letterMap.has(cellKey(row - 1, col))) return null;
    if (letterMap.has(cellKey(row + answer.length, col))) return null;
  }

  if (requireCross && crosses === 0) return null;
  return crosses;
}

function applyPlacement(letterMap, answer, row, col, direction) {
  for (let i = 0; i < answer.length; i += 1) {
    const r = direction === 'down' ? row + i : row;
    const c = direction === 'across' ? col + i : col;
    letterMap.set(cellKey(r, c), answer[i]);
  }
}

function cloneLetterMap(letterMap) {
  return new Map(letterMap);
}

function mapBounds(letterMap) {
  let minR = Infinity;
  let minC = Infinity;
  let maxR = -Infinity;
  let maxC = -Infinity;
  for (const key of letterMap.keys()) {
    const [r, c] = key.split(':').map(Number);
    minR = Math.min(minR, r);
    minC = Math.min(minC, c);
    maxR = Math.max(maxR, r);
    maxC = Math.max(maxC, c);
  }
  if (!Number.isFinite(minR)) {
    return {
      minR: 0, minC: 0, maxR: 0, maxC: 0, area: 1, letterCells: 0, skinnyRows: 0,
    };
  }
  const counts = new Map();
  for (const key of letterMap.keys()) {
    const [r] = key.split(':').map(Number);
    counts.set(r, (counts.get(r) || 0) + 1);
  }
  let skinnyRows = 0;
  counts.forEach((count) => {
    if (count <= 1) skinnyRows += 1;
  });
  return {
    minR,
    minC,
    maxR,
    maxC,
    area: (maxR - minR + 1) * (maxC - minC + 1),
    letterCells: letterMap.size,
    skinnyRows,
  };
}

function findCrossPlacements(letterMap, answer, preferredDirection) {
  const directions = preferredDirection === 'down'
    ? ['down', 'across']
    : ['across', 'down'];
  const candidates = [];
  const before = mapBounds(letterMap);

  for (const [key, letter] of letterMap.entries()) {
    const [baseRow, baseCol] = key.split(':').map(Number);
    for (let i = 0; i < answer.length; i += 1) {
      if (answer[i] !== letter) continue;
      for (const direction of directions) {
        const row = direction === 'down' ? baseRow - i : baseRow;
        const col = direction === 'across' ? baseCol - i : baseCol;
        const crosses = scorePlacement(letterMap, answer, row, col, direction, {
          requireCross: true,
        });
        if (crosses === null) continue;

        const trial = cloneLetterMap(letterMap);
        applyPlacement(trial, answer, row, col, direction);
        const after = mapBounds(trial);
        const density = after.letterCells / Math.max(1, after.area);

        candidates.push({
          row,
          col,
          direction,
          crosses,
          rank:
            crosses * 5000
            + (direction === preferredDirection ? 2500 : 0)
            + density * 2000
            - after.area
            - after.skinnyRows * 120
            - Math.max(0, after.area - before.area) * 2,
        });
      }
    }
  }

  candidates.sort((a, b) => b.rank - a.rank);
  return candidates;
}

function findOpenPlacements(letterMap, answer, preferredDirection) {
  const before = mapBounds(letterMap);
  const directions = [preferredDirection, preferredDirection === 'down' ? 'across' : 'down'];
  const tries = [];

  for (const direction of directions) {
    if (direction === 'across') {
      tries.push({ row: before.maxR + 1, col: before.minC, direction });
      tries.push({ row: Math.max(0, before.minR - 1), col: before.minC, direction });
    } else {
      tries.push({ row: before.minR, col: before.maxC + 1, direction });
      tries.push({ row: before.minR, col: Math.max(0, before.minC - 1), direction });
    }
  }

  for (const tryPlace of tries) {
    const crosses = scorePlacement(
      letterMap,
      answer,
      tryPlace.row,
      tryPlace.col,
      tryPlace.direction,
      { requireCross: false },
    );
    if (crosses !== null) return tryPlace;
  }
  return null;
}

function layoutMetrics(entries) {
  const occupied = new Map();
  let letterCells = 0;
  let shared = 0;
  let minR = Infinity;
  let minC = Infinity;
  let maxR = -Infinity;
  let maxC = -Infinity;
  const rowCounts = new Map();

  entries.forEach((entry) => {
    entryCells(entry).forEach((cell) => {
      minR = Math.min(minR, cell.row);
      minC = Math.min(minC, cell.col);
      maxR = Math.max(maxR, cell.row);
      maxC = Math.max(maxC, cell.col);
      rowCounts.set(cell.row, (rowCounts.get(cell.row) || 0) + 1);
      const key = cellKey(cell.row, cell.col);
      if (occupied.has(key)) {
        if (occupied.get(key) === 1) shared += 1;
        occupied.set(key, occupied.get(key) + 1);
      } else {
        occupied.set(key, 1);
        letterCells += 1;
      }
    });
  });

  const rows = Number.isFinite(minR) ? maxR - minR + 1 : 1;
  const cols = Number.isFinite(minC) ? maxC - minC + 1 : 1;
  let skinnyRows = 0;
  rowCounts.forEach((count) => {
    if (count <= 1) skinnyRows += 1;
  });

  return {
    shared,
    letterCells,
    area: rows * cols,
    density: letterCells / Math.max(1, rows * cols),
    skinnyRows,
  };
}

function normalizeOrigin(entries) {
  let minR = Infinity;
  let minC = Infinity;
  entries.forEach((entry) => {
    entryCells(entry).forEach((cell) => {
      minR = Math.min(minR, cell.row);
      minC = Math.min(minC, cell.col);
    });
  });
  if (!Number.isFinite(minR)) return entries;
  return entries.map((entry) => ({
    ...entry,
    row: entry.row - minR,
    col: entry.col - minC,
  }));
}

function placeWithSeed(entries, seedIndex, seedDirection) {
  const order = [...entries].sort((a, b) => {
    if (a.index === seedIndex) return -1;
    if (b.index === seedIndex) return 1;
    return b.answer.length - a.answer.length;
  });

  const letterMap = new Map();
  const placedByIndex = new Map();
  const first = { ...order[0], direction: seedDirection || order[0].direction };

  const firstRow = Math.floor(WORK_SIZE / 2);
  const firstCol = Math.floor(WORK_SIZE / 2) - Math.floor(first.answer.length / 2);
  const row = first.direction === 'across'
    ? firstRow
    : firstRow - Math.floor(first.answer.length / 2);
  const col = first.direction === 'across'
    ? firstCol
    : Math.floor(WORK_SIZE / 2);

  applyPlacement(letterMap, first.answer, row, col, first.direction);
  placedByIndex.set(first.index, {
    ...first,
    row,
    col,
    direction: first.direction,
  });

  for (let i = 1; i < order.length; i += 1) {
    const entry = order[i];
    const preferred = findCrossPlacements(letterMap, entry.answer, entry.direction);
    const flippedDir = entry.direction === 'down' ? 'across' : 'down';
    const flipped = findCrossPlacements(letterMap, entry.answer, flippedDir);
    const chosen = preferred[0] || flipped[0] || findOpenPlacements(letterMap, entry.answer, entry.direction);

    const placement = chosen || {
      row: Math.floor(WORK_SIZE / 2) + i,
      col: Math.floor(WORK_SIZE / 2) + 8,
      direction: entry.direction,
    };

    applyPlacement(letterMap, entry.answer, placement.row, placement.col, placement.direction);
    placedByIndex.set(entry.index, {
      ...entry,
      row: placement.row,
      col: placement.col,
      direction: placement.direction,
    });
  }

  return normalizeOrigin(entries.map((entry) => placedByIndex.get(entry.index) || entry));
}

function autoPlaceIntersecting(entries) {
  if (!entries.length) return entries;
  if (entries.length === 1) {
    return [{ ...entries[0], row: 0, col: 0 }];
  }

  const seeds = [...entries]
    .sort((a, b) => b.answer.length - a.answer.length)
    .slice(0, Math.min(5, entries.length));

  let best = null;
  let bestScore = -Infinity;

  for (const seed of seeds) {
    for (const direction of [seed.direction, seed.direction === 'down' ? 'across' : 'down']) {
      const layout = placeWithSeed(entries, seed.index, direction);
      const metrics = layoutMetrics(layout);
      const preferredKept = layout.reduce((count, entry) => {
        const original = entries.find((item) => item.index === entry.index);
        return count + (original && original.direction === entry.direction ? 1 : 0);
      }, 0);

      // Teacher across/down must stick when possible so Edit "Clue N" matches Play.
      const score = preferredKept * 12000
        + metrics.shared * 8000
        + metrics.density * 3000
        - metrics.area * 2
        - metrics.skinnyRows * 200
        + metrics.letterCells;

      if (score > bestScore) {
        bestScore = score;
        best = layout;
      }
    }
  }

  return best || placeWithSeed(entries, entries[0].index, entries[0].direction);
}

export function buildCrosswordBoard(clues = []) {
  let entries = (Array.isArray(clues) ? clues : [])
    .map((clue, index) => {
      const answer = normalizeAnswer(
        clue.answer || clue.word || clue.definition || clue.response,
      );
      if (!answer) return null;
      return {
        ...clue,
        index,
        // Stable with Edit Content "Clue N" — do not renumber by grid position.
        number: index + 1,
        answer,
        clue: clue.clue || clue.prompt || clue.question || '',
        prompt: clue.prompt || clue.clue || clue.question || '',
        direction: normalizeDirection(clue.direction),
        row: 0,
        col: 0,
      };
    })
    .filter(Boolean);

  entries = autoPlaceIntersecting(entries);

  let maxRow = 0;
  let maxCol = 0;
  entries.forEach((entry) => {
    entryCells(entry).forEach((cell) => {
      maxRow = Math.max(maxRow, cell.row);
      maxCol = Math.max(maxCol, cell.col);
    });
  });

  let rows = Math.min(WORK_SIZE, Math.max(maxRow + 1, 1));
  let cols = Math.min(WORK_SIZE, Math.max(maxCol + 1, 1));
  let cells = Array.from({ length: rows }, () => Array.from({ length: cols }, () => null));

  function paintEntries(list) {
    cells = Array.from({ length: rows }, () => Array.from({ length: cols }, () => null));
    list.forEach((entry) => {
      for (let i = 0; i < entry.answer.length; i += 1) {
        const r = entry.direction === 'down' ? entry.row + i : entry.row;
        const c = entry.direction === 'across' ? entry.col + i : entry.col;
        if (r < 0 || c < 0 || r >= rows || c >= cols) continue;
        if (!cells[r][c]) {
          cells[r][c] = {
            row: r,
            col: c,
            number: i === 0 ? entry.number : null,
            letter: entry.answer[i],
            entries: [],
          };
        } else if (i === 0 && (cells[r][c].number == null || entry.number < cells[r][c].number)) {
          cells[r][c].number = entry.number;
        }
        cells[r][c].entries.push({
          entryIndex: entry.index,
          offset: i,
          direction: entry.direction,
        });
      }
    });
  }

  paintEntries(entries);

  // Never silently drop letter boxes — expand and repaint if anything was clipped.
  let needsRepaint = false;
  entries.forEach((entry) => {
    for (let i = 0; i < entry.answer.length; i += 1) {
      const r = entry.direction === 'down' ? entry.row + i : entry.row;
      const c = entry.direction === 'across' ? entry.col + i : entry.col;
      if (r < 0 || c < 0 || r >= rows || c >= cols || !cells[r]?.[c]) {
        maxRow = Math.max(maxRow, r);
        maxCol = Math.max(maxCol, c);
        needsRepaint = true;
      }
    }
  });
  if (needsRepaint) {
    rows = Math.min(WORK_SIZE, Math.max(maxRow + 1, rows));
    cols = Math.min(WORK_SIZE, Math.max(maxCol + 1, cols));
    paintEntries(entries);
  }

  return {
    entries,
    cells,
    rows,
    cols,
    across: entries
      .filter((item) => item.direction === 'across')
      .sort((a, b) => a.number - b.number),
    down: entries
      .filter((item) => item.direction === 'down')
      .sort((a, b) => a.number - b.number),
  };
}
