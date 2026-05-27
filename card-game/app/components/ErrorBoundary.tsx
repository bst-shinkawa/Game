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
      this.setState({ error: event.error ?? new Error(String(event.message)), errorInfo: null });
    };
    this._onUnhandledRejection = (event: PromiseRejectionEvent) => {
      this.setState({ error: new Error(String(event.reason ?? "unhandledrejection")), errorInfo: null });
    };
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
