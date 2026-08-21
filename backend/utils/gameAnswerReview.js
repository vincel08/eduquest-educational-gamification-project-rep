import { firstNonEmptyList } from './gameDataLists.js';

function getItems(gameData) {
  return firstNonEmptyList(gameData?.items, gameData?.pairs, gameData?.clues, gameData?.rounds);
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

function choiceLabel(choices, index) {
  if (!Array.isArray(choices) || index == null || index === '') return '—';
  const value = choices[Number(index)];
  return value != null && value !== '' ? String(value) : '—';
}

function itemPrompt(item, fallbackIndex) {
  return (
    item?.question ||
    item?.prompt ||
    item?.clue ||
    item?.term ||
    item?.left ||
    `Item ${fallbackIndex + 1}`
  );
}

function buildChoiceItems(pool, answers, { allowPartial = false } = {}) {
  const choices = Array.isArray(answers?.choices) ? answers.choices : [];
  const limit = allowPartial
    ? Math.min(choices.length, pool.length)
    : pool.length;

  return pool.map((item, index) => {
    const answered = index < limit;
    const selected = answered ? Number(choices[index]) : null;
    const correctIndex = Number(item?.correctIndex ?? 0);
    const isCorrect = answered && selected === correctIndex;
    return {
      prompt: itemPrompt(item, index),
      studentAnswer: answered ? choiceLabel(item.choices, selected) : '—',
      correctAnswer: choiceLabel(item.choices, correctIndex),
      isCorrect: answered ? isCorrect : null,
      answerStored: answered,
    };
  });
}

/**
 * Build teacher-facing answer rows from stored game answers + game_data.
 */
export function buildGameAnswerReviewItems(gameType, gameData, answers) {
  if (!answers || typeof answers !== 'object') return [];

  const type = String(gameType || '');

  switch (type) {
    case 'quiz_show':
    case 'quiz_rush':
      return buildChoiceItems(getRounds(gameData), answers);

    case 'millionaire':
      return buildChoiceItems(getItems(gameData), answers, {
        allowPartial: true,
      });

    case 'mission_adventure':
      return buildChoiceItems(gameData?.missions || [], answers, {
        allowPartial: true,
      });

    case 'spin_wheel': {
      const items = getItems(gameData);
      const rounds = Array.isArray(answers.rounds) ? answers.rounds : [];
      return rounds.map((round, index) => {
        const item = items[Number(round.itemIndex)];
        const choiceIndex = Number(round.choiceIndex);
        const correctIndex = Number(item?.correctIndex ?? 0);
        return {
          prompt: item ? itemPrompt(item, Number(round.itemIndex)) : `Round ${index + 1}`,
          studentAnswer: item ? choiceLabel(item.choices, choiceIndex) : '—',
          correctAnswer: item ? choiceLabel(item.choices, correctIndex) : '—',
          isCorrect: item ? choiceIndex === correctIndex : null,
          answerStored: true,
        };
      });
    }

    case 'puzzle_challenge':
    case 'escape_room': {
      const items =
        type === 'escape_room'
          ? gameData?.stages || getItems(gameData)
          : getItems(gameData);
      const responses = Array.isArray(answers.responses) ? answers.responses : [];
      return items.map((item, index) => {
        const student = responses[index];
        const answered = student != null && student !== '';
        const expected = item?.answer || item?.solution || item?.correctAnswer || '';
        const isCorrect =
          answered &&
          String(student).replace(/\s+/g, '').toUpperCase() ===
            String(expected).replace(/\s+/g, '').toUpperCase();
        return {
          prompt: itemPrompt(item, index),
          studentAnswer: answered ? String(student) : '—',
          correctAnswer: expected ? String(expected) : '—',
          isCorrect: answered ? isCorrect : null,
          answerStored: answered,
        };
      });
    }

    case 'jeopardy': {
      const categories = gameData?.categories || [];
      const responses = Array.isArray(answers.responses) ? answers.responses : [];
      return responses.map((response, index) => {
        const category = categories[Number(response.categoryIndex)];
        const clue = category?.clues?.[Number(response.clueIndex)];
        const student = response.answer ?? response.response ?? '';
        const expected = clue?.answer || '';
        const isCorrect =
          String(student).trim().toLowerCase() ===
          String(expected).trim().toLowerCase();
        return {
          prompt:
            clue?.question ||
            clue?.prompt ||
            `${category?.name || 'Category'} · ${clue?.value || index + 1}`,
          studentAnswer: student !== '' ? String(student) : '—',
          correctAnswer: expected ? String(expected) : '—',
          isCorrect,
          answerStored: true,
        };
      });
    }

    case 'flashcards': {
      const items = getItems(gameData);
      const remembered = Array.isArray(answers.remembered)
        ? answers.remembered
        : [];
      return items.map((item, index) => {
        const known = Boolean(remembered[index]);
        return {
          prompt: itemPrompt(item, index),
          studentAnswer: known ? 'Marked as remembered' : 'Not remembered',
          correctAnswer: item?.definition || item?.back || item?.answer || '—',
          isCorrect: known,
          answerStored: true,
        };
      });
    }

    case 'drag_drop': {
      const items = getItems(gameData);
      const matches =
        answers.matches && typeof answers.matches === 'object'
          ? answers.matches
          : {};
      return items.map((item, index) => {
        const studentKey =
          matches[index] ?? matches[String(index)] ?? matches[item.id];
        const expected = item?.right || item?.match || item?.answer || '';
        const studentLabel =
          studentKey != null && studentKey !== '' ? String(studentKey) : '—';
        const isCorrect =
          String(studentLabel).trim().toLowerCase() ===
          String(expected).trim().toLowerCase();
        return {
          prompt: itemPrompt(item, index),
          studentAnswer: studentLabel,
          correctAnswer: expected ? String(expected) : '—',
          isCorrect: studentKey != null ? isCorrect : null,
          answerStored: studentKey != null,
        };
      });
    }

    case 'memory_match': {
      return [
        {
          prompt: 'Memory match result',
          studentAnswer: `${Number(answers.matchedPairs) || 0} pairs · ${Number(answers.moves) || 0} moves`,
          correctAnswer: `${getItems(gameData).length || '—'} pairs`,
          isCorrect: null,
          answerStored: true,
        },
      ];
    }

    case 'word_search':
    case 'word_scramble': {
      const rawWords = firstNonEmptyList(
        gameData?.words,
        getItems(gameData).map((item) => item.term || item.word || item.answer).filter(Boolean),
      );
      const words = rawWords
        .map((word) =>
          typeof word === 'string' ? word : word?.word || word?.text || word?.term || '',
        )
        .filter(Boolean);
      const found = Array.isArray(answers.foundWords) ? answers.foundWords : [];
      const foundSet = new Set(
        found.map((word) => String(word || '').trim().toLowerCase()),
      );
      return words
        .map((word, index) => {
          const hit = foundSet.has(String(word).trim().toLowerCase());
          return {
            prompt: `Word ${index + 1}`,
            studentAnswer: hit ? String(word) : 'Not found',
            correctAnswer: String(word),
            isCorrect: hit,
            answerStored: true,
          };
        });
    }

    case 'crossword': {
      const clues = firstNonEmptyList(gameData?.items, gameData?.clues);
      const responses =
        answers.answers && typeof answers.answers === 'object'
          ? answers.answers
          : {};
      return clues.map((clue, index) => {
        const student =
          responses[index] ?? responses[String(index)] ?? responses[clue.id];
        const expected = clue?.answer || clue?.word || '';
        const answered = student != null && student !== '';
        const isCorrect =
          answered &&
          String(student).replace(/\s+/g, '').toUpperCase() ===
            String(expected).replace(/\s+/g, '').toUpperCase();
        return {
          prompt: clue?.clue || clue?.prompt || `Clue ${index + 1}`,
          studentAnswer: answered ? String(student) : '—',
          correctAnswer: expected ? String(expected) : '—',
          isCorrect: answered ? isCorrect : null,
          answerStored: answered,
        };
      });
    }

    default:
      return [
        {
          prompt: 'Submitted answers',
          studentAnswer: JSON.stringify(answers),
          correctAnswer: '—',
          isCorrect: null,
          answerStored: true,
        },
      ];
  }
}
