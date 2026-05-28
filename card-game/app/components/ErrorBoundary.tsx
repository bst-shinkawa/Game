"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidMount() {
    this._onError = (event: ErrorEvent) => {
      // 画像・スクリプト等のリソース読み込み失敗は window の error イベントに来るが、
      // これはアプリの致命的バグではないので Application Error 画面は出さない。
      // ErrorEvent の target が window 以外（HTMLElement）か、 event.error が無い場合がそれ。
      const t = event.target as EventTarget | null;
      const isResourceError = t && t !== window && (t as HTMLElement)?.tagName !== undefined;
      if (isResourceError) {
        // ログだけ残して握りつぶす
        console.warn("[ErrorBoundary] resource error ignored", (t as HTMLElement).tagName, (event as ErrorEvent & { filename?: string }).filename);
        return;
      }
      // 実 JS 例外がない（message のみ）場合も拾わない（"Script error." 系の CORS マスクなど）
      if (!event.error && !event.message) return;
      // "Script error." は CORS で詳細不明のクロスオリジン例外。安全側で無視する。
      if (event.message === "Script error." || event.message === "Script error") return;
      this.setState({ error: event.error ?? new Error(String(event.message)), errorInfo: null });
    };
    this._onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      // 既知の無害な reject はスルー（DOMException の AbortError, NotAllowedError 等）
      if (reason && typeof reason === "object") {
        const name = (reason as { name?: string }).name;
        if (name === "AbortError" || name === "NotAllowedError" || name === "NotSupportedError") {
          console.warn("[ErrorBoundary] benign rejection ignored", name);
          return;
        }
      }
      this.setState({ error: new Error(String(reason ?? "unhandledrejection")), errorInfo: null });
    };
    // capture: true でないとリソース系 error はバブリングせず捕まらない/逆に拾いすぎるため
    // ここでは bubble フェーズ（capture: false）で運用しつつ、上で target をチェックして除外する。
    window.addEventListener("error", this._onError);
    window.addEventListener("unhandledrejection", this._onUnhandledRejection);
  }

  componentWillUnmount() {
    window.removeEventListener("error", this._onError!);
    window.removeEventListener("unhandledrejection", this._onUnhandledRejection!);
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo });
    console.error("[ErrorBoundary] componentDidCatch", error, errorInfo);
  }

  private _onError?: (e: ErrorEvent) => void;
  private _onUnhandledRejection?: (e: PromiseRejectionEvent) => void;

  render() {
    const { error, errorInfo } = this.state;
    if (error) {
      return (
        <div style={{ position: "fixed", left: 0, top: 0, right: 0, bottom: 0, zIndex: 999999, background: "rgba(0,0,0,0.95)", color: "#fff", padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <h2>Application Error</h2>
          <div style={{ whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: 12 }}>
            {String(error.message)}
            {errorInfo ? "\n\n" + errorInfo.componentStack : null}
          </div>
          <div>
            <button onClick={() => window.location.reload()}>Reload</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
