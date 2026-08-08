import AppError from './AppError.js';

function clampScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeCompact(value) {
  return String(value || '').replace(/\s+/g, '').toUpperCase();
}

function getItems(gameData) {
  return gameData?.items || gameData?.pairs || [];
}

function getRounds(gameData) {
  if (Array.isArray(gameData?.rounds) && gameData.rounds.length) {
    return gameData.rounds;
  }
  return getItems(gameData).map((item) => ({
    prompt: item.question || item.prompt,
    choices: item.choices || [],
    correctIndex: item.correctIndex ?? 0,
  }));
}

function requireAnswersObject(answers) {
  if (answers == null || typeof answers !== 'object') {
    throw new AppError('Game answers are required for score validation', 400);
  }
}

function scoreChoicePool(pool, answers, { allowPartial = false } = {}) {
  const choices = Array.isArray(answers?.choices) ? answers.choices : null;
  if (!choices) {
    throw new AppError('Invalid game answers: choices are required', 400);
  }
  if (!allowPartial && choices.length !== pool.length) {
    throw new AppError('Invalid game answers: expected one choice per question', 400);
  }
  if (allowPartial && choices.length > pool.length) {
    throw new AppError('Invalid game answers: too many choices submitted', 400);
  }

  let correct = 0;
  const limit = allowPartial ? choices.length : pool.length;
  for (let index = 0; index < limit; index += 1) {
    if (Number(choices[index]) === Number(pool[index]?.correctIndex ?? 0)) {
      correct += 1;
    }
  }

  return pool.length ? Math.round((correct / pool.length) * 100) : 0;
}

function scoreSpinRounds(items, answers) {
  const rounds = Array.isArray(answers?.rounds) ? answers.rounds : null;
  if (!rounds?.length) {
    throw new AppError('Invalid game answers: spin rounds are required', 400);
  }

  let correct = 0;
  rounds.forEach((round) => {
    const item = items[Number(round.itemIndex)];
    if (!item) {
      throw new AppError('Invalid game answers: unknown spin item', 400);
    }
    if (Number(round.choiceIndex) === Number(item.correctIndex ?? 0)) {
      correct += 1;
    }
  });

  const totalRounds = Math.min(items.length, 5);
  return totalRounds ? Math.round((correct / totalRounds) * 100) : 0;
}

function scoreRemembered(items, answers) {
  const remembered = Array.isArray(answers?.remembered) ? answers.remembered : null;
  if (!remembered || remembered.length !== items.length) {
    throw new AppError('Invalid game answers: remembered flags must match item count', 400);
  }
  const known = remembered.filter(Boolean).length;
  return items.length ? Math.round((known / items.length) * 100) : 0;
}

function scoreMatches(items, answers) {
  const matches = answers?.matches && typeof answers.matches === 'object'
    ? answers.matches
    : null;
  if (!matches) {
    throw new AppError('Invalid game answers: matches are required', 400);
  }

  let correct = 0;
  items.forEach((item, index) => {
    const given = matches[String(index)] ?? matches[index];
    if (normalizeText(given) === normalizeText(item.definition || item.back || item.answer)) {
      correct += 1;
    }
  });
  return items.length ? Math.round((correct / items.length) * 100) : 0;
}

function scoreMemory(items, answers) {
  const moves = Number(answers?.moves);
  const matchedPairs = Number(answers?.matchedPairs);
  if (!Number.isFinite(moves) || moves < 0) {
    throw new AppError('Invalid game answers: moves are required', 400);
  }
  if (!Number.isFinite(matchedPairs) || matchedPairs < 0) {
    throw new AppError('Invalid game answers: matchedPairs are required', 400);
  }
  if (matchedPairs < items.length) {
    return items.length
      ? Math.round((matchedPairs / items.length) * Math.max(40, 100 - moves * 3))
      : 0;
  }
  return Math.max(40, 100 - moves * 3);
}

function scoreJeopardy(gameData, answers) {
  const categories = gameData?.categories || [];
  const responses = Array.isArray(answers?.responses) ? answers.responses : null;
  if (!responses) {
    throw new AppError('Invalid game answers: responses are required', 400);
  }

  let earned = 0;
  let maxPoints = 0;
  categories.forEach((category, categoryIndex) => {
    (category.clues || []).forEach((clue, clueIndex) => {
      const points = Number(clue.points) || 100;
      maxPoints += points;
      const response = responses.find(
        (item) => Number(item.categoryIndex) === categoryIndex
          && Number(item.clueIndex) === clueIndex
      );
      if (response && normalizeText(response.answer) === normalizeText(clue.answer)) {
        earned += points;
      }
    });
  });

  return maxPoints ? Math.round((earned / maxPoints) * 100) : 0;
}

