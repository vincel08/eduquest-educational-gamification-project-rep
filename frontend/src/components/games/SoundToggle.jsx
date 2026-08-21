import { useEffect, useState } from 'react';
import { IconButton, Stack, Tooltip } from '@mui/material';
import VolumeUpRoundedIcon from '@mui/icons-material/VolumeUpRounded';
import VolumeOffRoundedIcon from '@mui/icons-material/VolumeOffRounded';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';
import MusicOffRoundedIcon from '@mui/icons-material/MusicOffRounded';
import {
  getMusicEnabled,
  getSoundsEnabled,
  playSound,
  setMusicEnabled,
  setSoundsEnabled,
  SOUND_KEYS,
  syncAmbientForGame,
  unlockAudio,
} from '../../utils/soundEffects';

/**
 * Mute controls for game SFX and optional ambient music.
 */
export default function SoundToggle({ gameType = null, size = 'small' }) {
  const [sfxOn, setSfxOn] = useState(() => getSoundsEnabled());
  const [musicOn, setMusicOn] = useState(() => getMusicEnabled());

  useEffect(() => {
    if (sfxOn && musicOn && gameType) {
      syncAmbientForGame(gameType);
    }
  }, [sfxOn, musicOn, gameType]);

  function toggleSfx() {
    unlockAudio();
    const next = !sfxOn;
    setSoundsEnabled(next);
    setSfxOn(next);
    if (next) playSound(SOUND_KEYS.click);
    if (next && musicOn && gameType) syncAmbientForGame(gameType);
  }

  function toggleMusic() {
    unlockAudio();
    const next = !musicOn;
    setMusicEnabled(next);
    setMusicOn(next);
    if (next && sfxOn) {
      playSound(SOUND_KEYS.click);
      if (gameType) syncAmbientForGame(gameType);
    }
  }

  return (
    <Stack direction="row" spacing={0.25} alignItems="center">
      <Tooltip title={sfxOn ? 'Mute sound effects' : 'Enable sound effects'}>
        <IconButton size={size} onClick={toggleSfx} aria-label="Toggle sound effects" color={sfxOn ? 'primary' : 'default'}>
          {sfxOn ? <VolumeUpRoundedIcon fontSize="small" /> : <VolumeOffRoundedIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
      <Tooltip title={musicOn ? 'Mute music' : 'Enable ambient music'}>
        <IconButton
          size={size}
          onClick={toggleMusic}
          aria-label="Toggle ambient music"
          color={musicOn && sfxOn ? 'primary' : 'default'}
          disabled={!sfxOn}
        >
          {musicOn && sfxOn ? <MusicNoteRoundedIcon fontSize="small" /> : <MusicOffRoundedIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
    </Stack>
  );
}
