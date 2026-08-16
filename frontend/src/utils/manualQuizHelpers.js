function newId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

export function blankQuestion(questionType = 'multiple_choice') {
  const base = {
    clientId: newId('q'),
    questionText: '',
    questionType,
    points: 1,
    difficulty: 'medium',
    explanation: '',
    imageFile: null,
    imagePreviewUrl: null,
    imageUrl: null,
  };

  if (questionType === 'true_false') {
    return {
      ...base,
      options: [
        { clientId: newId('opt'), optionText: 'True', isCorrect: true },
        { clientId: newId('opt'), optionText: 'False', isCorrect: false },
      ],
      pairs: [],
      textAnswer: '',
      acceptedAnswers: '',
    };
  }

  if (questionType === 'identification') {
    return {
      ...base,
      options: [],
      pairs: [],
      textAnswer: '',
      acceptedAnswers: '',
    };
  }

  if (questionType === 'matching') {
    return {
      ...base,
      options: [],
      pairs: [
        { clientId: newId('pair'), left: '', right: '' },
        { clientId: newId('pair'), left: '', right: '' },
      ],
      textAnswer: '',
      acceptedAnswers: '',
    };
  }

  return {
    ...base,
    options: [
      { clientId: newId('opt'), optionText: '', isCorrect: true },
      { clientId: newId('opt'), optionText: '', isCorrect: false },
      { clientId: newId('opt'), optionText: '', isCorrect: false },
      { clientId: newId('opt'), optionText: '', isCorrect: false },
    ],
    pairs: [],
    textAnswer: '',
    acceptedAnswers: '',
  };
}

export function mapApiQuestionToEditor(question) {
  const type = question.question_type || question.questionType || 'multiple_choice';
  const options = (question.options || []).map((option) => ({
    clientId: newId('opt'),
    id: option.id,
    optionText: option.option_text || option.optionText || '',
    isCorrect: Boolean(option.is_correct ?? option.isCorrect),
    matchKey: option.match_key || option.matchKey || null,
    side: option.side || 'none',
  }));

  let pairs = [];
  let textAnswer = '';
  let acceptedAnswers = '';

  if (type === 'identification') {
    const answers = options
      .filter((option) => option.isCorrect || options.length === 1)
      .map((option) => option.optionText)
      .filter(Boolean);
    textAnswer = answers[0] || '';
    acceptedAnswers = answers.slice(1).join(', ');
  }

  if (type === 'matching') {
    const left = options.filter((option) => option.side === 'left');
    const right = options.filter((option) => option.side === 'right');
    pairs = left.map((leftOption) => {
      const match = right.find((rightOption) => rightOption.matchKey === leftOption.matchKey);
      return {
        clientId: newId('pair'),
        left: leftOption.optionText,
        right: match?.optionText || '',
        matchKey: leftOption.matchKey,
      };
    });
    if (!pairs.length) {
      pairs = [
        { clientId: newId('pair'), left: '', right: '' },
        { clientId: newId('pair'), left: '', right: '' },
      ];
    }
  }

  return {
    clientId: newId('q'),
    id: question.id,
    questionText: question.question_text || question.questionText || '',
    questionType: type,
    points: question.points || 1,
    difficulty: question.difficulty || 'medium',
    explanation: question.explanation || '',
    options: type === 'identification' || type === 'matching'
      ? options
      : (options.length
        ? options
        : blankQuestion(type).options),
    pairs,
    textAnswer,
    acceptedAnswers,
    imageFile: null,
    imagePreviewUrl: question.image_url || question.imageUrl || null,
    imageUrl: question.image_url || question.imageUrl || null,
  };
}

export function editorQuestionToPayload(question) {
  const type = question.questionType || 'multiple_choice';
  const payload = {
    questionText: String(question.questionText || '').trim(),
    questionType: type,
    points: Number(question.points) > 0 ? Number(question.points) : 1,
    explanation: question.explanation || null,
  };

  if (question.id) {
    payload.id = question.id;
  }

  if (question.imageUrl && !String(question.imageUrl).startsWith('/api/')) {
    payload.imageUrl = question.imageUrl;
  }

  if (type === 'identification') {
    const answers = [
      question.textAnswer,
      ...(String(question.acceptedAnswers || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)),
    ]
      .map((item) => String(item || '').trim())
      .filter(Boolean);
    payload.acceptedAnswers = answers;
    return payload;
  }

  if (type === 'matching') {
    payload.pairs = (question.pairs || []).map((pair, index) => ({
      left: String(pair.left || '').trim(),
      right: String(pair.right || '').trim(),
      matchKey: pair.matchKey || `p${index + 1}`,
    }));
    return payload;
  }

  payload.options = (question.options || []).map((option) => ({
    optionText: String(option.optionText || '').trim(),
    isCorrect: Boolean(option.isCorrect),
  }));

  return payload;
}

export function validateEditorQuiz(form, questions) {
  const errors = [];

  if (!String(form.title || '').trim()) errors.push('Quiz title is required.');
  if (!form.courseId) errors.push('Subject is required.');
  if (!questions.length) errors.push('Add at least one question.');

  questions.forEach((question, index) => {
    const label = `Question ${index + 1}`;
    if (!String(question.questionText || '').trim()) {
      errors.push(`${label}: question text is required.`);
    }

    if (question.questionType === 'identification') {
      if (!String(question.textAnswer || '').trim()) {
        errors.push(`${label}: correct answer is required.`);
      }
      return;
    }

    if (question.questionType === 'matching') {
      const pairs = question.pairs || [];
      if (pairs.length < 2) {
        errors.push(`${label}: add at least two matching pairs.`);
      }
      pairs.forEach((pair, pairIndex) => {
        if (!String(pair.left || '').trim() || !String(pair.right || '').trim()) {
          errors.push(`${label}: pair ${pairIndex + 1} cannot be empty.`);
        }
      });
      return;
    }

    const options = question.options || [];
    if (options.length < 2) {
      errors.push(`${label}: at least two options are required.`);
    }
    if (options.some((option) => !String(option.optionText || '').trim())) {
      errors.push(`${label}: options cannot be empty.`);
    }
    const correctCount = options.filter((option) => option.isCorrect).length;
    if (correctCount !== 1) {
      errors.push(`${label}: mark exactly one correct answer.`);
    }
    if (question.questionType === 'image_question' && !question.imageFile && !question.imagePreviewUrl) {
      errors.push(`${label}: upload an image for image questions.`);
    }
  });

  return errors;
}

export { newId };
