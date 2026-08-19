import AppError from './AppError.js';
import { ALL_GAME_TYPES, isDeprecatedGameType, normalizeGameType } from './gameTypes.js';

const TYPE_MISMATCH_MESSAGE =
  'AI generated content did not match the selected game type. Please regenerate.';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function hasTermDefinition(item) {
  if (!item || typeof item !== 'object') return false;
  const left = item.term || item.front || item.left;
  const right = item.definition || item.back || item.right || item.match;
  return Boolean(String(left || '').trim() && String(right || '').trim());
}

function hasChoiceQuestion(item) {
  if (!item || typeof item !== 'object') return false;
  const prompt = item.question || item.prompt || item.label;
  const choices = Array.isArray(item.choices)
    ? item.choices
    : Array.isArray(item.options)
      ? item.options
      : null;
  if (!String(prompt || '').trim() || !choices || choices.length < 2) {
    return false;
  }
  const hasIndex = Number.isInteger(Number(item.correctIndex ?? item.correct_index));
  const hasAnswer = Boolean(
    String(item.correctAnswer || item.answer || '').trim(),
  );
  return hasIndex || hasAnswer;
}

function requireNonEmptyArray(list, label) {
  if (!asArray(list).length) {
    throw new AppError(`${label} is required for this game type`, 400);
  }
}

function assertPairCollection(gameData, { min = 1, label = 'items' } = {}) {
  const list = asArray(gameData.items).length
    ? asArray(gameData.items)
    : asArray(gameData.pairs);
  requireNonEmptyArray(list, label);
  if (list.length < min) {
    throw new AppError(`${label} must include at least ${min} entries`, 400);
  }
  const valid = list.filter(hasTermDefinition);
  if (valid.length < min) {
    throw new AppError(
      `${label} must include term/definition pairs for this game type`,
      400
    );
  }
}

function assertChoiceCollection(list, { min = 1, label = 'items' } = {}) {
  requireNonEmptyArray(list, label);
  if (list.length < min) {
    throw new AppError(`${label} must include at least ${min} entries`, 400);
  }
  const valid = list.filter(hasChoiceQuestion);
  if (valid.length < min) {
    throw new AppError(
      `${label} must include question, choices, and correctIndex`,
      400
    );
  }
}

/**
 * Type-specific game_data validation used by create/publish/AI normalize.
 * Throws AppError when structure does not match gameType.
 */
export function assertGameDataMatchesType(gameType, gameData, options = {}) {
  const {
    mismatchMessage = TYPE_MISMATCH_MESSAGE,
  } = options;

  if (isDeprecatedGameType(gameType)) {
    throw new AppError('This game type is deprecated and cannot be used', 400);
  }
  const type = normalizeGameType(gameType) || gameType;
  if (!ALL_GAME_TYPES.includes(type) && !normalizeGameType(gameType)) {
    throw new AppError('Invalid game type', 400);
  }
  if (!gameData || typeof gameData !== 'object' || Array.isArray(gameData)) {
    throw new AppError('gameData must be an object', 400);
  }

  try {
    switch (type) {
      case 'flashcards':
      case 'memory_match':
      case 'drag_drop':
        assertPairCollection(gameData, {
          min: type === 'memory_match' ? 2 : 1,
          label: type === 'memory_match' ? 'pairs' : 'items',
        });
        break;

      case 'crossword': {
        const items = asArray(gameData.items).length
          ? asArray(gameData.items)
          : asArray(gameData.clues);
        requireNonEmptyArray(items, 'crossword items');
        const valid = items.filter(
          (item) => item
            && String(item.clue || item.prompt || '').trim()
            && String(item.answer || '').trim()
        );
        if (!valid.length) {
          throw new AppError('crossword items require clue and answer', 400);
        }
        break;
      }

      case 'word_search':
      case 'word_scramble': {
        const words = asArray(gameData.words);
        const itemWords = asArray(gameData.items)
          .map((item) => item?.term || item?.answer || item?.word)
          .filter(Boolean);
        if (!words.length && !itemWords.length) {
          throw new AppError('word_search requires words or items with terms', 400);
        }
        if (Array.isArray(gameData.grid)) {
          if (!gameData.grid.length || !Array.isArray(gameData.grid[0])) {
            throw new AppError('word_search grid must be a 2D array', 400);
          }
        }
        break;
      }

      case 'quiz_show':
      case 'quiz_rush': {
        const list = asArray(gameData.rounds).length
          ? asArray(gameData.rounds)
          : asArray(gameData.items);
        assertChoiceCollection(list, { label: 'quiz items' });
        break;
      }

      case 'jeopardy': {
        const categories = asArray(gameData.categories);
        requireNonEmptyArray(categories, 'jeopardy categories');
        const hasClue = categories.some((category) => asArray(category?.clues).some(
          (clue) => clue
            && String(clue.clue || clue.prompt || '').trim()
            && String(clue.answer || '').trim()
        ));
        if (!hasClue) {
          throw new AppError('jeopardy categories require clues with clue and answer', 400);
        }
        break;
      }

      case 'spin_wheel':
        assertChoiceCollection(asArray(gameData.items), { label: 'spin_wheel items' });
        break;

      case 'millionaire':
        assertChoiceCollection(asArray(gameData.items), { min: 1, label: 'millionaire items' });
        break;

      case 'escape_room': {
        const stages = asArray(gameData.stages);
        requireNonEmptyArray(stages, 'escape_room stages');
        const valid = stages.filter(
          (stage) => stage
            && String(stage.clue || stage.prompt || '').trim()
            && String(stage.answer || '').trim()
        );
        if (!valid.length) {
          throw new AppError('escape_room stages require clue and answer', 400);
        }
        break;
      }

      case 'mission_adventure':
        assertChoiceCollection(asArray(gameData.missions), { label: 'missions' });
        break;

      case 'puzzle_challenge': {
        const items = asArray(gameData.items);
        requireNonEmptyArray(items, 'puzzle items');
        const valid = items.filter(
          (item) => item
            && String(item.prompt || item.question || item.clue || '').trim()
            && String(item.answer || '').trim()
        );
        if (!valid.length) {
          throw new AppError('puzzle items require prompt and answer', 400);
        }
        break;
      }

      default:
        throw new AppError(`Unsupported game type for validation: ${type}`, 400);
    }
  } catch (error) {
    if (error instanceof AppError) {
      // Preserve explicit field messages for teacher edits; use mismatch message for AI path.
      if (options.asTypeMismatch) {
        throw new AppError(mismatchMessage, 400);
      }
      throw error;
    }
    throw error;
  }

  return true;
}

export function getGameDataValidationMessage() {
  return TYPE_MISMATCH_MESSAGE;
}
