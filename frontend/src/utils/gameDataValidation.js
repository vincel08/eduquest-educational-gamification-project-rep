/**
 * Lightweight client-side mirror of backend type-specific game_data checks.
 * Backend remains authoritative.
 */

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function hasTermDefinition(item) {
  return Boolean(
    String(item?.term || item?.front || item?.left || '').trim()
    && String(item?.definition || item?.back || item?.right || item?.match || '').trim()
  );
}

function hasChoiceQuestion(item) {
  return Boolean(
    String(item?.question || item?.prompt || item?.label || '').trim()
    && Array.isArray(item?.choices)
    && item.choices.length >= 2
    && Number.isInteger(Number(item?.correctIndex))
  );
}

export function validateGameDataClient(gameType, gameData) {
  const type = String(gameType || '');
  if (!gameData || typeof gameData !== 'object') {
    return 'Some game content is incomplete or invalid. Please review the highlighted fields.';
  }

  switch (type) {
    case 'flashcards':
    case 'memory_match':
    case 'drag_drop': {
      const list = asArray(gameData.items).length ? asArray(gameData.items) : asArray(gameData.pairs);
      if (list.filter(hasTermDefinition).length < (type === 'memory_match' ? 2 : 1)) {
        return 'Some game content is incomplete or invalid. Please review the highlighted fields.';
      }
      return '';
    }
    case 'quiz_show':
    case 'quiz_rush':
    case 'spin_wheel':
    case 'millionaire': {
      const list = asArray(gameData.rounds).length ? asArray(gameData.rounds) : asArray(gameData.items);
      if (!list.filter(hasChoiceQuestion).length) {
        return 'Some game content is incomplete or invalid. Please review the highlighted fields.';
      }
      return '';
    }
    case 'jeopardy': {
      const ok = asArray(gameData.categories).some((category) => asArray(category?.clues).some(
        (clue) => String(clue?.clue || '').trim() && String(clue?.answer || '').trim()
      ));
      return ok ? '' : 'Some game content is incomplete or invalid. Please review the highlighted fields.';
    }
    case 'escape_room': {
      const ok = asArray(gameData.stages).some(
        (stage) => String(stage?.clue || '').trim() && String(stage?.answer || '').trim()
      );
      return ok ? '' : 'Some game content is incomplete or invalid. Please review the highlighted fields.';
    }
    case 'mission_adventure': {
      if (!asArray(gameData.missions).filter(hasChoiceQuestion).length) {
        return 'Some game content is incomplete or invalid. Please review the highlighted fields.';
      }
      return '';
    }
    case 'puzzle_challenge':
    case 'crossword': {
      const list = asArray(gameData.items);
      const ok = list.some(
        (item) => String(item?.prompt || item?.clue || item?.question || '').trim()
          && String(item?.answer || '').trim()
      );
      return ok ? '' : 'Some game content is incomplete or invalid. Please review the highlighted fields.';
    }
    case 'word_search':
    case 'word_scramble': {
      const words = asArray(gameData.words);
      const itemWords = asArray(gameData.items).map((item) => item?.term || item?.answer || item?.word).filter(Boolean);
      return (words.length || itemWords.length)
        ? ''
        : 'Some game content is incomplete or invalid. Please review the highlighted fields.';
    }
    default:
      return 'Some game content is incomplete or invalid. Please review the highlighted fields.';
  }
}
