import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
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
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-6 my-4 w-full rounded-2xl bg-red-500/10 backdrop-blur-md border border-red-500/20 shadow-xl text-slate-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-red-500/20 text-red-600 rounded-xl">
              <AlertTriangle size={28} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-red-800">Đã xảy ra lỗi hiển thị</h3>
              <p className="text-xs text-red-600/80">Một phần của giao diện không thể tải được do lỗi xử lý dữ liệu.</p>
            </div>
          </div>
          
          <div className="w-full max-w-lg bg-slate-900/5 text-slate-800 p-4 rounded-xl text-left font-mono text-xs border border-slate-900/10 mb-4 overflow-auto max-h-40">
            <p className="font-bold text-red-700">Chi tiết lỗi: {this.state.error?.toString()}</p>
            {this.state.errorInfo && (
              <pre className="mt-2 text-[10px] text-slate-600 whitespace-pre-wrap leading-relaxed">
                {this.state.errorInfo.componentStack}
              </pre>
            )}
          </div>

          <button
            onClick={this.handleReload}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg shadow-red-200 text-sm active:scale-[0.98]"
          >
            <RefreshCw size={16} />
            Tải lại trang
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
