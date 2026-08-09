import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEPRECATED_GAME_TYPES,
  isDeprecatedGameType,
  normalizeGameType,
  ALL_GAME_TYPES,
} from '../utils/gameTypes.js';
import { assertGameDataMatchesType } from '../utils/gameDataValidation.js';
import { calculateGameScore } from '../utils/gameScoring.js';
import { buildWordSearchGrid, ensureWordSearchData } from '../utils/wordSearchGrid.js';
import { COMPONENT_MAP_KEYS } from './helpers/gameRendererKeys.js';

describe('legacy true_false_blitz deprecation', () => {
  it('marks true_false_blitz as deprecated and not creatable', () => {
    assert.ok(DEPRECATED_GAME_TYPES.includes('true_false_blitz'));
    assert.equal(isDeprecatedGameType('true_false_blitz'), true);
    assert.equal(normalizeGameType('true_false_blitz'), null);
    assert.equal(ALL_GAME_TYPES.includes('true_false_blitz'), false);
  });

  it('rejects scoring and validation for deprecated type', () => {
    assert.throws(
      () => assertGameDataMatchesType('true_false_blitz', { statements: [{ text: 'x', isTrue: true }] }),
      /deprecated/i
    );
    assert.throws(
      () => calculateGameScore('true_false_blitz', { statements: [] }, { choices: [] }),
      /deprecated/i
    );
  });

  it('is not mapped to a student renderer', () => {
    assert.equal(COMPONENT_MAP_KEYS.true_false_blitz, undefined);
  });
});

describe('word search authoritative grid', () => {
  it('builds a grid that contains every placed word', () => {
    const puzzle = buildWordSearchGrid(['ATOM', 'CELL', 'DNA'], 10);
    assert.ok(puzzle.grid.length >= 8);
    assert.ok(puzzle.words.includes('ATOM'));
    puzzle.placements.forEach((placement) => {
      let built = '';
      for (let i = 0; i < placement.word.length; i += 1) {
        const r = placement.direction === 'down' ? placement.row + i : placement.row;
        const c = placement.direction === 'across' ? placement.col + i : placement.col;
        built += puzzle.grid[r][c];
      }
      assert.equal(built, placement.word);
    });
  });

  it('scores only authoritative words and rejects invented claims via unique filter', () => {
    const gameData = ensureWordSearchData({ words: ['ATOM', 'CELL'], gridSize: 10 });
    assert.equal(
      calculateGameScore('word_search', gameData, { foundWords: ['ATOM', 'CELL'] }),
      100
    );
    assert.equal(
      calculateGameScore('word_search', gameData, { foundWords: ['ATOM', 'FAKEWORD'] }),
      50
    );
  });
});

describe('drag drop / spin wheel / crossword scoring contracts', () => {
  it('scores drag_drop matches from authoritative definitions', () => {
    const gameData = {
      items: [
        { term: 'Earthquake', definition: 'Ground shaking caused by seismic activity' },
        { term: 'Fire', definition: 'A destructive burning event' },
      ],
    };
    assert.equal(
      calculateGameScore('drag_drop', gameData, {
        matches: {
          0: 'Ground shaking caused by seismic activity',
          1: 'A destructive burning event',
        },
      }),
      100
    );
    assert.equal(
      calculateGameScore('drag_drop', gameData, {
        matches: {
          0: 'A destructive burning event',
          1: 'Ground shaking caused by seismic activity',
        },
      }),
      0
    );
  });

  it('rejects invalid spin wheel item indexes', () => {
    assert.throws(
      () => calculateGameScore(
        'spin_wheel',
        { items: [{ choices: ['A', 'B'], correctIndex: 0 }] },
        { rounds: [{ itemIndex: 9, choiceIndex: 0 }] }
      ),
      /unknown spin item/i
    );
  });

  it('scores crossword answers against clue answer text', () => {
    const gameData = {
      items: [
        { clue: 'Opposite of yes', answer: 'NO', direction: 'across', row: 0, col: 0 },
        { clue: 'Opposite of stop', answer: 'GO', direction: 'down', row: 0, col: 1 },
      ],
    };
    assert.equal(
      calculateGameScore('crossword', gameData, { answers: { 0: 'NO', 1: 'GO' } }),
      100
    );
    assert.equal(
      calculateGameScore('crossword', gameData, { answers: { 0: 'YES', 1: 'GO' } }),
      50
    );
  });
});

describe('type-specific editor publish gate samples', () => {
  it('accepts jeopardy/escape/word_search shapes without generic items[]', () => {
    assert.doesNotThrow(() => assertGameDataMatchesType('jeopardy', {
      categories: [{ name: 'Science', clues: [{ points: 100, clue: 'H2O', answer: 'Water' }] }],
    }));
    assert.doesNotThrow(() => assertGameDataMatchesType('escape_room', {
      stages: [{ name: '1', clue: 'hint', answer: 'KEY' }],
    }));
    assert.doesNotThrow(() => assertGameDataMatchesType('word_search', ensureWordSearchData({
      words: ['SAFE', 'ZONE'],
      gridSize: 10,
    })));
  });

  it('rejects edited contamination of game types', () => {
    assert.throws(
      () => assertGameDataMatchesType('memory_match', {
        items: [{ question: 'Q?', choices: ['A', 'B'], correctIndex: 0 }],
      }, { asTypeMismatch: true }),
      /did not match the selected game type/i
    );
    assert.throws(
      () => assertGameDataMatchesType('crossword', {
        items: [{ question: 'Q?', choices: ['A', 'B'], correctIndex: 0 }],
      }),
      /clue and answer/i
    );
  });
});
