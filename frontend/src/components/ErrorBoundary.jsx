import { Component } from "react";

/**
 * A till that shows a white screen mid-queue is worse than a till that
 * shows an ugly message, so this catches a thrown render and says
 * something useful instead.
 *
 * The reassurance about the cart is the important part: state is
 * mirrored to localStorage on every change, and Firestore holds its own
 * copy, so reloading loses at most the line the cashier was adding.
 *
 * A class is not a stylistic choice here. React has no hook equivalent
 * for componentDidCatch, so an error boundary has to be one.
 */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[pos] render failed", error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex h-screen items-center justify-center bg-canvas p-6">
        <div className="w-full max-w-md rounded-card border border-line bg-surface p-6">
          <h1 className="text-base font-semibold text-ink">
            The register hit a problem
          </h1>
          <p className="mt-2 text-sm text-muted">
            Nothing has been lost. The open order and every sale already taken
            are saved on this device and in the cloud, so reloading picks up
            where this left off.
          </p>

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => window.location.reload()}
              className="h-12 flex-1 rounded-card bg-accent-solid text-sm font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Reload the register
            </button>
          </div>

          <details className="mt-4">
            <summary className="cursor-pointer text-xs text-muted">
              What went wrong
            </summary>
            <pre className="mt-2 max-h-40 overflow-auto rounded-card bg-surface-2 p-3 text-xs break-words whitespace-pre-wrap text-muted">
              {String(this.state.error?.stack ?? this.state.error)}
            </pre>
            <p className="mt-2 text-xs text-muted">
              Send this to whoever maintains the till.
            </p>
          </details>
        </div>
      </div>
    );
  }
}
