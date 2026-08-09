import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assertGameDataMatchesType } from '../utils/gameDataValidation.js';
import { calculateGameScore } from '../utils/gameScoring.js';
import { GAME_TYPES } from '../utils/gameTypes.js';
import { COMPONENT_MAP_KEYS } from './helpers/gameRendererKeys.js';

const VALID_BY_TYPE = {
  flashcards: {
    items: [
      { term: 'A', definition: '1' },
      { term: 'B', definition: '2' },
    ],
  },
  memory_match: {
    pairs: [
      { term: 'A', definition: '1' },
      { term: 'B', definition: '2' },
    ],
  },
  crossword: {
    items: [
      { clue: 'Opposite of yes', answer: 'NO', direction: 'across', row: 0, col: 0 },
      { clue: 'Opposite of stop', answer: 'GO', direction: 'down', row: 1, col: 0 },
    ],
  },
  word_search: {
    words: ['ATOM', 'CELL'],
    gridSize: 10,
  },
  quiz_show: {
    items: [
      { question: 'Q1?', choices: ['A', 'B', 'C', 'D'], correctIndex: 0 },
      { question: 'Q2?', choices: ['A', 'B', 'C', 'D'], correctIndex: 1 },
    ],
  },
  jeopardy: {
    categories: [
      {
        name: 'Science',
        clues: [
          { points: 100, clue: 'H2O', answer: 'Water' },
          { points: 200, clue: 'O2', answer: 'Oxygen' },
        ],
      },
    ],
  },
  drag_drop: {
    items: [
      { term: 'A', definition: '1' },
      { term: 'B', definition: '2' },
    ],
  },
  spin_wheel: {
    items: [
      {
        label: 'Round 1',
        question: 'Q?',
        choices: ['A', 'B', 'C', 'D'],
        correctIndex: 0,
      },
    ],
  },
  millionaire: {
    items: [
      {
        question: 'Q?',
        choices: ['A', 'B', 'C', 'D'],
        correctIndex: 1,
        difficulty: 'easy',
      },
    ],
  },
  escape_room: {
    stages: [
      { name: 'Stage 1', clue: 'Starts with W', answer: 'WATER', hint: 'Drink' },
      { name: 'Stage 2', clue: 'Gas we breathe', answer: 'OXYGEN', hint: 'Air' },
    ],
  },
  mission_adventure: {
    missions: [
      {
        title: 'Mission 1',
        prompt: 'Pick the best term',
        choices: ['Atom', 'Noise', 'Cloud'],
        correctIndex: 0,
        xp: 10,
      },
    ],
  },
  puzzle_challenge: {
    items: [
      { prompt: '2+2', answer: '4', hint: 'Even' },
      { prompt: '3+1', answer: '4', hint: 'Even' },
    ],
  },
};

describe('AI game type integrity - schema validation', () => {
  for (const type of GAME_TYPES) {
    it(`accepts valid ${type} game_data`, () => {
      assert.equal(assertGameDataMatchesType(type, VALID_BY_TYPE[type]), true);
    });
  }

  it('rejects missing required fields', () => {
    assert.throws(
      () => assertGameDataMatchesType('flashcards', { items: [] }),
      /required|at least/i
    );
    assert.throws(
      () => assertGameDataMatchesType('jeopardy', { categories: [] }),
      /required/i
    );
    assert.throws(
      () => assertGameDataMatchesType('escape_room', {}),
      /stages/i
    );
  });

  it('rejects cross-type contamination (wrong structures)', () => {
    assert.throws(
      () => assertGameDataMatchesType('memory_match', {
        items: [{ question: 'Q?', choices: ['A', 'B'], correctIndex: 0 }],
      }, { asTypeMismatch: true }),
      /did not match the selected game type/i
    );
    assert.throws(
      () => assertGameDataMatchesType('jeopardy', {
        items: [{ term: 'A', definition: '1' }],
      }, { asTypeMismatch: true }),
      /did not match the selected game type/i
    );
    assert.throws(
      () => assertGameDataMatchesType('crossword', {
        items: [{ question: 'Q?', choices: ['A', 'B'], correctIndex: 0 }],
      }),
      /clue and answer/i
    );
    assert.throws(
      () => assertGameDataMatchesType('quiz_show', {
        categories: [{ name: 'X', clues: [{ clue: 'c', answer: 'a' }] }],
      }),
      /quiz items|question|choices|correctIndex/i
    );
    assert.throws(
      () => assertGameDataMatchesType('flashcards', {
        stages: [{ clue: 'x', answer: 'y' }],
      }, { asTypeMismatch: true }),
      /did not match the selected game type/i
    );
  });
});

