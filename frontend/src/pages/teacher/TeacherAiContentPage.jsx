import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  FormControlLabel,
  FormLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PageHeader from '../../components/common/PageHeader';
import GamePreview from '../../components/games/GamePreview';
import courseService from '../../services/courseService';
import aiContentService from '../../services/aiContentService';
import { getErrorMessage } from '../../services/api';

const GAME_TYPE_OPTIONS = [
  { value: 'auto', label: 'Auto Select Best Game' },
  { value: 'flashcards', label: 'Flashcards' },
  { value: 'memory_match', label: 'Memory Match' },
  { value: 'crossword', label: 'Crossword' },
  { value: 'word_search', label: 'Word Search' },
  { value: 'quiz_show', label: 'Quiz Show' },
  { value: 'jeopardy', label: 'Jeopardy' },
  { value: 'drag_drop', label: 'Drag & Drop' },
  { value: 'spin_wheel', label: 'Spin Wheel' },
  { value: 'millionaire', label: 'Who Wants To Be A Millionaire' },
  { value: 'escape_room', label: 'Escape Room' },
  { value: 'mission_adventure', label: 'Mission Adventure' },
  { value: 'puzzle_challenge', label: 'Puzzle Challenge' },
];

const ACCEPTED_TYPES = '.pdf,.docx,.pptx,.ppt,.txt,.png,.jpg,.jpeg,.webp';

function QuizResultPreview({ quiz }) {
  if (!quiz) return null;

  return (
    <Stack spacing={2}>
      {(quiz.questions || []).map((item, index) => (
        <Paper key={`q-${index}`} variant="outlined" sx={{ p: 2 }}>
          <Typography fontWeight={600}>
            {index + 1}. {item.question}
          </Typography>
          <Stack spacing={0.5} sx={{ mt: 1 }}>
            {(item.choices || []).map((choice) => {
              const isAnswer = String(choice).trim().toLowerCase()
                === String(item.answer || '').trim().toLowerCase();
              return (
                <Typography
                  key={choice}
                  color={isAnswer ? 'success.main' : 'text.secondary'}
                  fontWeight={isAnswer ? 600 : 400}
                >
                  {isAnswer ? '✓ ' : '• '}
                  {choice}
                </Typography>
              );
            })}
          </Stack>
          {item.explanation ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Explanation: {item.explanation}
            </Typography>
          ) : null}
        </Paper>
      ))}
    </Stack>
  );
}

