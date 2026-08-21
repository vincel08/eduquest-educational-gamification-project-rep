import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import GamePreview from '../games/GamePreview';
import ContentTimestamp from '../common/ContentTimestamp';
import ConfirmDialog from '../common/ConfirmDialog';
import QuizEditor from './QuizEditor';
import GameEditor from './GameEditor';
import { validateGameDataClient } from '../../utils/gameDataValidation';
import { formatGameTypeLabel } from '../../utils/gameTypes';
import { gameDataContentKey, quizContentKey } from '../../utils/gameDataLists';
import ObjectivesEditor from './ObjectivesEditor';
import SummaryEditor from './SummaryEditor';
import aiReviewService from '../../services/aiReviewService';
import { getErrorMessage } from '../../services/api';

function buildTabs(draft, mode) {
  const tabs = [];
  if (mode === 'quiz' || mode === 'content') {
    if (draft.quiz || mode === 'quiz') tabs.push({ key: 'quiz', label: 'Quiz' });
  }
  if (mode === 'game' || mode === 'content') {
    if (draft.game || mode === 'game') tabs.push({ key: 'game', label: 'Educational Game' });
  }
  if (mode === 'content' || draft.learningObjectives?.length) {
    tabs.push({ key: 'objectives', label: 'Learning Objectives' });
  }
  if (mode === 'content' || draft.lessonSummary) {
    tabs.push({ key: 'summary', label: 'Lesson Summary' });
  }
  if (!tabs.length) {
    if (draft.quiz) tabs.push({ key: 'quiz', label: 'Quiz' });
    if (draft.game) tabs.push({ key: 'game', label: 'Educational Game' });
    tabs.push({ key: 'objectives', label: 'Learning Objectives' });
    tabs.push({ key: 'summary', label: 'Lesson Summary' });
  }
  return tabs;
}

