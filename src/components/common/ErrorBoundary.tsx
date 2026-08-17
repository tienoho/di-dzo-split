import React, { ReactNode } from 'react';
import { RefreshCw, AlertTriangle, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public props: Props;
  public state: State;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[Dzô! Split ErrorBoundary caught]:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetCache = () => {
    try {
      const keysToClean = ['nhau_temp_bill', 'nhau_fcm_vapid_key'];
      keysToClean.forEach(k => localStorage.removeItem(k));
    } catch (e) {
      console.error(e);
    }
    window.location.href = window.location.pathname;
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-amber-50 dark:bg-slate-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border-4 border-slate-900 dark:border-slate-100 rounded-3xl p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] text-center">
            <div className="w-16 h-16 bg-amber-400 border-3 border-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
              <AlertTriangle className="w-8 h-8 text-slate-900" />
            </div>

            <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">
              Đã có chút gián đoạn!
            </h1>
            
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-6">
              Ứng dụng đã tự động bảo vệ dữ liệu của bạn để không bị mất mát. Bạn hãy bấm tải lại trang để tiếp tục nhé!
            </p>

            {this.state.error && (
              <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl border-2 border-slate-900 text-left mb-6 overflow-hidden">
                <p className="text-xs font-mono text-rose-600 dark:text-rose-400 break-words line-clamp-3">
                  {this.state.error.message || 'Lỗi không xác định'}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={this.handleReload}
                className="w-full py-3.5 px-4 bg-amber-400 hover:bg-amber-300 text-slate-900 font-black rounded-xl border-3 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-5 h-5" />
                Tải lại ứng dụng ngay
              </button>

              <button
                onClick={this.handleResetCache}
                className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl border-2 border-slate-900 flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Home className="w-4 h-4" />
                Khôi phục về trang chủ
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
