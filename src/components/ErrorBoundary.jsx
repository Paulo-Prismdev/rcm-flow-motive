import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('App render crash:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-950 text-center">
          <div className="max-w-sm w-full">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <svg className="w-7 h-7 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
              </svg>
            </div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Something went wrong</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              The app hit an unexpected error. Try reloading — if it keeps happening, try clearing the app data.
            </p>
            <button
              onClick={this.handleReload}
              className="w-full h-11 px-4 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
            >
              Reload App
            </button>
            {this.state.error && (
              <pre className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-[11px] text-left text-red-600 dark:text-red-400 overflow-auto max-h-32 whitespace-pre-wrap break-all">
                {this.state.error?.message || String(this.state.error)}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}