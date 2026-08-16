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
import AiGeneratedReviewPanel from '../../components/ai-review/AiGeneratedReviewPanel';
import courseService from '../../services/courseService';
import aiContentService from '../../services/aiContentService';
import aiReviewService from '../../services/aiReviewService';
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
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [loading, setLoading] = useState(false);

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
    setMessage('');
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
    setMessage('');
    setDraft(null);

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

      const response = await aiReviewService.createFromContent(payload);
      const data = response.data.data;
      if (data.source === 'fallback') {
        setDraft(null);
        setError(data.warning || 'AI generation failed. Please configure GEMINI_API_KEY and try again.');
        return;
      }
      setDraft(data.draft);
      setMessage(data.warning || 'Content generated. Review and edit below before publishing.');
    } catch (err) {
      setDraft(null);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const canGenerate = Boolean(form.courseId)
    && (sourceType === 'lesson'
      ? Boolean(form.lessonId)
      : Boolean(extractedText.trim().length >= 40));

  return (
    <>
      <PageHeader
        title="AI Content Generator"
        subtitle="Generate quizzes, games, objectives, or summaries — then review before publishing."
      />

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {message ? <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert> : null}

      <Paper sx={{ p: 3, mb: draft ? 3 : 0 }}>
        <Stack spacing={3}>
          <FormControl>
            <FormLabel>1. Content Source</FormLabel>
            <RadioGroup
              row
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
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
              onChange={(e) => setContentType(e.target.value)}
            >
              <FormControlLabel value="quiz" control={<Radio />} label="Generate Quiz" />
              <FormControlLabel value="game" control={<Radio />} label="Generate Educational Game" />
              <FormControlLabel value="objectives" control={<Radio />} label="Learning Objectives" />
              <FormControlLabel value="summary" control={<Radio />} label="Lesson Summary" />
              <FormControlLabel value="all" control={<Radio />} label="Generate All" />
            </RadioGroup>
          </FormControl>

          {contentType === 'quiz' || contentType === 'all' ? (
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
          ) : null}

          {contentType === 'game' || contentType === 'all' ? (
            <TextField
              select
              label="Game Selector"
              value={form.gameType}
              onChange={(e) => setForm((p) => ({ ...p, gameType: e.target.value }))}
            >
              {GAME_TYPE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </TextField>
          ) : null}

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

      {draft ? (
        <AiGeneratedReviewPanel
          key={draft.id}
          initialDraft={draft}
          mode="content"
          onCleared={() => {
            setDraft(null);
            setMessage('');
          }}
          onPublished={() => {
            setDraft(null);
            setMessage('Content published successfully.');
          }}
        />
      ) : null}
    </>
  );
}
