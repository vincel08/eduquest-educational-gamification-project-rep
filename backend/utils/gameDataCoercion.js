import { normalizeGameType } from './gameTypes.js';
import { ensureWordSearchData } from './wordSearchGrid.js';
import {
  getMaxItemsForGameType,
  getMinItemsForGameType,
} from './gameItemLimits.js';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function text(value) {
  return String(value ?? '').trim();
}

function choiceText(choice) {
  if (choice == null) return '';
  if (typeof choice === 'string' || typeof choice === 'number') return String(choice).trim();
  if (typeof choice === 'object') {
    return text(choice.text || choice.optionText || choice.label || choice.value);
  }
  return '';
}

function normalizeChoices(rawChoices) {
  const list = asArray(rawChoices).map(choiceText).filter(Boolean);
  if (list.length >= 2) return list.slice(0, 6);
  return null;
}

function resolveCorrectIndex(item, choices) {
  if (!choices?.length) return 0;
  const raw = item?.correctIndex ?? item?.correct_index ?? item?.answerIndex;
  const asNumber = Number(raw);
  if (Number.isInteger(asNumber) && asNumber >= 0 && asNumber < choices.length) {
    return asNumber;
  }
  const answerText = text(
    item?.correctAnswer || item?.answer || item?.definition || item?.right,
  );
  if (answerText) {
    const idx = choices.findIndex(
      (choice) => choice.toLowerCase() === answerText.toLowerCase(),
    );
    if (idx >= 0) return idx;
  }
  return 0;
}

function collectLooseItems(gameData = {}) {
  return [
    ...asArray(gameData.items),
    ...asArray(gameData.pairs),
    ...asArray(gameData.rounds),
    ...asArray(gameData.stages),
    ...asArray(gameData.missions),
    ...asArray(gameData.words).map((word) =>
      (typeof word === 'string' ? { term: word } : word),
    ),
    ...asArray(gameData.categories).flatMap((category) =>
      asArray(category?.clues).map((clue) => ({
        ...clue,
        category: category?.name,
      })),
    ),
  ].filter(Boolean);
}

function toPair(item, index) {
  const term = text(
    item.term
      || item.front
      || item.left
      || item.question
      || item.prompt
      || item.label
      || item.clue
      || item.title
      || `Item ${index + 1}`,
  );
  const definition = text(
    item.definition
      || item.back
      || item.right
      || item.match
      || item.answer
      || item.correctAnswer
      || (normalizeChoices(item.choices || item.options)?.[resolveCorrectIndex(item, normalizeChoices(item.choices || item.options))] || '')
      || item.hint
      || 'Review this concept',
  );
  if (!term || !definition) return null;
  return { term, definition };
}

function toChoiceItem(item, index) {
  let choices = normalizeChoices(item.choices || item.options);
  if (!choices) {
    const answer = text(item.answer || item.correctAnswer || item.definition || item.right);
    const term = text(item.term || item.front || item.left);
    if (answer) {
      choices = [answer, 'Distractor A', 'Distractor B', 'Distractor C'];
    } else if (term) {
      choices = [term, 'Option B', 'Option C', 'Option D'];
    } else {
      return null;
    }
  }
  const prompt = text(
    item.question
      || item.prompt
      || item.label
      || item.clue
      || (item.term ? `What matches "${item.term}"?` : `Question ${index + 1}`),
  );
  if (!prompt) return null;
  return {
    question: prompt,
    prompt,
    label: prompt,
    choices,
    correctIndex: resolveCorrectIndex(item, choices),
  };
}

function toClueAnswer(item, index) {
  const clue = text(
    item.clue || item.prompt || item.question || item.term || `Clue ${index + 1}`,
  );
  const answer = text(
    item.answer
      || item.correctAnswer
      || item.definition
      || item.right
      || item.term
      || `A${index + 1}`,
  ).replace(/\s+/g, ' ').slice(0, 24);
  if (!clue || !answer) return null;
  return { clue, answer, prompt: clue, direction: item.direction || (index % 2 ? 'down' : 'across'), row: Number(item.row) || 0, col: Number(item.col) || index, hint: text(item.hint) || undefined };
}

/**
 * Reshape messy AI gameData into the structure required by gameType.
 * Returns a new gameData object (does not throw).
 */
