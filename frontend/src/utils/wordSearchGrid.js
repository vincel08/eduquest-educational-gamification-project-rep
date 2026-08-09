function normalizeWord(raw) {
  return String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
}

function emptyGrid(size) {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => ''));
}

function canPlace(grid, word, row, col, direction) {
  const size = grid.length;
  for (let i = 0; i < word.length; i += 1) {
    const r = direction === 'down' ? row + i : row;
    const c = direction === 'across' ? col + i : col;
    if (r < 0 || c < 0 || r >= size || c >= size) return false;
    const cell = grid[r][c];
    if (cell && cell !== word[i]) return false;
  }
  return true;
}

function placeWord(grid, word, row, col, direction) {
  for (let i = 0; i < word.length; i += 1) {
    const r = direction === 'down' ? row + i : row;
    const c = direction === 'across' ? col + i : col;
    grid[r][c] = word[i];
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
    for (let attempt = 0; attempt < 80 && !placed; attempt += 1) {
      const direction = attempt % 2 === 0 ? 'across' : 'down';
      const maxRow = direction === 'down' ? size - word.length : size - 1;
      const maxCol = direction === 'across' ? size - word.length : size - 1;
      if (maxRow < 0 || maxCol < 0) break;
      const row = Math.floor(Math.random() * (maxRow + 1));
      const col = Math.floor(Math.random() * (maxCol + 1));
      if (!canPlace(grid, word, row, col, direction)) continue;
      placeWord(grid, word, row, col, direction);
      placements.push({ word, row, col, direction });
      placed = true;
    }
  });

  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (!grid[r][c]) grid[r][c] = letters[Math.floor(Math.random() * letters.length)];
    }
  }

  return {
    words: placements.map((item) => item.word),
    gridSize: size,
    grid,
    placements,
  };
}

export function resolveWordSearchPuzzle(gameData = {}) {
  if (Array.isArray(gameData.grid) && gameData.grid.length && Array.isArray(gameData.words)) {
    return {
      words: gameData.words.map((word) => (typeof word === 'string' ? normalizeWord(word) : normalizeWord(word?.word))).filter(Boolean),
      grid: gameData.grid,
      gridSize: gameData.grid.length,
      placements: gameData.placements || [],
    };
  }

  const words = Array.isArray(gameData.words) && gameData.words.length
    ? gameData.words
    : (gameData.items || []).map((item) => item.term || item.answer || item.word).filter(Boolean);

  return buildWordSearchGrid(words, gameData.gridSize || 10);
}
