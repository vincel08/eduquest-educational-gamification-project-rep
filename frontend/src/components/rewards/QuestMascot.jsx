import { useEffect, useRef, useState } from 'react';
import { Box, IconButton, Paper, Typography } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CloseIcon from '@mui/icons-material/Close';
import { pickMascotMessage } from '../../utils/feedbackMessages';
import { useAuth } from '../../contexts/AuthContext';

const HIDE_KEY = 'eduwow_mascot_hidden';
const MESSAGE_MS = 2000;

export default function QuestMascot() {
  const { profile, user } = useAuth();
  const [message, setMessage] = useState('');
  const [textVisible, setTextVisible] = useState(true);
  const [bubbleOpen, setBubbleOpen] = useState(true);
  const [visible, setVisible] = useState(() => {
    try {
      return sessionStorage.getItem(HIDE_KEY) !== '1';
    } catch {
      return true;
    }
  });

  const profileRef = useRef(profile);
  const messageRef = useRef('');
  const fadeTimerRef = useRef(null);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    if (user?.role !== 'student' || !visible || !bubbleOpen) return undefined;

    const showNext = () => {
      const next = pickMascotMessage({
        streak: profileRef.current?.current_streak,
        previousMessage: messageRef.current,
      });

      // Soft text fade only — bubble stays mounted to avoid layout stutter.
      setTextVisible(false);
      window.clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = window.setTimeout(() => {
        messageRef.current = next;
        setMessage(next);
        setTextVisible(true);
      }, 160);
    };

    showNext();
    const rotate = window.setInterval(showNext, MESSAGE_MS);

    return () => {
      window.clearInterval(rotate);
      window.clearTimeout(fadeTimerRef.current);
    };
  }, [user?.role, visible, bubbleOpen]);

  function hideMascot() {
    setVisible(false);
    try {
      sessionStorage.setItem(HIDE_KEY, '1');
    } catch {
      // ignore
    }
  }

  if (user?.role !== 'student' || !visible) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        right: { xs: 12, md: 20 },
        bottom: { xs: 16, md: 24 },
        zIndex: 1100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 1.25,
        width: 'max-content',
        maxWidth: { xs: 'calc(100vw - 24px)', sm: 300 },
        pointerEvents: 'none',
        overflow: 'visible',
      }}
      aria-label="Learning coach mascot"
    >
      {bubbleOpen && message ? (
        <Paper
          elevation={0}
          sx={{
            position: 'relative',
            px: 2,
            py: 1.5,
            pr: 5,
            borderRadius: 3,
            border: '1px solid rgba(59,130,246,0.2)',
            bgcolor: 'background.paper',
            boxShadow: '0 12px 28px rgba(59,130,246,0.18)',
            pointerEvents: 'auto',
            overflow: 'visible',
            width: 'max-content',
            maxWidth: '100%',
          }}
        >
          <IconButton
            size="small"
            aria-label="Hide tip"
            onClick={() => setBubbleOpen(false)}
            sx={{
              position: 'absolute',
              top: 6,
              right: 6,
              p: 0.5,
            }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
          <Typography
            variant="body2"
            fontWeight={800}
            sx={{
              opacity: textVisible ? 1 : 0,
              transition: 'opacity 0.16s ease',
              whiteSpace: 'nowrap',
              lineHeight: 1.4,
              '@media (max-width: 380px)': {
                whiteSpace: 'normal',
              },
            }}
          >
            {message}
          </Typography>
        </Paper>
      ) : null}

      {/* Extra padding box so float animation + shadow are never clipped */}
      <Box
        sx={{
          p: '6px',
          mr: '-6px',
          mb: '-6px',
          overflow: 'visible',
          pointerEvents: 'none',
        }}
      >
        <Box
          component="button"
          type="button"
          className="eq-float"
          aria-label={bubbleOpen ? 'Hide learning coach tips' : 'Show learning coach tips'}
          onClick={() => setBubbleOpen((open) => !open)}
          onContextMenu={(event) => {
            event.preventDefault();
            hideMascot();
          }}
          title="Click for tips · Right-click to hide mascot"
          sx={{
            width: 56,
            height: 56,
            border: 0,
            borderRadius: '16px',
            display: 'grid',
            placeItems: 'center',
            pointerEvents: 'auto',
            cursor: 'pointer',
            background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
            color: '#fff',
            boxShadow: '0 12px 28px rgba(59,130,246,0.32)',
            flexShrink: 0,
          }}
        >
          <SmartToyIcon sx={{ fontSize: 28 }} />
        </Box>
      </Box>
    </Box>
  );
}
