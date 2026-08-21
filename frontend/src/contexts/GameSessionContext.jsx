import { createContext, useCallback, useContext, useEffect, useRef } from 'react';

const GameSessionContext = createContext({
  registerSubmit: () => () => {},
  timedOut: false,
  elapsedSeconds: 0,
});

export function GameSessionProvider({ children, registerSubmit, timedOut = false, elapsedSeconds = 0 }) {
  const value = {
    registerSubmit,
    timedOut,
    elapsedSeconds,
  };
  return (
    <GameSessionContext.Provider value={value}>
      {children}
    </GameSessionContext.Provider>
  );
}

export function useGameSession() {
  return useContext(GameSessionContext);
}

/**
 * Register the current game's finish payload builder for session timeout auto-submit.
 * @param {() => ({ score: number, answers?: object }|null|undefined)} buildResult
 */
export function useRegisterTimeoutSubmit(buildResult) {
  const { registerSubmit, timedOut, elapsedSeconds } = useGameSession();
  const buildRef = useRef(buildResult);
  buildRef.current = buildResult;

  useEffect(() => {
    if (!registerSubmit) return undefined;
    return registerSubmit(() => {
      const result = buildRef.current?.() || { score: 0, answers: { timedOut: true } };
      return {
        ...result,
        durationSeconds: elapsedSeconds || result.durationSeconds,
        answers: {
          ...(result.answers || {}),
          timedOut: true,
        },
      };
    });
  }, [registerSubmit, elapsedSeconds]);

  return { timedOut, elapsedSeconds };
}
