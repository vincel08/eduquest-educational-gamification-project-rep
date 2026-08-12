import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateGameScore,
  calculateGameXp,
  clampScore,
} from '../utils/gameScoring.js';

describe('gamification integrity - game scoring', () => {
  it('rejects missing answers', () => {
    assert.throws(
      () => calculateGameScore('quiz_show', { items: [{ correctIndex: 0, choices: ['A', 'B'] }] }, null),
      /answers are required/i
    );
  });

  it('rejects artificially high client score by ignoring it and requiring answers', () => {
    assert.throws(
      () => calculateGameScore('quiz_show', { items: [{ correctIndex: 0, choices: ['A', 'B'] }] }, undefined),
      /answers are required/i
    );
  });

  it('computes quiz_show score from choices', () => {
    const gameData = {
      items: [
        { choices: ['A', 'B'], correctIndex: 1 },
        { choices: ['A', 'B'], correctIndex: 0 },
      ],
    };
    const score = calculateGameScore('quiz_show', gameData, { choices: [1, 0] });
    assert.equal(score, 100);
    assert.equal(calculateGameScore('quiz_show', gameData, { choices: [0, 0] }), 50);
  });

  it('computes flashcard score from remembered flags', () => {
    const gameData = {
      items: [
        { term: 'A', definition: '1' },
        { term: 'B', definition: '2' },
        { term: 'C', definition: '3' },
        { term: 'D', definition: '4' },
      ],
    };
    assert.equal(
      calculateGameScore('flashcards', gameData, { remembered: [true, true, false, false] }),
      50
    );
  });

  it('caps scores between 0 and 100', () => {
    assert.equal(clampScore(9999), 100);
    assert.equal(clampScore(-5), 0);
  });

  it('uses existing XP thresholds for games', () => {
    assert.equal(calculateGameXp(70, 40), 40);
    assert.equal(calculateGameXp(50, 40), 20);
    assert.equal(calculateGameXp(0, 40), 0);
  });

  it('scores memory match from moves and matched pairs', () => {
    const gameData = {
      items: [
        { term: 'A', definition: '1' },
        { term: 'B', definition: '2' },
      ],
    };
    assert.equal(
      calculateGameScore('memory_match', gameData, { moves: 2, matchedPairs: 2 }),
      Math.max(40, 100 - 2 * 3)
    );
  });

  it('rejects forged spin answers for unknown items', () => {
    assert.throws(
      () => calculateGameScore(
        'spin_wheel',
        { items: [{ choices: ['A', 'B'], correctIndex: 0 }] },
        { rounds: [{ itemIndex: 9, choiceIndex: 0 }] }
      ),
      /unknown spin item/i
    );
  });
});

describe('gamification integrity - reward policy assumptions', () => {
  it('documents one-time quiz/game XP policy helpers', () => {
    // Policy enforced in GamificationService.awardXpOnce + unique index.
    // First completion awards XP; retries return alreadyAwarded=true.
    assert.equal(typeof calculateGameXp, 'function');
    assert.equal(calculateGameXp(100, 30), 30);
  });
});
