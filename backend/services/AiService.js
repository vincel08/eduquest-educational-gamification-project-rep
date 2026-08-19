import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import env from '../config/env.js';
import AppError from '../utils/AppError.js';
import { GAME_TYPES, normalizeGameType } from '../utils/gameTypes.js';
import { assertGameDataMatchesType } from '../utils/gameDataValidation.js';
import { ensureWordSearchData } from '../utils/wordSearchGrid.js';
import {
  clampQuestionCount,
  sanitizeAiError,
  withTimeout,
} from '../utils/aiLimits.js';

function getActiveProvider() {
  if (env.gemini.apiKey) return 'gemini';
  if (env.openai.apiKey) return 'openai';
  return null;
}

function missingAiKeyWarning() {
  if (env.isProduction) {
    return 'AI is not configured. Set GEMINI_API_KEY on the API host (e.g. Railway Variables), then redeploy.';
  }
  return 'AI is not configured. Add GEMINI_API_KEY to backend/.env for free Gemini generation.';
}

function assertAiConfigured() {
  if (!getActiveProvider()) {
    throw new AppError(missingAiKeyWarning(), 503);
  }
}

function stripCodeFences(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenced?.[1]?.trim() || text.trim();
}

function repairJsonText(text) {
  let cleaned = stripCodeFences(text);

  const start = cleaned.search(/[\{\[]/);
  if (start > 0) {
    cleaned = cleaned.slice(start);
  }

  // Normalize smart quotes that break JSON.parse
  cleaned = cleaned
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'");

  // Remove trailing commas before } or ]
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');

  // Remove JS-style comments sometimes emitted by models
  cleaned = cleaned.replace(/^\s*\/\/.*$/gm, '');

  return cleaned.trim();
}

function extractJson(text) {
  if (!text) {
    throw new AppError('AI returned an empty response', 502);
  }

  const candidates = [];
  const trimmed = text.trim();
  candidates.push(trimmed);
  candidates.push(stripCodeFences(trimmed));
  candidates.push(repairJsonText(trimmed));

  const startObj = trimmed.indexOf('{');
  const endObj = trimmed.lastIndexOf('}');
  if (startObj !== -1 && endObj > startObj) {
    candidates.push(trimmed.slice(startObj, endObj + 1));
    candidates.push(repairJsonText(trimmed.slice(startObj, endObj + 1)));
  }

  let lastError = null;
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch (error) {
      lastError = error;
    }
  }

  throw new AppError('AI returned invalid content. Please try generating again.', 502);
}

async function chatJsonWithGemini(systemPrompt, userPrompt) {
  const client = new GoogleGenerativeAI(env.gemini.apiKey);
  const modelsToTry = [
    env.gemini.model,
    'gemini-3.5-flash',
    'gemini-flash-latest',
    'gemini-3.1-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-3-flash-preview',
  ].filter((model, index, list) => model && list.indexOf(model) === index);

  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      const model = client.getGenerativeModel({
        model: modelName,
        systemInstruction: `${systemPrompt}

CRITICAL: Respond with valid JSON only.
- No markdown fences
- No trailing commas
- No comments
- Escape all quotes inside strings`,
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: env.aiLimits.maxOutputTokens,
          responseMimeType: 'application/json',
        },
      });

      const result = await withTimeout(model.generateContent(userPrompt));
      const content = result.response?.text?.() || '';
      if (!content) {
        throw new AppError('AI returned invalid content. Please try generating again.', 502);
      }
      const parsed = extractJson(content);
      console.log(`Gemini model used: ${modelName}`);
      return { data: parsed, model: modelName };
    } catch (error) {
      lastError = error;
      if (error?.code === 'AI_TIMEOUT' || error?.statusCode === 504) {
        throw error;
      }
      const message = String(error?.message || error);
      const shouldTryNext = (
        message.includes('429')
        || message.includes('404')
        || message.includes('invalid JSON')
        || message.includes('JSON')
        || message.toLowerCase().includes('quota')
        || message.toLowerCase().includes('no longer available')
        || message.toLowerCase().includes('expected')
      );
      console.error(`Gemini model "${modelName}" failed:`, message);

      if (!shouldTryNext) {
        const safe = sanitizeAiError(error);
        throw new AppError(safe.message, safe.statusCode);
      }
    }
  }

  const safe = sanitizeAiError(lastError || new Error('All Gemini models failed'));
  throw new AppError(safe.message, safe.statusCode);
}