export default function AiGeneratedReviewPanel({
  initialDraft,
  mode = 'content',
  onCleared,
  onPublished,
}) {
  const [draft, setDraft] = useState(initialDraft);
  const [tab, setTab] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [gameReviewMode, setGameReviewMode] = useState('edit'); // edit | play
  const [gamePreviewKey, setGamePreviewKey] = useState(0);
  const [hasPlayedGamePreview, setHasPlayedGamePreview] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(0);
  const [selectedGameItem, setSelectedGameItem] = useState(0);
  const [aiAction, setAiAction] = useState('improve_writing');

  const draftId = draft?.id;
  const canEdit = draft?.status === 'draft';
  const tabs = useMemo(() => buildTabs(draft || {}, mode), [draft, mode]);
  const activeKey = tabs[tab]?.key || tabs[0]?.key;

  const quizPreviewQuestions = useMemo(() => {
    if (!draft?.quiz?.questions) return [];
    return draft.quiz.questions.map((q, index) => ({
      id: q.id || index,
      question_text: q.questionText,
      question_type: q.questionType,
      options: (q.options || []).map((opt) => ({
        id: opt.id,
        option_text: opt.optionText,
        is_correct: opt.isCorrect,
      })),
      textAnswer: q.textAnswer,
      explanation: q.explanation,
    }));
  }, [draft]);

  function patchDraft(partial) {
    setDraft((prev) => ({ ...prev, ...partial }));
    // Remount play/quiz preview so teacher edits are visible immediately.
    if (partial.game || partial.quiz) {
      setGamePreviewKey((prev) => prev + 1);
    }
  }

  async function runAction(actionFn, successMessage) {
    setBusy(true);
    setError('');
    try {
      const result = await actionFn();
      if (result?.data?.data?.draft) setDraft(result.data.data.draft);
      else if (result?.data?.data?.id) setDraft(result.data.data);
      else if (result?.data?.data) {
        const payload = result.data.data;
        setDraft(payload.draft || payload);
      }
      if (successMessage) setSnack(successMessage);
      return result;
    } catch (err) {
      setError(getErrorMessage(err));
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveDraft() {
    await runAction(
      () => aiReviewService.saveDraft(draftId, {
        title: draft.title,
        quiz: draft.quiz,
        game: draft.game,
        learningObjectives: draft.learningObjectives,
        lessonSummary: draft.lessonSummary,
      }),
      'Draft saved successfully.'
    );
  }

  function validateBeforePublish() {
    if (mode === 'game' && !draft.game) {
      return 'This draft has no educational game to publish. Regenerate the game first.';
    }
    if (draft.quiz) {
      if (!String(draft.quiz.title || '').trim()) return 'Quiz title is required before publishing.';
      if (!draft.quiz.questions?.length) return 'Quiz must contain at least one question.';
      const hasCorrect = draft.quiz.questions.some((q) => {
        if (q.questionType === 'identification') return Boolean(String(q.textAnswer || '').trim());
        return (q.options || []).some((o) => o.isCorrect);
      });
      if (!hasCorrect) return 'Quiz must include at least one correct answer.';
    }
    if (draft.game) {
      if (!String(draft.game.title || '').trim()) return 'Game title is required before publishing.';
      if (!String(draft.game.instructions || draft.game.description || '').trim()) {
        return 'Game instructions are required before publishing.';
      }
      const gameDataError = validateGameDataClient(draft.game.gameType, draft.game.gameData);
      if (gameDataError) return gameDataError;
    }
    if (!draft.quiz && !draft.game && !draft.lessonSummary && !draft.learningObjectives?.length) {
      return 'Nothing to publish in this draft.';
    }
    return '';
  }

  async function handlePublish() {
    const validationError = validateBeforePublish();
    if (validationError) {
      setError(validationError);
      return;
    }

    const result = await runAction(
      () => aiReviewService.publish(draftId, {
        title: draft.title,
        quiz: draft.quiz,
        game: draft.game,
        learningObjectives: draft.learningObjectives,
        lessonSummary: draft.lessonSummary,
      }),
      'Content published successfully.'
    );
    if (result) onPublished?.(result.data.data);
  }

  async function handleDiscard() {
    const result = await runAction(
      () => aiReviewService.discard(draftId),
      'Generated content discarded.'
    );
    if (result) onCleared?.();
  }

  async function handleRegenerate(target) {
    await runAction(
      () => aiReviewService.regenerate(draftId, {
        target,
        questionIndex: selectedQuestion,
        itemIndex: selectedGameItem,
        count: 3,
      }),
      'AI regeneration complete.'
    );
  }

  async function handleTransform() {
    const sectionMap = {
      quiz: 'quiz_description',
      game: 'game_instructions',
      objectives: 'objectives',
      summary: 'summary',
    };
    await runAction(
      () => aiReviewService.transform(draftId, {
        action: aiAction,
        section: sectionMap[activeKey] || 'summary',
        questionIndex: selectedQuestion,
      }),
      'AI writing update applied.'
    );
  }

  if (!draft) return null;

  return (
    <>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1}
          justifyContent="space-between"
          alignItems={{ md: 'center' }}
          sx={{ mb: 2 }}
        >
          <Box>
            <Typography variant="h6">Review & Edit Generated Content</Typography>
            <Typography variant="body2" color="text.secondary">
              Status: {draft.status}{draft.teacherEdited ? ' · Edited' : ' · AI Generated'}
            </Typography>
            <ContentTimestamp item={draft} dense sx={{ mt: 0.75 }} />
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {draft.game ? (
              <Button
                variant="contained"
                color="secondary"
                onClick={() => {
                  const gameTabIndex = tabs.findIndex((item) => item.key === 'game');
                  if (gameTabIndex >= 0) setTab(gameTabIndex);
                  setGameReviewMode('play');
                  setGamePreviewKey((prev) => prev + 1);
                  setHasPlayedGamePreview(true);
                }}
              >
                Play Game Preview
              </Button>
            ) : (
              <Button variant="outlined" onClick={() => setPreviewOpen(true)} disabled={!draft.quiz}>
                Preview Quiz
              </Button>
            )}
            <Button variant="outlined" disabled={!canEdit || busy} onClick={handleSaveDraft}>
              Save Draft
            </Button>
            <Button variant="contained" disabled={!canEdit || busy} onClick={() => setConfirm('publish')}>
              Publish
            </Button>
            <Button color="warning" disabled={!canEdit || busy} onClick={() => setConfirm('discard')}>
              Discard
            </Button>
            <Button color="inherit" onClick={() => onCleared?.()}>Cancel</Button>
          </Stack>
        </Stack>

        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

        <TextField
          label="Title"
          fullWidth
          disabled={!canEdit}
          value={draft.title || ''}
          onChange={(e) => patchDraft({ title: e.target.value })}
          sx={{ mb: 2 }}
        />

        {tabs.length > 1 ? (
          <>
            <Tabs
              value={Math.min(tab, tabs.length - 1)}
              onChange={(_e, value) => setTab(value)}
              variant="scrollable"
              allowScrollButtonsMobile
            >
              {tabs.map((item) => (
                <Tab key={item.key} label={item.label} />
              ))}
            </Tabs>
            <Divider sx={{ mb: 2 }} />
          </>
        ) : null}

        {activeKey === 'quiz' ? (
          <Stack spacing={2}>
            <Alert severity="info">
              Question edits appear in Preview Quiz immediately. Publish (or Save Draft then open the quiz editor) so students get the updated quiz.
            </Alert>
            <QuizEditor
              quiz={draft.quiz}
              onChange={(quiz) => canEdit && patchDraft({ quiz })}
              selectedIndex={selectedQuestion}
              onSelectIndex={setSelectedQuestion}
            />
          </Stack>
        ) : null}
        {activeKey === 'game' && draft.game ? (
          <Stack spacing={2}>
            <Alert severity="info">
              Edits in Edit Content are used immediately in Play as Student. Use Restart Preview to replay from the start.
            </Alert>
            <Tabs
              value={gameReviewMode === 'edit' ? 0 : 1}
              onChange={(_e, value) => {
                const nextMode = value === 0 ? 'edit' : 'play';
                setGameReviewMode(nextMode);
                if (nextMode === 'play') {
                  setGamePreviewKey((prev) => prev + 1);
                  setHasPlayedGamePreview(true);
                }
              }}
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab label="Edit Content" />
              <Tab label="Play as Student" />
            </Tabs>

            {gameReviewMode === 'edit' ? (
              <GameEditor
                game={draft.game}
                onChange={(game) => canEdit && patchDraft({ game })}
                selectedIndex={selectedGameItem}
                onSelectIndex={setSelectedGameItem}
              />
            ) : (
              <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ sm: 'center' }}
                  spacing={1}
                  sx={{ mb: 2 }}
                >
                  <Box>
                    <Typography variant="h6">{draft.game.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatGameTypeLabel(draft.game.gameType)}
                      {' · '}
                      {draft.game.instructions || draft.game.description}
                    </Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setGamePreviewKey((prev) => prev + 1);
                      setHasPlayedGamePreview(true);
                    }}
                  >
                    Restart Preview
                  </Button>
                </Stack>
                <GamePreview
                  key={`${gamePreviewKey}-${gameDataContentKey(draft.game?.gameData)}`}
                  gameType={draft.game.gameType}
                  gameData={draft.game.gameData}
                  xpReward={draft.game.xpReward}
                  onComplete={() => {
                    setHasPlayedGamePreview(true);
                    setSnack('Game preview completed. You can publish when ready.');
                  }}
                />
              </Paper>
            )}
          </Stack>
        ) : null}
        {activeKey === 'objectives' ? (
          <ObjectivesEditor
            objectives={draft.learningObjectives}
            onChange={(learningObjectives) => canEdit && patchDraft({ learningObjectives })}
          />
        ) : null}
        {activeKey === 'summary' ? (
          <SummaryEditor
            summary={draft.lessonSummary}
            onChange={(lessonSummary) => canEdit && patchDraft({ lessonSummary })}
          />
        ) : null}
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>AI Actions</Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} useFlexGap flexWrap="wrap">
          <Button disabled={!canEdit || busy} onClick={() => handleRegenerate('all')}>Regenerate All</Button>
          {draft.quiz ? (
            <>
              <Button disabled={!canEdit || busy} onClick={() => handleRegenerate('selected_question')}>
                Regenerate Selected Question
              </Button>
              <Button disabled={!canEdit || busy} onClick={() => handleRegenerate('more_questions')}>
                Generate More Questions
              </Button>
            </>
          ) : null}
          {draft.game ? (
            <>
              <Button disabled={!canEdit || busy} onClick={() => handleRegenerate('selected_game_item')}>
                Regenerate Selected Game Item
              </Button>
              <Button disabled={!canEdit || busy} onClick={() => handleRegenerate('more_game_items')}>
                Generate More Game Items
              </Button>
            </>
          ) : null}
          <TextField
            select
            size="small"
            label="Writing action"
            value={aiAction}
            onChange={(e) => setAiAction(e.target.value)}
            sx={{ minWidth: 220 }}
            disabled={!canEdit || busy}
          >
            <MenuItem value="improve_writing">Improve Writing</MenuItem>
            <MenuItem value="shorten">Shorten</MenuItem>
            <MenuItem value="expand">Expand</MenuItem>
            <MenuItem value="simplify">Simplify</MenuItem>
            <MenuItem value="make_more_challenging">Make More Challenging</MenuItem>
            <MenuItem value="make_easier">Make Easier</MenuItem>
          </TextField>
          <Button disabled={!canEdit || busy} variant="outlined" onClick={handleTransform}>
            Apply Writing Action
          </Button>
          {busy ? <CircularProgress size={28} /> : null}
        </Stack>
      </Paper>

      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Quiz Preview</DialogTitle>
        <DialogContent dividers key={`${gamePreviewKey}-${quizContentKey(draft.quiz)}`}>
          {draft.quiz ? (
            <Box>
              <Typography variant="h6" gutterBottom>{draft.quiz.title}</Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>{draft.quiz.description}</Typography>
              <Stack spacing={1.5}>
                {quizPreviewQuestions.map((question, index) => (
                  <Paper key={`${question.id}-${question.question_text}-${index}`} variant="outlined" sx={{ p: 2 }}>
                    <Typography fontWeight={700}>{index + 1}. {question.question_text}</Typography>
                    {(question.options || []).map((opt) => (
                      <Typography key={`${opt.id}-${opt.option_text}`} sx={{ ml: 1 }}>
                        {opt.is_correct ? '✓' : '•'} {opt.option_text}
                      </Typography>
                    ))}
                    {question.question_type === 'identification' ? (
                      <Typography sx={{ ml: 1 }}>Answer: {question.textAnswer}</Typography>
                    ) : null}
                  </Paper>
                ))}
              </Stack>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirm === 'publish'}
        title="Publish content?"
        description="Published content will become visible to students and may update the linked lesson."
        details={
          draft.game && !hasPlayedGamePreview
            ? 'Tip: open Play as Student first so you can review the real gameplay before publishing.'
            : undefined
        }
        cancelLabel="Keep editing"
        confirmLabel="Publish"
        loading={busy}
        loadingLabel="Publishing…"
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          setConfirm(null);
          await handlePublish();
        }}
      />

      <ConfirmDialog
        open={confirm === 'discard'}
        title="Discard generated content?"
        description="This will discard the generated content. This action cannot be undone."
        cancelLabel="Keep draft"
        confirmLabel="Discard"
        confirmColor="warning"
        loading={busy}
        loadingLabel="Discarding…"
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          setConfirm(null);
          await handleDiscard();
        }}
      />

      <Snackbar
        open={Boolean(snack)}
        autoHideDuration={3000}
        onClose={() => setSnack('')}
        message={snack}
      />
    </>
  );
}
