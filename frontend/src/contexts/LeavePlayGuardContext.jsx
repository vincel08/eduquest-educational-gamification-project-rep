import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import LeavePlayDialog from '../components/common/LeavePlayDialog';

const LeavePlayGuardContext = createContext({
  setGuard: () => {},
  guardedNavigate: () => {},
  isGuarding: false,
});

export function LeavePlayGuardProvider({ children }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const guardRef = useRef(null);
  const pendingNavRef = useRef(null);
  const [isGuarding, setIsGuarding] = useState(false);
  const [activityLabel, setActivityLabel] = useState('this activity');
  const [pendingNav, setPendingNav] = useState(null);
  const [leaving, setLeaving] = useState(false);

  const setPending = useCallback((next) => {
    pendingNavRef.current = next;
    setPendingNav(next);
  }, []);

  const setGuard = useCallback((config) => {
    if (!config || !config.when) {
      guardRef.current = null;
      setIsGuarding(false);
      setActivityLabel('this activity');
      return;
    }
    guardRef.current = {
      onAbandon: config.onAbandon,
      activityLabel: config.activityLabel || 'this activity',
      exitPath: config.exitPath || null,
    };
    setIsGuarding(true);
    setActivityLabel(config.activityLabel || 'this activity');
  }, []);

  const guardedNavigate = useCallback(
    (to, options) => {
      if (guardRef.current) {
        setPending({ to, options });
        return;
      }
      navigate(to, options);
    },
    [navigate, setPending],
  );

  const stay = useCallback(() => {
    if (leaving) return;
    setPending(null);
  }, [leaving, setPending]);

  const confirmLeave = useCallback(async () => {
    if (leaving) return;
    setLeaving(true);
    const dest = pendingNavRef.current;
    const abandon = guardRef.current?.onAbandon;
    const exitPath = guardRef.current?.exitPath;
    try {
      if (typeof abandon === 'function') {
        await abandon();
      }
      guardRef.current = null;
      setIsGuarding(false);
      setPending(null);

      const shouldLogout = Boolean(dest?.options?.state?.performLogout);
      if (shouldLogout) {
        logout();
      }

      if (dest?.isHistoryBack) {
        navigate(exitPath || dest.to || '/student/dashboard', { replace: true });
      } else if (dest?.to != null) {
        const nextOptions = { ...(dest.options || {}) };
        if (nextOptions.state?.performLogout) {
          const { performLogout, ...restState } = nextOptions.state;
          nextOptions.state = Object.keys(restState).length ? restState : undefined;
        }
        navigate(dest.to, nextOptions);
      }
    } catch {
      // Keep the student on the play page if abandon/submit failed.
      setPending(null);
    } finally {
      setLeaving(false);
    }
  }, [leaving, navigate, logout, setPending]);

  useEffect(() => {
    if (!isGuarding) return undefined;

    function onBeforeUnload(event) {
      event.preventDefault();
      event.returnValue = '';
      return '';
    }

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isGuarding]);

  useEffect(() => {
    if (!isGuarding) return undefined;

    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.history.pushState({ leavePlayGuard: 1 }, '', current);

    function onPopState() {
      const stillCurrent = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      window.history.pushState({ leavePlayGuard: 1 }, '', stillCurrent || current);
      setPending({
        to: guardRef.current?.exitPath || '/student/dashboard',
        isHistoryBack: true,
      });
    }

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, [isGuarding, setPending]);

  useEffect(() => {
    if (!isGuarding) return undefined;

    function onDocumentClick(event) {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = event.target?.closest?.('a[href]');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return;
      }

      let url;
      try {
        url = new URL(href, window.location.origin);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) return;
      if (anchor.target && anchor.target !== '_self') return;

      const nextPath = `${url.pathname}${url.search}${url.hash}`;
      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (nextPath === currentPath) return;

      event.preventDefault();
      event.stopPropagation();
      setPending({ to: nextPath });
    }

    document.addEventListener('click', onDocumentClick, true);
    return () => document.removeEventListener('click', onDocumentClick, true);
  }, [isGuarding, setPending]);

  const value = {
    setGuard,
    guardedNavigate,
    isGuarding,
  };

  return (
    <LeavePlayGuardContext.Provider value={value}>
      {children}
      <LeavePlayDialog
        open={Boolean(pendingNav)}
        activityLabel={activityLabel}
        leaving={leaving}
        onStay={stay}
        onLeave={confirmLeave}
      />
    </LeavePlayGuardContext.Provider>
  );
}

export function useLeavePlayGuardContext() {
  return useContext(LeavePlayGuardContext);
}

/**
 * Register an active quiz/game session so navigation prompts before leaving.
 */
export function useRegisterLeavePlayGuard(
  when,
  {
    onAbandon,
    activityLabel = 'this activity',
    exitPath = '/student/dashboard',
  } = {},
) {
  const { setGuard } = useLeavePlayGuardContext();
  const onAbandonRef = useRef(onAbandon);
  onAbandonRef.current = onAbandon;

  useEffect(() => {
    if (!when) {
      setGuard(null);
      return undefined;
    }
    setGuard({
      when: true,
      activityLabel,
      exitPath,
      onAbandon: () => onAbandonRef.current?.(),
    });
    return () => setGuard(null);
  }, [when, activityLabel, exitPath, setGuard]);
}