export function coerceGameDataToType(gameType, gameData = {}) {
  const type = normalizeGameType(gameType) || gameType;
  const source = collectLooseItems(gameData);
  const data = gameData && typeof gameData === 'object' ? { ...gameData } : {};

  switch (type) {
    case 'flashcards':
    case 'drag_drop': {
      const pairs = source.map(toPair).filter(Boolean);
      if (pairs.length) data.items = pairs;
      return data;
    }
    case 'memory_match': {
      let pairs = source.map(toPair).filter(Boolean);
      if (pairs.length === 1) {
        pairs = [
          pairs[0],
          {
            term: `${pairs[0].term} (review)`,
            definition: `${pairs[0].definition} — related concept`,
          },
        ];
      }
      if (pairs.length) {
        data.items = pairs;
        data.pairs = pairs;
      }
      return data;
    }
    case 'quiz_show':
    case 'quiz_rush': {
      const items = source.map(toChoiceItem).filter(Boolean);
      if (items.length) {
        data.items = items;
        data.rounds = items.map((item) => ({
          prompt: item.prompt,
          choices: item.choices,
          correctIndex: item.correctIndex,
          timeLimitSeconds: 20,
        }));
      }
      return data;
    }
    case 'spin_wheel':
    case 'millionaire': {
      const items = source.map(toChoiceItem).filter(Boolean);
      if (items.length) data.items = items;
      return data;
    }
    case 'mission_adventure': {
      const missions = source.map((item, index) => {
        const choice = toChoiceItem(item, index);
        if (!choice) return null;
        return {
          title: text(item.title || item.term || `Mission ${index + 1}`),
          prompt: choice.prompt,
          choices: choice.choices.slice(0, 3),
          correctIndex: Math.min(choice.correctIndex, 2),
          xp: Number(item.xp) || 20,
        };
      }).filter(Boolean);
      if (missions.length) data.missions = missions;
      return data;
    }
    case 'crossword': {
      const items = source.map(toClueAnswer).filter(Boolean);
      if (items.length) {
        data.items = items;
        data.clues = items;
      }
      return data;
    }
    case 'puzzle_challenge': {
      const items = source.map((item, index) => {
        const next = toClueAnswer(item, index);
        if (!next) return null;
        return {
          prompt: next.clue,
          answer: next.answer,
          hint: next.hint || text(item.hint) || undefined,
        };
      }).filter(Boolean);
      if (items.length) data.items = items;
      return data;
    }
    case 'escape_room': {
      const stages = source.map((item, index) => {
        const next = toClueAnswer(item, index);
        if (!next) return null;
        return {
          name: text(item.name || item.title || `Stage ${index + 1}`),
          clue: next.clue,
          answer: next.answer,
          hint: next.hint || text(item.hint) || 'Think about the lesson topic.',
        };
      }).filter(Boolean);
      if (stages.length) data.stages = stages;
      return data;
    }
    case 'jeopardy': {
      if (asArray(data.categories).some((category) => asArray(category?.clues).length)) {
        return data;
      }
      const clues = source.map(toClueAnswer).filter(Boolean);
      if (clues.length) {
        data.categories = [
          {
            name: 'Lesson',
            clues: clues.map((clue, index) => ({
              points: (index + 1) * 100,
              clue: clue.clue,
              answer: clue.answer,
            })),
          },
        ];
      }
      return data;
    }
    case 'word_search':
    case 'word_scramble': {
      const words = [
        ...asArray(data.words),
        ...source.map((item) => item.term || item.answer || item.word || item.left),
      ]
        .map((word) => text(word).toUpperCase().replace(/[^A-Z]/g, ''))
        .filter((word) => word.length >= 3);
      // Soft cap only — final request count is applied in applyGameItemCountLimit.
      return ensureWordSearchData({
        ...data,
        words: [...new Set(words)].slice(0, 20),
        gridSize: data.gridSize || 10,
      });
    }
    default:
      return data;
  }
}

/**
 * Enforce requested AI item count per game type without breaking playability.
 * Call after coerceGameDataToType. Rebuilds word-search grids after trimming.
 */
export function applyGameItemCountLimit(gameType, gameData = {}, itemCount) {
  const type = normalizeGameType(gameType) || gameType;
  const data = gameData && typeof gameData === 'object' ? { ...gameData } : {};
  const typeMax = getMaxItemsForGameType(type);
  const typeMin = getMinItemsForGameType(type);
  const requested = Math.trunc(Number(itemCount) || 0);
  const n = Math.min(typeMax, Math.max(typeMin, Number.isFinite(requested) ? requested : typeMin));
  if (!Number.isFinite(n) || n < 1) return data;

  switch (type) {
    case 'flashcards':
    case 'drag_drop': {
      if (Array.isArray(data.items)) data.items = data.items.slice(0, n);
      if (Array.isArray(data.pairs)) data.pairs = data.pairs.slice(0, n);
      return data;
    }
    case 'memory_match': {
      // Memory needs at least 2 pairs to play.
      const limit = Math.max(2, n);
      const pairs = asArray(data.pairs?.length ? data.pairs : data.items).slice(0, limit);
      data.items = pairs;
      data.pairs = pairs;
      return data;
    }
    case 'quiz_show':
    case 'quiz_rush': {
      const list = asArray(data.rounds?.length ? data.rounds : data.items).slice(0, n);
      data.items = list;
      data.rounds = list.map((item) => ({
        prompt: item.prompt || item.question || item.label,
        choices: item.choices || item.options || [],
        correctIndex: item.correctIndex ?? item.correct_index ?? 0,
        timeLimitSeconds: item.timeLimitSeconds || 20,
      }));
      return data;
    }
    case 'spin_wheel':
    case 'millionaire': {
      if (Array.isArray(data.items)) data.items = data.items.slice(0, n);
      if (Array.isArray(data.rounds)) data.rounds = data.rounds.slice(0, n);
      return data;
    }
    case 'mission_adventure': {
      if (Array.isArray(data.missions)) data.missions = data.missions.slice(0, n);
      return data;
    }
    case 'escape_room': {
      if (Array.isArray(data.stages)) data.stages = data.stages.slice(0, n);
      return data;
    }
    case 'crossword':
    case 'puzzle_challenge': {
      if (Array.isArray(data.items)) data.items = data.items.slice(0, n);
      if (Array.isArray(data.clues)) data.clues = data.clues.slice(0, n);
      return data;
    }
    case 'jeopardy': {
      let remaining = n;
      const categories = [];
      for (const category of asArray(data.categories)) {
        if (remaining <= 0) break;
        const clues = asArray(category?.clues).slice(0, remaining);
        if (!clues.length) continue;
        remaining -= clues.length;
        categories.push({ ...category, clues });
      }
      data.categories = categories;
      return data;
    }
    case 'word_search':
    case 'word_scramble': {
      const words = asArray(data.words).slice(0, n);
      // Drop stale grid so placements match the trimmed word list.
      return ensureWordSearchData({
        ...data,
        words,
        grid: undefined,
        placements: undefined,
      });
    }
    default:
      return data;
  }
}