function scoreEscape(gameData, answers) {
  const stages = gameData?.stages || [];
  const responses = Array.isArray(answers?.responses) ? answers.responses : null;
  if (!responses) {
    throw new AppError('Invalid game answers: responses are required', 400);
  }
  if (responses.length > stages.length) {
    throw new AppError('Invalid game answers: too many stage responses', 400);
  }

  let correct = 0;
  responses.forEach((response, index) => {
    const expected = stages[index]?.answer || stages[index]?.correctAnswer;
    if (normalizeText(response) === normalizeText(expected)) {
      correct += 1;
    }
  });
  return stages.length ? Math.round((correct / stages.length) * 100) : 0;
}

function scoreTextItems(items, answers, { compact = false } = {}) {
  const responses = Array.isArray(answers?.responses) ? answers.responses : null;
  if (!responses) {
    throw new AppError('Invalid game answers: responses are required', 400);
  }
  if (responses.length > items.length) {
    throw new AppError('Invalid game answers: too many responses', 400);
  }

  let correct = 0;
  responses.forEach((response, index) => {
    const expected = items[index]?.answer || items[index]?.solution;
    const left = compact ? normalizeCompact(response) : normalizeText(response);
    const right = compact ? normalizeCompact(expected) : normalizeText(expected);
    if (left && left === right) correct += 1;
  });
  return items.length ? Math.round((correct / items.length) * 100) : 0;
}

function scoreWordSearch(gameData, answers) {
  const words = (gameData?.words || getItems(gameData).map((item) => item.term || item.word))
    .map((word) => normalizeText(word))
    .filter(Boolean);
  const found = Array.isArray(answers?.foundWords)
    ? answers.foundWords.map((word) => normalizeText(word))
    : null;
  if (!found) {
    throw new AppError('Invalid game answers: foundWords are required', 400);
  }

  const uniqueFound = [...new Set(found)].filter((word) => words.includes(word));
  return words.length ? Math.round((uniqueFound.length / words.length) * 100) : 0;
}

function scoreCrossword(gameData, answers) {
  const clues = gameData?.clues || getItems(gameData);
  const responses = answers?.answers && typeof answers.answers === 'object'
    ? answers.answers
    : null;
  if (!responses) {
    throw new AppError('Invalid game answers: crossword answers are required', 400);
  }

  let correct = 0;
  clues.forEach((clue, index) => {
    const expected = clue.answer || clue.solution;
    const given = responses[String(index)] ?? responses[index] ?? responses[clue.id];
    if (normalizeCompact(given) === normalizeCompact(expected)) {
      correct += 1;
    }
  });
  return clues.length ? Math.round((correct / clues.length) * 100) : 0;
}

/**
 * Authoritative server-side score from game_data + client answers.
 * Never trusts payload.score for the final value.
 */
export function calculateGameScore(gameType, gameData, answers) {
  if (!gameData || typeof gameData !== 'object') {
    throw new AppError('Game data is unavailable for scoring', 400);
  }
  requireAnswersObject(answers);

  const type = String(gameType || '');
  let score = 0;

  switch (type) {
    case 'quiz_show':
    case 'quiz_rush':
    case 'true_false_blitz':
      score = scoreChoicePool(getRounds(gameData), answers);
      break;
    case 'millionaire':
      score = scoreChoicePool(getItems(gameData), answers, { allowPartial: true });
      break;
    case 'spin_wheel':
      score = scoreSpinRounds(getItems(gameData), answers);
      break;
    case 'mission_adventure':
      score = scoreChoicePool(gameData.missions || [], answers);
      break;
    case 'puzzle_challenge':
      score = scoreTextItems(getItems(gameData), answers, { compact: true });
      break;
    case 'flashcards':
      score = scoreRemembered(getItems(gameData), answers);
      break;
    case 'drag_drop':
      score = scoreMatches(getItems(gameData), answers);
      break;
    case 'memory_match':
      score = scoreMemory(getItems(gameData), answers);
      break;
    case 'jeopardy':
      score = scoreJeopardy(gameData, answers);
      break;
    case 'escape_room':
      score = scoreEscape(gameData, answers);
      break;
    case 'word_search':
    case 'word_scramble':
      score = scoreWordSearch(gameData, answers);
      break;
    case 'crossword':
      score = scoreCrossword(gameData, answers);
      break;
    default:
      throw new AppError(`Unsupported game type for scoring: ${type}`, 400);
  }

  return clampScore(score);
}

export function calculateGameXp(score, xpReward) {
  const reward = Number(xpReward) || 0;
  const normalized = clampScore(score);
  if (normalized >= 70) return reward;
  return Math.floor(reward * (normalized / 100));
}

export { clampScore };