async function chatJsonWithOpenAI(systemPrompt, userPrompt) {
  const client = new OpenAI({
    apiKey: env.openai.apiKey,
    timeout: env.aiLimits.requestTimeoutMs,
  });
  const completion = await withTimeout(
    client.chat.completions.create({
      model: env.openai.model,
      temperature: 0.7,
      max_tokens: env.aiLimits.maxOutputTokens,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    })
  );

  const content = completion.choices[0]?.message?.content;
  return { data: extractJson(content), model: env.openai.model };
}

async function chatJson(systemPrompt, userPrompt) {
  const provider = getActiveProvider();

  if (!provider) {
    throw new AppError(
      'AI service is temporarily unavailable. Please try again later.',
      503
    );
  }

  try {
    if (provider === 'gemini') {
      const result = await chatJsonWithGemini(systemPrompt, userPrompt);
      return {
        data: result.data,
        source: 'gemini',
        model: result.model,
      };
    }

    const result = await chatJsonWithOpenAI(systemPrompt, userPrompt);
    return {
      data: result.data,
      source: 'openai',
      model: result.model,
    };
  } catch (error) {
    const safe = sanitizeAiError(error);
    throw new AppError(safe.message, safe.statusCode);
  }
}

function pickOptionText(option, fallback = '') {
  if (typeof option === 'string') return option;
  return option?.optionText
    ?? option?.option_text
    ?? option?.text
    ?? option?.label
    ?? fallback;
}

function normalizeDifficultyLabel(value, fallback = 'Medium') {
  const raw = String(value || fallback).trim().toLowerCase();
  if (raw === 'easy') return 'Easy';
  if (raw === 'hard') return 'Hard';
  return 'Medium';
}

function normalizeContentQuiz(data, topic, difficulty, questionCount) {
  const questions = Array.isArray(data?.questions) ? data.questions : [];
  const normalizedQuestions = questions
    .map((item, index) => {
      const question = item.question || item.questionText || item.question_text || `Question ${index + 1}`;
      const choices = Array.isArray(item.choices)
        ? item.choices.map((choice) => String(choice))
        : (item.options || []).map((option) => pickOptionText(option));
      let answer = String(item.answer || item.correctAnswer || '').trim();
      if (!choices.length) return null;
      if (!answer || !choices.some((choice) => choice.trim().toLowerCase() === answer.toLowerCase())) {
        const marked = (item.options || []).find((option) => option.isCorrect || option.is_correct);
        answer = pickOptionText(marked, choices[0]);
      }
      return {
        question,
        choices: choices.slice(0, 4),
        answer,
        explanation: item.explanation || '',
      };
    })
    .filter(Boolean)
    .slice(0, questionCount);

  return {
    title: data?.title || `${topic} Quiz`,
    description: data?.description || `Auto-generated quiz about ${topic}.`,
    difficulty: normalizeDifficultyLabel(data?.difficulty || difficulty),
    timeLimit: Number(data?.timeLimit || data?.time_limit || 15) || 15,
    passingScore: Number(data?.passingScore || data?.passing_score || 70) || 70,
    questions: normalizedQuestions,
  };
}