describe('AI game type integrity - scoring', () => {
  it('computes server scores from authoritative game_data + answers', () => {
    assert.equal(
      calculateGameScore('quiz_show', VALID_BY_TYPE.quiz_show, { choices: [0, 1] }),
      100
    );
    assert.equal(
      calculateGameScore('flashcards', VALID_BY_TYPE.flashcards, {
        remembered: [true, false],
      }),
      50
    );
    assert.equal(
      calculateGameScore('memory_match', VALID_BY_TYPE.memory_match, {
        moves: 2,
        matchedPairs: 2,
      }),
      Math.max(40, 100 - 2 * 3)
    );
    assert.equal(
      calculateGameScore('word_search', VALID_BY_TYPE.word_search, {
        foundWords: ['ATOM', 'CELL'],
      }),
      100
    );
    assert.equal(
      calculateGameScore('jeopardy', VALID_BY_TYPE.jeopardy, {
        responses: [
          { categoryIndex: 0, clueIndex: 0, answer: 'Water' },
          { categoryIndex: 0, clueIndex: 1, answer: 'Oxygen' },
        ],
      }),
      100
    );
    assert.equal(
      calculateGameScore('escape_room', VALID_BY_TYPE.escape_room, {
        responses: ['WATER', 'OXYGEN'],
      }),
      100
    );
    assert.equal(
      calculateGameScore('mission_adventure', VALID_BY_TYPE.mission_adventure, {
        choices: [0],
      }),
      100
    );
    assert.equal(
      calculateGameScore('puzzle_challenge', VALID_BY_TYPE.puzzle_challenge, {
        responses: ['4', '4'],
      }),
      100
    );
    assert.equal(
      calculateGameScore('drag_drop', VALID_BY_TYPE.drag_drop, {
        matches: { 0: '1', 1: '2' },
      }),
      100
    );
    assert.equal(
      calculateGameScore('spin_wheel', VALID_BY_TYPE.spin_wheel, {
        rounds: [{ itemIndex: 0, choiceIndex: 0 }],
      }),
      100
    );
    assert.equal(
      calculateGameScore('millionaire', VALID_BY_TYPE.millionaire, {
        choices: [1],
      }),
      100
    );
    assert.equal(
      calculateGameScore('crossword', VALID_BY_TYPE.crossword, {
        answers: { 0: 'NO', 1: 'GO' },
      }),
      100
    );
  });

  it('rejects missing answers (forged client score cannot bypass)', () => {
    assert.throws(
      () => calculateGameScore('quiz_show', VALID_BY_TYPE.quiz_show, null),
      /answers are required/i
    );
  });
});

describe('AI game type integrity - renderer mapping', () => {
  it('maps every supported AI game type to a component', () => {
    for (const type of GAME_TYPES) {
      assert.ok(COMPONENT_MAP_KEYS[type], `missing renderer mapping for ${type}`);
    }
  });
});

describe('AI game type integrity - publish gate', () => {
  it('review publish validation accepts jeopardy/escape without items[]', async () => {
    const { default: AiReviewService } = await import('../services/AiReviewService.js');
    // Exercise the same type-specific helper used by publish.
    assert.doesNotThrow(() => assertGameDataMatchesType('jeopardy', VALID_BY_TYPE.jeopardy));
    assert.doesNotThrow(() => assertGameDataMatchesType('escape_room', VALID_BY_TYPE.escape_room));
    assert.doesNotThrow(() => assertGameDataMatchesType('mission_adventure', VALID_BY_TYPE.mission_adventure));
    assert.doesNotThrow(() => assertGameDataMatchesType('word_search', VALID_BY_TYPE.word_search));
    assert.equal(typeof AiReviewService.normalizeGame, 'function');
  });
});
