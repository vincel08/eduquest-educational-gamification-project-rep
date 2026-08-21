/**
 * Prefer the first non-empty array. Empty [] must not shadow real content
 * (e.g. items: [] hiding pairs/clues/rounds/words).
 */
export function firstNonEmptyList(...candidates) {
  for (const list of candidates) {
    if (Array.isArray(list) && list.length) return list;
  }
  for (const list of candidates) {
    if (Array.isArray(list)) return list;
  }
  return [];
}

/**
 * Stable fingerprint of game content so previews remount when teachers edit answers.
 */
export function gameDataContentKey(gameData = {}) {
  if (!gameData || typeof gameData !== 'object') return '';
  const parts = [];
  const pushList = (label, list, pick) => {
    if (!Array.isArray(list) || !list.length) return;
    parts.push(`${label}:${list.map(pick).join('¦')}`);
  };

  pushList('items', gameData.items, (item) => [
    item?.answer, item?.word, item?.term, item?.definition, item?.prompt, item?.question, item?.clue,
    item?.correctIndex, ...(Array.isArray(item?.choices) ? item.choices : []),
  ].join('~'));
  pushList('pairs', gameData.pairs, (item) => [
    item?.term, item?.definition, item?.front, item?.back, item?.answer,
  ].join('~'));
  pushList('clues', gameData.clues, (item) => [
    item?.clue, item?.answer, item?.word, item?.direction,
  ].join('~'));
  pushList('rounds', gameData.rounds, (item) => [
    item?.prompt, item?.question, item?.correctIndex, ...(Array.isArray(item?.choices) ? item.choices : []),
  ].join('~'));
  pushList('words', gameData.words, (item) => (typeof item === 'string' ? item : item?.word || item?.term || ''));
  pushList('stages', gameData.stages, (item) => [item?.name, item?.clue, item?.answer, item?.hint].join('~'));
  pushList('missions', gameData.missions, (item) => [
    item?.prompt, item?.question, item?.correctIndex, ...(Array.isArray(item?.choices) ? item.choices : []),
  ].join('~'));
  pushList('categories', gameData.categories, (category) => [
    category?.name,
    ...(Array.isArray(category?.clues)
      ? category.clues.map((clue) => [clue?.clue, clue?.answer, clue?.points].join('~'))
      : []),
  ].join('~'));

  return parts.join('||');
}

/**
 * Stable fingerprint of quiz questions for preview remounts.
 */
export function quizContentKey(quiz = {}) {
  if (!quiz || typeof quiz !== 'object') return '';
  const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
  return [
    quiz.title || '',
    quiz.description || '',
    ...questions.map((q) => [
      q.questionText || q.question_text || '',
      q.questionType || q.question_type || '',
      q.textAnswer || q.text_answer || '',
      ...(Array.isArray(q.options)
        ? q.options.map((o) => `${o.optionText || o.option_text || ''}:${Boolean(o.isCorrect ?? o.is_correct)}`)
        : []),
    ].join('~')),
  ].join('¦');
}