function normalizeGeneratedQuestions(rawQuestions, selectedType) {
  if (!Array.isArray(rawQuestions)) return [];

  return rawQuestions
    .filter((question) => question && (question.questionText || question.question_text || question.text))
    .map((question, index) => {
      const type = question.questionType || question.question_type || selectedType;
      const questionText = question.questionText || question.question_text || question.text || `Question ${index + 1}`;
      const explanation = question.explanation ?? null;
      const points = Number(question.points) || 1;

      if (type === 'matching') {
        if (Array.isArray(question.pairs) && question.pairs.length) {
          const options = [];
          question.pairs.forEach((pair, pairIndex) => {
            const matchKey = `p${index + 1}_${pairIndex + 1}`;
            options.push({
              optionText: String(pair.left || pair.term || `Left ${pairIndex + 1}`),
              isCorrect: false,
              side: 'left',
              matchKey,
            });
            options.push({
              optionText: String(pair.right || pair.definition || `Right ${pairIndex + 1}`),
              isCorrect: false,
              side: 'right',
              matchKey,
            });
          });
          return {
            questionText,
            questionType: 'matching',
            points,
            explanation,
            options,
          };
        }

        return {
          questionText,
          questionType: 'matching',
          points,
          explanation,
          options: (question.options || []).map((option, optionIndex) => ({
            optionText: pickOptionText(option, `Option ${optionIndex + 1}`),
            isCorrect: false,
            side: option.side === 'left' || option.side === 'right' ? option.side : 'none',
            matchKey: option.matchKey || option.match_key || null,
          })),
        };
      }

      if (type === 'identification') {
        const accepted = Array.isArray(question.acceptedAnswers) && question.acceptedAnswers.length
          ? question.acceptedAnswers
          : (question.options || [])
            .map((option) => pickOptionText(option))
            .filter(Boolean);

        return {
          questionText,
          questionType: 'identification',
          points,
          explanation,
          options: (accepted.length ? accepted : ['Answer']).map((text) => ({
            optionText: String(text),
            isCorrect: true,
          })),
        };
      }

      if (type === 'image_question') {
        return {
          questionText,
          questionType: 'image_question',
          points,
          explanation,
          imageUrl: question.imageUrl || question.image_url || null,
          options: (question.options || []).map((option, optionIndex) => ({
            optionText: pickOptionText(option, `Option ${optionIndex + 1}`),
            isCorrect: Boolean(option.isCorrect ?? option.is_correct),
          })),
        };
      }

      return {
        questionText,
        questionType: type === 'true_false' ? 'true_false' : 'multiple_choice',
        points,
        explanation,
        options: (question.options || []).map((option, optionIndex) => ({
          optionText: pickOptionText(option, `Option ${optionIndex + 1}`),
          isCorrect: Boolean(option.isCorrect ?? option.is_correct),
        })),
      };
    })
    .filter((question) => Array.isArray(question.options) && question.options.length > 0);
}

function limitGameCollection(list) {
  if (!Array.isArray(list)) return list;
  const max = env.aiLimits.maxGameItems;
  return list.slice(0, max);
}

