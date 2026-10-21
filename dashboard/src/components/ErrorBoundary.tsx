import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Dashboard caught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 my-8 max-w-2xl mx-auto rounded-2xl bg-[#0F172A] border border-rose-500/30 shadow-2xl text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white font-mono">Component Render Error</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              An unexpected error occurred while rendering this view. The rest of the dashboard remains operational.
            </p>
          </div>
          {this.state.error && (
            <pre className="p-3 bg-black/50 border border-slate-800 rounded-lg text-left text-[11px] font-mono text-rose-300 overflow-x-auto max-h-36">
              {this.state.error.message}
            </pre>
          )}
          <div>
            <button
              onClick={this.handleReset}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-all inline-flex items-center space-x-2 shadow-lg shadow-indigo-600/20"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset & Retry View</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
