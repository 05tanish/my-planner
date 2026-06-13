import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
          <div className="w-full max-w-2xl bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-destructive">Application Render Error</h2>
            <p className="text-sm text-muted-foreground">The application encountered a critical rendering error. Please see details below:</p>
            <div className="bg-secondary/50 p-4 rounded-md text-xs font-mono overflow-auto max-h-60 border border-border">
              <p className="font-bold text-rose-400">{this.state.error?.toString()}</p>
              <pre className="mt-2 text-muted-foreground whitespace-pre-wrap">{this.state.errorInfo?.componentStack}</pre>
            </div>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = '/login';
              }}
              className="px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-md hover:bg-primary/90"
            >
              Reset Session & Log In Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