function normalizeGeneratedGame(raw, requestedType) {
  // When the teacher selected a concrete type, never let the model silently switch types.
  const forcedType = requestedType && requestedType !== 'auto'
    ? (normalizeGameType(requestedType) || requestedType)
    : null;
  const resolvedType = forcedType
    || normalizeGameType(raw.gameType)
    || normalizeGameType(requestedType)
    || 'flashcards';

  let gameData = raw.gameData || raw.game_data || {};
  const items = raw.items || gameData.items || gameData.pairs || null;

  if (items && !gameData.items) {
    gameData = { ...gameData, items };
  }
  if (items && resolvedType === 'memory_match' && !gameData.pairs) {
    gameData = { ...gameData, pairs: items };
  }
  if (resolvedType === 'quiz_show' && !gameData.rounds && gameData.items) {
    gameData = {
      ...gameData,
      rounds: gameData.items.map((item) => ({
        prompt: item.question || item.prompt || `What is ${item.term}?`,
        choices: item.choices || [item.definition, 'Distractor A', 'Distractor B', 'Distractor C'],
        correctIndex: item.correctIndex ?? 0,
        timeLimitSeconds: 20,
      })),
    };
  }

  if (Array.isArray(gameData.items)) gameData.items = limitGameCollection(gameData.items);
  if (Array.isArray(gameData.pairs)) gameData.pairs = limitGameCollection(gameData.pairs);
  if (Array.isArray(gameData.rounds)) gameData.rounds = limitGameCollection(gameData.rounds);
  if (Array.isArray(gameData.words)) gameData.words = limitGameCollection(gameData.words);
  if (Array.isArray(gameData.stages)) gameData.stages = limitGameCollection(gameData.stages);
  if (Array.isArray(gameData.missions)) gameData.missions = limitGameCollection(gameData.missions);
  if (Array.isArray(gameData.categories)) {
    gameData.categories = gameData.categories.slice(0, 3).map((category) => ({
      ...category,
      clues: limitGameCollection(category.clues || []),
    }));
  }

  if (resolvedType === 'word_search' || resolvedType === 'word_scramble') {
    gameData = ensureWordSearchData(gameData);
  }

  return {
    title: raw.title || 'Educational Game',
    description: raw.description || '',
    gameType: resolvedType,
    difficulty: ['easy', 'medium', 'hard'].includes(String(raw.difficulty || '').toLowerCase())
      ? String(raw.difficulty).toLowerCase()
      : 'medium',
    estimatedTime: Number(raw.estimatedTime || raw.estimated_time) || 10,
    xpReward: Number(raw.xpReward || raw.xp_reward) || 100,
    gameData,
  };
}

function rethrowProviderFailure(error) {
  const safe = sanitizeAiError(error);
  throw new AppError(safe.message, safe.statusCode);
}

