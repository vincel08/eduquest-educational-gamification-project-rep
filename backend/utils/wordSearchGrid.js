/**
 * Build an authoritative word-search grid with placements.
 * Used by AI fallback/normalize so the client does not invent the puzzle.
 * Words may run horizontal, vertical, diagonal, and reverse in each of those.
 */

function normalizeWord(raw) {
  return String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
}

/** 8 directions: horizontal, vertical, both diagonals, and each reversed. */
export const WORD_SEARCH_DIRECTIONS = [
  { id: 'across', dr: 0, dc: 1 },
  { id: 'down', dr: 1, dc: 0 },
  { id: 'diagonal', dr: 1, dc: 1 },
  { id: 'diagonal_up', dr: -1, dc: 1 },
  { id: 'reverse', dr: 0, dc: -1 },
  { id: 'up', dr: -1, dc: 0 },
  { id: 'diagonal_up_left', dr: -1, dc: -1 },
  { id: 'diagonal_down_left', dr: 1, dc: -1 },
];

function emptyGrid(size) {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => ''));
}

function directionBounds(size, wordLength, dr, dc) {
  let minRow = 0;
  let maxRow = size - 1;
  let minCol = 0;
  let maxCol = size - 1;
  if (dr > 0) maxRow = size - wordLength;
  if (dr < 0) minRow = wordLength - 1;
  if (dc > 0) maxCol = size - wordLength;
  if (dc < 0) minCol = wordLength - 1;
  return { minRow, maxRow, minCol, maxCol };
}

function canPlace(grid, word, row, col, dr, dc) {
  const size = grid.length;
  for (let i = 0; i < word.length; i += 1) {
    const r = row + dr * i;
    const c = col + dc * i;
    if (r < 0 || c < 0 || r >= size || c >= size) return false;
    const cell = grid[r][c];
    if (cell && cell !== word[i]) return false;
  }
  return true;
}

function placeWord(grid, word, row, col, dr, dc) {
  for (let i = 0; i < word.length; i += 1) {
    grid[row + dr * i][col + dc * i] = word[i];
  }
}

export function buildWordSearchGrid(rawWords, gridSize = 10) {
  const size = Math.min(12, Math.max(8, Number(gridSize) || 10));
  const words = [...new Set(
    (Array.isArray(rawWords) ? rawWords : [])
      .map((word) => (typeof word === 'string' ? normalizeWord(word) : normalizeWord(word?.word)))
      .filter((word) => word && word.length <= size)
  )];

  const grid = emptyGrid(size);
  const placements = [];

  words.forEach((word) => {
    let placed = false;
    for (let attempt = 0; attempt < 120 && !placed; attempt += 1) {
      const direction = WORD_SEARCH_DIRECTIONS[attempt % WORD_SEARCH_DIRECTIONS.length];
      const { minRow, maxRow, minCol, maxCol } = directionBounds(
        size,
        word.length,
        direction.dr,
        direction.dc,
      );
      if (maxRow < minRow || maxCol < minCol) continue;
      const row = minRow + Math.floor(Math.random() * (maxRow - minRow + 1));
      const col = minCol + Math.floor(Math.random() * (maxCol - minCol + 1));
      if (!canPlace(grid, word, row, col, direction.dr, direction.dc)) continue;
      placeWord(grid, word, row, col, direction.dr, direction.dc);
      placements.push({
        word,
        row,
        col,
        direction: direction.id,
        dr: direction.dr,
        dc: direction.dc,
      });
      placed = true;
    }
  });

  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (!grid[r][c]) {
        grid[r][c] = letters[Math.floor(Math.random() * letters.length)];
      }
    }
  }

  return {
    words: placements.map((item) => item.word),
    gridSize: size,
    grid,
    placements,
  };
}

export function ensureWordSearchData(gameData = {}) {
  const wordsFromItems = (Array.isArray(gameData.items) ? gameData.items : [])
    .map((item) => item.term || item.answer || item.word)
    .filter(Boolean);
  const rawWords = Array.isArray(gameData.words) && gameData.words.length
    ? gameData.words
    : wordsFromItems;
  const words = rawWords
    .map((word) => (typeof word === 'string' ? normalizeWord(word) : normalizeWord(word?.word || word?.term)))
    .filter(Boolean);

  const existingGrid = Array.isArray(gameData.grid) ? gameData.grid : null;

  if (!existingGrid?.length || !Array.isArray(existingGrid[0]) || !words.length) {
    const built = buildWordSearchGrid(words, gameData.gridSize || 10);
    return {
      ...gameData,
      ...built,
      words: built.words,
    };
  }

  if (Array.isArray(gameData.placements) && gameData.placements.length) {
    const placed = gameData.placements.map((p) => normalizeWord(p?.word)).filter(Boolean).sort().join('|');
    const nextWords = [...words].sort().join('|');
    if (placed !== nextWords) {
      const built = buildWordSearchGrid(words, gameData.gridSize || 10);
      return {
        ...gameData,
        ...built,
        words: built.words,
      };
    }
  }

  return {
    ...gameData,
    words,
    gridSize: existingGrid.length,
    grid: existingGrid,
    placements: Array.isArray(gameData.placements) ? gameData.placements : [],
  };
}
