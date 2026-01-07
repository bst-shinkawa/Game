"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
}

export default function ErrorBoundary({ children }: Props) {
  const [error, setError] = React.useState<Error | null>(null);
  const [errorInfo, setErrorInfo] = React.useState<any>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const prevOnError = window.onerror;
    const prevOnUnhandled = (window as any).onunhandledrejection;

    window.onerror = function (message, source, lineno, colno, err) {
      try {
        const stack = (err && (err as Error).stack) || null;
        setError(err as Error || new Error(String(message)));
        setErrorInfo({ source, lineno, colno, stack });
        (window as any).__GAME_DRAG_DEBUG__ = true;
        console.error('[ErrorBoundary] window.onerror', message, source, lineno, colno, err);
      } catch (e) {
        console.error('ErrorBoundary onerror handler fail', e);
      }
      if (prevOnError) return prevOnError(message, source, lineno, colno, err);
      return false;
    };

    (window as any).onunhandledrejection = function (ev: any) {
      try {
        const reason = ev?.reason;
        setError(new Error(String(reason || 'unhandledrejection')));
        setErrorInfo({ reason: String(reason), stack: reason?.stack || null });
        (window as any).__GAME_DRAG_DEBUG__ = true;
        console.error('[ErrorBoundary] onunhandledrejection', ev);
      } catch (e) {
        console.error('ErrorBoundary onunhandledrejection handler fail', e);
      }
      if (prevOnUnhandled) return prevOnUnhandled(ev);
      return false;
    };

    return () => {
      window.onerror = prevOnError;
      (window as any).onunhandledrejection = prevOnUnhandled;
    };
  }, []);

  if (error) {
    return (
      <div style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, zIndex: 999999, background: 'rgba(0,0,0,0.95)', color: '#fff', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2>Application Error</h2>
        <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 12 }}>
          {String(error?.message)}
          {errorInfo ? '\n\n' + JSON.stringify(errorInfo, null, 2) : null}
        </div>
        <div>
          <button onClick={() => { window.location.reload(); }}>Reload</button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
