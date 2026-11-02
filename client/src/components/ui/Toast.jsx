import { useEffect, useRef, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  const [exiting, setExiting] = useState(false);
  const [activeToast, setActiveToast] = useState(toast);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const remainingTimeRef = useRef(0);
  const durationRef = useRef(3000);
  const animationFrameRef = useRef(null);
  const exitTimeoutRef = useRef(null);

  // When a new toast arrives
  useEffect(() => {
    if (toast) {
      setActiveToast(toast);
      setExiting(false);
      setIsPaused(false);
      const duration =
        toast.kind === 'error'
          ? 4500
          : toast.kind === 'warning'
          ? 4000
          : toast.kind === 'info'
          ? 3500
          : 3000;
      durationRef.current = duration;
      remainingTimeRef.current = duration;
      setProgress(100);
    } else {
      setActiveToast(null);
    }
  }, [toast?.timestamp, toast?.message, toast?.kind]);

  const triggerClose = useCallback(() => {
    setExiting(true);
    if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
    exitTimeoutRef.current = setTimeout(() => {
      onClose?.();
      setActiveToast(null);
      setExiting(false);
    }, 240);
  }, [onClose]);

  useEffect(() => {
    if (!activeToast || exiting) return;

    let lastTick = performance.now();

    const tick = (now) => {
      const delta = now - lastTick;
      lastTick = now;

      if (!isPaused) {
        remainingTimeRef.current = Math.max(0, remainingTimeRef.current - delta);
        setProgress((remainingTimeRef.current / durationRef.current) * 100);

        if (remainingTimeRef.current <= 0) {
          triggerClose();
          return;
        }
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [activeToast, exiting, isPaused, triggerClose]);

  useEffect(() => {
    return () => {
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  if (!activeToast) return null;

  const kind = activeToast.kind || 'success';

  const iconMap = {
    success: <CheckCircle2 size={18} className="text-sage flex-none" />,
    error: <AlertCircle size={18} className="text-terracotta flex-none" />,
    warning: <AlertTriangle size={18} className="text-mustard flex-none" />,
    info: <Info size={18} className="text-muted flex-none" />,
  };

  return (
    <aside
      role={kind === 'error' || kind === 'warning' ? 'alert' : 'status'}
      aria-live={kind === 'error' ? 'assertive' : 'polite'}
      className={`toast toast-${kind} ${exiting ? 'toast-exiting' : 'toast-entering'}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <span className="toast-icon-wrap" aria-hidden="true">
        {iconMap[kind] || iconMap.success}
      </span>
      <span className="flex-1 text-sm font-medium leading-snug">{activeToast.message}</span>
      <button
        type="button"
        aria-label="Dismiss notification"
        className="icon-button toast-close-btn"
        onClick={triggerClose}
      >
        <X size={15} />
      </button>
      <div className="toast-progress-bar" aria-hidden="true">
        <div
          className={`toast-progress-fill toast-progress-${kind}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </aside>
  );
}