const AiService = {
  async generateQuiz({
    topic,
    difficulty = 'medium',
    questionCount = 5,
    gradeLevel = "junior high school",
    questionType = 'multiple_choice',
    lessonContent = '',
  }) {
    const allowedTypes = [
      'multiple_choice',
      'true_false',
      'matching',
      'identification',
      'image_question',
    ];
    const selectedType = allowedTypes.includes(questionType) ? questionType : 'multiple_choice';

    const typeInstruction = {
      matching: `ALL questions must use questionType "matching".
Each question includes pairs: [{ "left": "...", "right": "..." }, ...] with exactly 3 short pairs.
Keep left/right texts under 60 characters.
Do not use a flat options array for matching.
Return compact valid JSON only.`,
      identification: `ALL questions must use questionType "identification".
Each question includes acceptedAnswers: string[] (1-3 short acceptable answers).
Do not use multiple-choice options.
Return compact valid JSON only.`,
      image_question: `ALL questions must use questionType "image_question".
Write a stem that refers to a diagram/photo the teacher will attach later.
Include exactly 4 options with exactly one isCorrect=true.
Set imageUrl to null.
Return compact valid JSON only.`,
      multiple_choice: `ALL questions must use questionType "multiple_choice" with exactly 4 options.
Each option: { optionText, isCorrect }. Exactly one option isCorrect=true.
Return compact valid JSON only.`,
      true_false: `ALL questions must use questionType "true_false" with exactly two options: True and False.
Exactly one isCorrect=true.
Return compact valid JSON only.`,
    }[selectedType];

    const count = clampQuestionCount(questionCount);
    assertAiConfigured();

    try {
      const contentSnippet = String(lessonContent || '').slice(0, env.aiLimits.maxPromptCharacters);
      const { data, source } = await chatJson(
        `You are an expert junior high school educator creating quiz questions for EduWow.
Return JSON with keys: title, description, questions.
${typeInstruction}
Every question must include: questionText, questionType, points, explanation.`,
        `Create ${count} ${difficulty} ${selectedType.replace(/_/g, ' ')} quiz questions about "${topic}" for ${gradeLevel} students.
${contentSnippet ? `\nBase every question on this source material:\n${contentSnippet}` : ''}`
      );

      const questions = normalizeGeneratedQuestions(data.questions, selectedType).slice(0, count);
      if (!questions.length || !data?.title) {
        throw new AppError('AI returned invalid content. Please try generating again.', 502);
      }

      return {
        title: data.title || `${topic} Quiz`,
        description: data.description || `Auto-generated ${selectedType.replace(/_/g, ' ')} quiz about ${topic}.`,
        questions,
        source,
        warning: null,
      };
    } catch (error) {
      console.error('AI quiz generation failed:', error.message);
      rethrowProviderFailure(error);
    }
  },

  async generateContentQuiz({
    topic,
    lessonContent = '',
    difficulty = 'medium',
    questionCount = 5,
    gradeLevel = "junior high school",
  }) {
    const count = clampQuestionCount(questionCount);
    const contentSnippet = String(lessonContent || topic || '').slice(0, env.aiLimits.maxPromptCharacters);
    assertAiConfigured();

    try {
      const { data, source } = await chatJson(
        `You are an expert junior high school educator.
Analyze the lesson and generate an educational multiple-choice quiz.
Return ONLY valid JSON.
Do not include markdown.
Do not explain anything.

JSON shape:
{
  "title": "string",
  "description": "string",
  "difficulty": "Easy|Medium|Hard",
  "timeLimit": 15,
  "passingScore": 70,
  "questions": [
    {
      "question": "string",
      "choices": ["...", "...", "...", "..."],
      "answer": "exact matching choice text",
      "explanation": "string"
    }
  ]
}`,
        `Grade level: ${gradeLevel}
Topic: ${topic || 'Lesson topic'}
Difficulty: ${difficulty}
Question count: ${count}
Lesson content:
${contentSnippet}`
      );

      const normalized = normalizeContentQuiz(data, topic || 'Lesson', difficulty, count);
      if (!normalized.questions.length || !normalized.title) {
        throw new AppError('AI returned invalid content. Please try generating again.', 502);
      }

      return { ...normalized, source, warning: null };
    } catch (error) {
      console.error('AI content quiz generation failed:', error.message);
      rethrowProviderFailure(error);
    }
  },

  async generateGame({
    topic,
    gameType = 'auto',
    gradeLevel = "junior high school",
    lessonContent = '',
  }) {
    const requestedType = gameType === 'auto' ? 'auto' : (normalizeGameType(gameType) || gameType);
    if (requestedType !== 'auto' && !GAME_TYPES.includes(requestedType) && !normalizeGameType(requestedType)) {
      throw new AppError('Unsupported game type', 400);
    }

    const resolvedFallbackType = requestedType === 'auto' ? 'flashcards' : (normalizeGameType(requestedType) || 'flashcards');
    const contentSnippet = String(lessonContent || topic || '').slice(0, env.aiLimits.maxPromptCharacters);
    assertAiConfigured();

    try {
      const typeInstruction = requestedType === 'auto'
        ? 'Choose the single best gameType for this lesson from: flashcards, memory_match, crossword, word_search, quiz_show, jeopardy, drag_drop, spin_wheel, millionaire, escape_room, mission_adventure, puzzle_challenge.'
        : `Use gameType exactly: "${requestedType}".`;

      const { data, source } = await chatJson(
        `You are an educational game designer for junior high school students.
Analyze the lesson and generate one educational game.
${typeInstruction}
Keep game items at or below ${env.aiLimits.maxGameItems}.

Return ONLY valid JSON with this shape:
{
  "gameType": "memory_match",
  "title": "string",
  "description": "string",
  "difficulty": "Easy|Medium|Hard",
  "estimatedTime": 10,
  "xpReward": 150,
  "items": [{ "term": "string", "definition": "string" }],
  "gameData": {}
}

gameData requirements by gameType:
- flashcards / memory_match / drag_drop: items [{term, definition}] (at least 4)
- crossword: gameData.items [{clue, answer, direction, row, col}] (at least 4 short answers)
- word_search: gameData.words string[] and gameData.gridSize number (8-12); optional gameData.grid 2D letter array and placements
- quiz_show: gameData.items [{question, choices[4], correctIndex}] (at least 4)
- jeopardy: gameData.categories [{name, clues:[{points, clue, answer}]}] (1-3 categories)
- spin_wheel: gameData.items [{label, question, choices[4], correctIndex}] (at least 4)
- millionaire: gameData.items [{question, choices[4], correctIndex, difficulty}] (at least 5 ladder questions)
- escape_room: gameData.stages [{name, clue, answer, hint}] (at least 3 stages)
- mission_adventure: gameData.missions [{title, prompt, choices[3], correctIndex, xp}] (at least 3)
- puzzle_challenge: gameData.items [{prompt, answer, hint}] (at least 4 short answers)

Do not include markdown. Do not explain anything.`,
        `Grade level: ${gradeLevel}
Topic: ${topic || 'Lesson topic'}
Lesson content:
${contentSnippet}`
      );

      const normalized = normalizeGeneratedGame(data, resolvedFallbackType);
      if (!normalized.title || !normalized.gameData) {
        throw new AppError('AI returned invalid content. Please try generating again.', 502);
      }

      try {
        assertGameDataMatchesType(normalized.gameType, normalized.gameData, {
          asTypeMismatch: true,
        });
      } catch (error) {
        throw new AppError(
          error.message || 'AI generated content did not match the selected game type. Please regenerate.',
          400
        );
      }

      return { ...normalized, source, warning: null };
    } catch (error) {
      console.error('AI game generation failed:', error.message);
      rethrowProviderFailure(error);
    }
  },

  async summarizeLesson(content) {
    const provider = getActiveProvider();
    const safeContent = String(content || '').slice(0, env.aiLimits.maxPromptCharacters);
    if (!provider) {
      const words = safeContent.split(/\s+/).slice(0, 60).join(' ');
      return {
        summary: `${words}${safeContent.split(/\s+/).length > 60 ? '...' : ''}`,
        learningObjectives: [
          'Understand the main ideas of the lesson',
          'Apply key concepts through practice',
          'Recall important terms and definitions',
        ],
        source: 'fallback',
      };
    }

    try {
      const { data, source } = await chatJson(
        `Summarize lesson content for junior high school students.
Return JSON with keys: summary (string), learningObjectives (array of 3-5 strings).`,
        safeContent
      );
      if (!data?.summary || !Array.isArray(data.learningObjectives)) {
        throw new AppError('AI returned invalid content. Please try generating again.', 502);
      }
      return { ...data, source };
    } catch (error) {
      rethrowProviderFailure(error);
    }
  },

  async generateHint({ questionText, topic }) {
    const provider = getActiveProvider();
    if (!provider) {
      return {
        hint: `Think about the key idea behind "${topic || 'this topic'}" and eliminate clearly unrelated options.`,
        source: 'fallback',
      };
    }

    const { data, source } = await chatJson(
      'Provide a helpful hint without revealing the exact answer. Return JSON with key: hint.',
      `Question: ${questionText}\nTopic: ${topic || 'general'}`
    );

    return { hint: data.hint, source };
  },

  async rewriteText({ text, instruction }) {
    const provider = getActiveProvider();
    if (!provider) {
      return { text: String(text || '').trim(), source: 'fallback' };
    }

    const { data, source } = await chatJson(
      `You are an education editor for junior high school content. ${instruction}
Return JSON with key: text.`,
      String(text || '')
    );

    return { text: data.text || text, source };
  },
};

export default AiService;