export default function TeacherAiContentPage() {
  const fileInputRef = useRef(null);
  const [courses, setCourses] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [sourceType, setSourceType] = useState('lesson');
  const [contentType, setContentType] = useState('quiz');
  const [form, setForm] = useState({
    courseId: '',
    lessonId: '',
    gameType: 'auto',
    difficulty: 'medium',
    questionCount: 5,
  });
  const [uploadMeta, setUploadMeta] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [message, setMessage] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    courseService.list({ limit: 50 })
      .then((response) => {
        const list = response.data.data.courses || [];
        setCourses(list);
        if (list[0]) {
          setForm((prev) => ({ ...prev, courseId: String(list[0].id) }));
        }
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  useEffect(() => {
    if (!form.courseId) {
      setLessons([]);
      return;
    }

    courseService.lessons(form.courseId)
      .then((response) => {
        const list = response.data.data || [];
        setLessons(list);
        setForm((prev) => ({
          ...prev,
          lessonId: list[0] ? String(list[0].id) : '',
        }));
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, [form.courseId]);

  async function handleFile(file) {
    if (!file) return;
    setExtracting(true);
    setError('');
    setWarning('');
    setMessage('');
    setResult(null);
    try {
      const response = await aiContentService.extract(file);
      const data = response.data.data;
      setUploadMeta(data);
      setExtractedText(data.extractedText || '');
      setMessage(`Extracted text from ${data.originalFileName} (${data.characterCount} characters).`);
    } catch (err) {
      setUploadMeta(null);
      setExtractedText('');
      setError(getErrorMessage(err));
    } finally {
      setExtracting(false);
    }
  }

  function onBrowseChange(event) {
    const file = event.target.files?.[0];
    handleFile(file);
    event.target.value = '';
  }

  function onDrop(event) {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    handleFile(file);
  }

  async function handleGenerate() {
    setLoading(true);
    setError('');
    setWarning('');
    setMessage('');
    setResult(null);

    try {
      const payload = {
        courseId: Number(form.courseId),
        sourceType,
        contentType,
        difficulty: form.difficulty,
        questionCount: Number(form.questionCount),
        gameType: form.gameType,
      };

      if (sourceType === 'lesson') {
        payload.lessonId = Number(form.lessonId);
      } else {
        payload.extractedText = extractedText;
        payload.originalFileName = uploadMeta?.originalFileName || null;
        payload.uploadedFilePath = uploadMeta?.uploadedFilePath || null;
        if (form.lessonId) payload.lessonId = Number(form.lessonId);
      }

      const response = await aiContentService.generate(payload);
      const data = response.data.data;
      setResult(data);
      if (data.warning || data.source === 'fallback') {
        setWarning(data.warning || 'Sample fallback content was used.');
      } else {
        setMessage('Content generated. Review the preview, then save.');
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!result?.generationId) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await aiContentService.save({
        generationId: result.generationId,
        generated: result.generated,
        isPublished: true,
      });
      const data = response.data.data;
      const title = data.quiz?.title || data.game?.title || 'Content';
      setMessage(`Saved "${title}" to the course library.`);
      setResult((prev) => ({ ...prev, saved: true }));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const canGenerate = Boolean(form.courseId)
    && (sourceType === 'lesson'
      ? Boolean(form.lessonId)
      : Boolean(extractedText.trim().length >= 40));

  const generated = result?.generated;

  return (
    <>
      <PageHeader
        title="AI Content Generator"
        subtitle="Generate quizzes or educational games from lessons or uploaded learning materials."
      />

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {warning ? <Alert severity="warning" sx={{ mb: 2 }}>{warning}</Alert> : null}
      {message ? <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert> : null}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack spacing={3}>
          <FormControl>
            <FormLabel>1. Content Source</FormLabel>
            <RadioGroup
              row
              value={sourceType}
              onChange={(e) => {
                setSourceType(e.target.value);
                setResult(null);
              }}
            >
              <FormControlLabel value="lesson" control={<Radio />} label="Existing Lesson" />
              <FormControlLabel value="upload" control={<Radio />} label="Upload Document" />
            </RadioGroup>
          </FormControl>

          <TextField
            select
            label="Course"
            value={form.courseId}
            onChange={(e) => setForm((p) => ({ ...p, courseId: e.target.value, lessonId: '' }))}
          >
            {courses.map((course) => (
              <MenuItem key={course.id} value={String(course.id)}>{course.title}</MenuItem>
            ))}
          </TextField>

          {sourceType === 'lesson' ? (
            <TextField
              select
              label="Lesson"
              value={form.lessonId}
              onChange={(e) => setForm((p) => ({ ...p, lessonId: e.target.value }))}
              helperText={!lessons.length ? 'Create a lesson in this course first' : ' '}
            >
              {lessons.map((lesson) => (
                <MenuItem key={lesson.id} value={String(lesson.id)}>{lesson.title}</MenuItem>
              ))}
            </TextField>
          ) : (
            <Stack spacing={2}>
              <Typography variant="subtitle2">2. Upload Area</Typography>
              <Box
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                sx={{
                  border: '2px dashed',
                  borderColor: dragOver ? 'primary.main' : 'divider',
                  borderRadius: 2,
                  p: 4,
                  textAlign: 'center',
                  bgcolor: dragOver ? 'action.hover' : 'background.default',
                  cursor: 'pointer',
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <CloudUploadIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                <Typography fontWeight={600}>
                  {extracting ? 'Extracting text...' : 'Drag and drop a document here'}
                </Typography>
                <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
                  PDF, DOCX, PPTX, PPT, or TXT · or click to browse
                </Typography>
                <Button
                  sx={{ mt: 2 }}
                  variant="outlined"
                  disabled={extracting}
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  Browse Files
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  accept={ACCEPTED_TYPES}
                  onChange={onBrowseChange}
                />
              </Box>

              {uploadMeta ? (
                <Chip
                  label={`${uploadMeta.originalFileName} · ${uploadMeta.characterCount} chars`}
                  color="primary"
                  variant="outlined"
                  sx={{ alignSelf: 'flex-start' }}
                />
              ) : null}

              <Typography variant="subtitle2">3. Preview Extracted Text</Typography>
              <TextField
                label="Extracted text (editable)"
                value={extractedText}
                onChange={(e) => setExtractedText(e.target.value)}
                multiline
                minRows={8}
                maxRows={16}
                helperText="Edit the text before generating if needed."
              />

              {lessons.length ? (
                <TextField
                  select
                  label="Optional: Link to Lesson"
                  value={form.lessonId}
                  onChange={(e) => setForm((p) => ({ ...p, lessonId: e.target.value }))}
                >
                  <MenuItem value="">None</MenuItem>
                  {lessons.map((lesson) => (
                    <MenuItem key={lesson.id} value={String(lesson.id)}>{lesson.title}</MenuItem>
                  ))}
                </TextField>
              ) : null}
            </Stack>
          )}

          <FormControl>
            <FormLabel>4. Generate Options</FormLabel>
            <RadioGroup
              row
              value={contentType}
              onChange={(e) => {
                setContentType(e.target.value);
                setResult(null);
              }}
            >
              <FormControlLabel value="quiz" control={<Radio />} label="Generate Quiz" />
              <FormControlLabel value="game" control={<Radio />} label="Generate Educational Game" />
            </RadioGroup>
          </FormControl>

          {contentType === 'quiz' ? (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select
                label="Difficulty"
                value={form.difficulty}
                onChange={(e) => setForm((p) => ({ ...p, difficulty: e.target.value }))}
                sx={{ minWidth: 160 }}
              >
                <MenuItem value="easy">Easy</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="hard">Hard</MenuItem>
              </TextField>
              <TextField
                label="Question Count"
                type="number"
                value={form.questionCount}
                onChange={(e) => setForm((p) => ({ ...p, questionCount: e.target.value }))}
                inputProps={{ min: 3, max: 15 }}
                sx={{ minWidth: 160 }}
              />
            </Stack>
          ) : (
            <TextField
              select
              label="5. Game Selector"
              value={form.gameType}
              onChange={(e) => setForm((p) => ({ ...p, gameType: e.target.value }))}
            >
              {GAME_TYPE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </TextField>
          )}

          <Button
            variant="contained"
            size="large"
            disabled={!canGenerate || loading || extracting}
            onClick={handleGenerate}
          >
            {loading ? 'Generating...' : 'Generate'}
          </Button>
        </Stack>
      </Paper>

      {result && generated ? (
        <Paper sx={{ p: 3 }}>
          <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
            <Chip label={result.contentType} color="primary" />
            {generated.difficulty ? <Chip label={generated.difficulty} /> : null}
            {result.contentType === 'Quiz' ? (
              <>
                <Chip label={`${generated.timeLimit || 15} min`} />
                <Chip label={`Pass ${generated.passingScore || 70}%`} />
              </>
            ) : (
              <>
                <Chip label={generated.gameType} />
                <Chip label={`${generated.estimatedTime || 10} min`} />
                <Chip label={`${generated.xpReward || 100} XP`} color="secondary" />
              </>
            )}
          </Stack>

          <Typography variant="h6">{generated.title}</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {generated.description}
          </Typography>

          <Typography variant="subtitle2" sx={{ mb: 1 }}>8. AI Result Preview</Typography>

          {result.contentType === 'Quiz' ? (
            <QuizResultPreview quiz={generated} />
          ) : (
            <GamePreview
              gameType={generated.gameType}
              gameData={generated.gameData || { items: generated.items || [] }}
              onComplete={(score) => setMessage(`Preview finished with score ${score}.`)}
            />
          )}

          <Stack direction="row" spacing={1} sx={{ mt: 3 }}>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving || result.saved}
            >
              {result.saved ? 'Saved' : (saving ? 'Saving...' : 'Save')}
            </Button>
          </Stack>
        </Paper>
      ) : null}
    </>
  );
}
