/**
 * Build a crossword board from clue items that include answer/row/col/direction.
 */

export function normalizeAnswer(value) {
  return String(value || '').replace(/\s+/g, '').toUpperCase();
}

export function buildCrosswordBoard(clues = []) {
  const entries = (Array.isArray(clues) ? clues : [])
    .map((clue, index) => {
      const answer = normalizeAnswer(clue.answer);
      if (!answer) return null;
      const direction = String(clue.direction || 'across').toLowerCase() === 'down' ? 'down' : 'across';
      const row = Number.isFinite(Number(clue.row)) ? Number(clue.row) : index;
      const col = Number.isFinite(Number(clue.col)) ? Number(clue.col) : 0;
      return {
        ...clue,
        index,
        number: index + 1,
        answer,
        direction,
        row: Math.max(0, row),
        col: Math.max(0, col),
      };
    })
    .filter(Boolean);

  let maxRow = 0;
  let maxCol = 0;
  entries.forEach((entry) => {
    if (entry.direction === 'across') {
      maxRow = Math.max(maxRow, entry.row);
      maxCol = Math.max(maxCol, entry.col + entry.answer.length - 1);
    } else {
      maxRow = Math.max(maxRow, entry.row + entry.answer.length - 1);
      maxCol = Math.max(maxCol, entry.col);
    }
  });

  const rows = Math.min(20, Math.max(maxRow + 1, 5));
  const cols = Math.min(20, Math.max(maxCol + 1, 5));
  const cells = Array.from({ length: rows }, () => Array.from({ length: cols }, () => null));

  entries.forEach((entry) => {
    for (let i = 0; i < entry.answer.length; i += 1) {
      const r = entry.direction === 'down' ? entry.row + i : entry.row;
      const c = entry.direction === 'across' ? entry.col + i : entry.col;
      if (r >= rows || c >= cols) continue;
      if (!cells[r][c]) {
        cells[r][c] = {
          row: r,
          col: c,
          number: i === 0 ? entry.number : null,
          entries: [],
        };
      } else if (i === 0 && !cells[r][c].number) {
        cells[r][c].number = entry.number;
      }
      cells[r][c].entries.push({ entryIndex: entry.index, offset: i, direction: entry.direction });
    }
  });

  return {
    entries,
    cells,
    rows,
    cols,
    across: entries.filter((item) => item.direction === 'across'),
    down: entries.filter((item) => item.direction === 'down'),
  };
}
